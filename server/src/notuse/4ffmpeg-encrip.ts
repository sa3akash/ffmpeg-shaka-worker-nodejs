import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import crypto from "crypto";
import { EventEmitter } from "events";

const execPromise = util.promisify(exec);

interface ResolutionProfile {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  maxInputHeight?: number;
}

interface SubtitleTrack {
  path: string;
  lang: string;
  name: string;
}

interface AudioTrack {
  path: string;
  lang: string;
  name: string;
  isDefault?: boolean;
}

interface ClearKey {
  key_id: string;
  key: string;
}

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  audioTracks: Array<{
    index: number;
    language?: string;
    codec: string;
    channels: number;
    sample_rate: number;
  }>;
}

interface TranscoderOptions {
  maxConcurrentProcesses?: number;
  subtitleDirectory?: string;
  tempDirectory?: string;
}

const normalizePath = (p: string) => p.replace(/\\/g, "/");

class ResourceManager {
  private activeProcesses: Set<FfmpegCommand> = new Set();
  private activePromises: Set<Promise<any>> = new Set();

  trackProcess(process: FfmpegCommand): FfmpegCommand {
    this.activeProcesses.add(process);
    process.once("end", () => this.activeProcesses.delete(process));
    process.once("error", () => this.activeProcesses.delete(process));
    return process;
  }

  trackPromise<T>(promise: Promise<T>): Promise<T> {
    this.activePromises.add(promise);
    promise.finally(() => this.activePromises.delete(promise));
    return promise;
  }

  async cleanup() {
    this.activeProcesses.forEach((proc) => {
      try {
        proc.kill("SIGKILL");
      } catch (err) {
        console.error("Error killing process:", err);
      }
    });
    this.activeProcesses.clear();
    await Promise.allSettled(Array.from(this.activePromises));
    this.activePromises.clear();
  }
}

export class VideoTranscoder extends EventEmitter {
  private RESOLUTION_PROFILES: ResolutionProfile[] = [
    {
      name: "240p",
      width: 426,
      height: 240,
      bitrate: "500k",
      maxInputHeight: 480,
    },
    {
      name: "360p",
      width: 640,
      height: 360,
      bitrate: "800k",
      maxInputHeight: 720,
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      bitrate: "1200k",
      maxInputHeight: 1080,
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      bitrate: "2500k",
      maxInputHeight: 1440,
    },
    {
      name: "1080p",
      width: 1920,
      height: 1080,
      bitrate: "5000k",
      maxInputHeight: 2160,
    },
    {
      name: "2K",
      width: 2560,
      height: 1440,
      bitrate: "15000k",
      maxInputHeight: 2880,
    },
    { name: "4K", width: 3840, height: 2160, bitrate: "40000k" },
  ];

  private selectedResolutions: ResolutionProfile[] = [];
  private metadata: VideoMetadata | null = null;
  private resourceManager = new ResourceManager();
  private options: TranscoderOptions;
  private processCount = 0;

  constructor(
    private inputPath: string,
    private tempDir: string,
    options: TranscoderOptions = {}
  ) {
    super();
    this.options = {
      maxConcurrentProcesses: 4,
      subtitleDirectory: path.join(process.cwd(), "subtitles"),
      tempDirectory: path.join(process.cwd(), "temp"),
      ...options,
    };

    process.on("exit", this.cleanup.bind(this));
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      this.cleanup().finally(() => process.exit(1));
    });
  }

  private async getVideoMetadata(): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(
        this.inputPath,
        (err: Error, metadata: ffmpeg.FfprobeData) => {
          if (err) return reject(err);

          const videoStream = metadata.streams.find(
            (s) => s.codec_type === "video"
          );
          if (!videoStream) {
            return reject(new Error("No video stream found"));
          }

          const audioTracks = metadata.streams
            .filter((stream) => stream.codec_type === "audio")
            .map((stream, index) => ({
              index,
              language: stream.tags?.language,
              codec: stream.codec_name as string,
              channels: stream.channels as number,
              sample_rate: stream.sample_rate as number,
            }));

          resolve({
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            duration: parseFloat(videoStream.duration || "0"),
            audioTracks,
          });
        }
      );
    });
  }

  private selectResolutions(): ResolutionProfile[] {
    if (!this.metadata) return [];
    const inputHeight = this.metadata.width;
    return this.RESOLUTION_PROFILES.filter((res) => inputHeight >= res.width);
  }

  public async init(): Promise<void> {
    if (this.metadata) return;
    this.metadata = await this.resourceManager.trackPromise(
      this.getVideoMetadata()
    );
    this.selectedResolutions = this.selectResolutions();
    if (this.selectedResolutions.length === 0) {
      throw new Error("No suitable resolutions found for input video");
    }
  }

  private async executeCommand(command: string, cwd?: string): Promise<void> {
    if (this.processCount >= (this.options.maxConcurrentProcesses || 4)) {
      await new Promise((resolve) => this.once("process-complete", resolve));
    }

    this.processCount++;
    try {
      const { stdout, stderr } = await execPromise(command, { cwd });
      this.emit("log", stdout);
      if (stderr) this.emit("warn", stderr);
    } finally {
      this.processCount--;
      this.emit("process-complete");
    }
  }

  public async transcode(): Promise<{
    videoPaths: string[];
    audioTracks: AudioTrack[];
    resolutions: ResolutionProfile[];
  }> {
    if (!this.metadata) await this.init();

    fs.mkdirSync(this.tempDir, { recursive: true });

    const videoBaseDir = path.join(this.tempDir, "video");
    const audioBaseDir = path.join(this.tempDir, "audio");
    fs.mkdirSync(videoBaseDir, { recursive: true });
    fs.mkdirSync(audioBaseDir, { recursive: true });

    const command = this.resourceManager.trackProcess(ffmpeg(this.inputPath));
    const videoPaths: string[] = [];
    const audioTracks: AudioTrack[] = [];

    this.selectedResolutions.forEach((res) => {
      const resDir = path.join(videoBaseDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outPath = path.join(resDir, `video_${res.name}.mp4`);
      videoPaths.push(outPath);

      command
        .output(outPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${res.width}x${res.height}`)
        .videoBitrate(res.bitrate)
        .outputOptions([
          "-threads 2",
          "-preset fast",
          "-profile:v main",
          "-crf 23",
          "-movflags +faststart",
          // ...this.metadata!.audioTracks.map((_, i) => `-map 0:a:${i}`),
        ]);
    });

    this.metadata!.audioTracks.forEach((track, index) => {
      const lang = track.language || `audio${index}`;
      const audioPath = path.join(audioBaseDir, `audio_${lang}.mp4`);

      command
        .output(audioPath)
        .noVideo()
        .audioCodec("aac")
        .audioBitrate("128k")
        .outputOptions([
          `-map 0:a:${index}`,
          ...(track.language
            ? [`-metadata:s:a:0 language=${track.language}`]
            : []),
        ]);

      audioTracks.push({
        lang,
        path: audioPath,
        name: track.language
          ? `${track.language} Audio`
          : `Audio Track ${index + 1}`,
        isDefault: index === 0,
      });
    });

    await new Promise<void>((resolve, reject) => {
      command
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    return { videoPaths, audioTracks, resolutions: this.selectedResolutions };
  }

  async generateClearKey(targetDir: string): Promise<ClearKey> {
    fs.mkdirSync(targetDir, { recursive: true });
    const keyData = {
      key_id: crypto.randomBytes(16).toString("hex"),
      key: crypto.randomBytes(16).toString("hex"),
    };
    fs.writeFileSync(
      path.join(targetDir, "clearkey.json"),
      JSON.stringify(keyData, null, 2)
    );
    return keyData;
  }

  private async findSubtitles(): Promise<SubtitleTrack[]> {
    if (!fs.existsSync(this.options.subtitleDirectory!)) return [];

    const files = await fs.promises.readdir(this.options.subtitleDirectory!);
    const languageMap: Record<string, string> = {
      en: "English",
      bn: "Bangla",
      ur: "Urdu",
      // Add more languages as needed
    };

    return files
      .filter((file) => file.endsWith(".vtt"))
      .map((file) => {
        const lang = file.split(".")[0].toLowerCase();
        return {
          path: path.join(this.options.subtitleDirectory!, file),
          lang,
          name: lang || lang.toUpperCase(),
        };
      });
  }

  private async packageCommon(
    outputDir: string,
    audioTracks: AudioTrack[],
    subtitles: SubtitleTrack[] | "auto" = "auto",
    encryptionOptions: {
      enabled: boolean;
      clearkey?: ClearKey;
    } = { enabled: false }
  ) {
    fs.mkdirSync(outputDir, { recursive: true });
    const finalSubtitles =
      subtitles === "auto" ? await this.findSubtitles() : subtitles;

    const args = [];

    // Video streams
    const videoBaseDir = path.join(this.tempDir, "video");
    this.selectedResolutions.forEach((res) => {
      const resDir = path.join(outputDir, "video", res.name);
      fs.mkdirSync(resDir, { recursive: true });

      args.push(
        `input=${normalizePath(
          path.join(videoBaseDir, res.name, `video_${res.name}.mp4`)
        )},` +
          `stream=video,init_segment=${normalizePath(
            path.join(resDir, "init.mp4")
          )},` +
          `segment_template=${normalizePath(
            path.join(resDir, "seg_$Number$.m4s")
          )},` +
          `playlist_name=${normalizePath(
            path.join(resDir, "playlist.m3u8")
          )},` +
          `hls_group_id=video,hls_name=${res.name.toUpperCase()}`
      );
    });

    // Audio streams
    const audioBaseDir = path.join(this.tempDir, "audio");
    audioTracks.forEach((audio) => {
      const audioDir = path.join(outputDir, "audio", audio.lang);
      fs.mkdirSync(audioDir, { recursive: true });

      args.push(
        `input=${normalizePath(audio.path)},stream=audio,language=${
          audio.lang
        },` +
          `init_segment=${normalizePath(path.join(audioDir, "init.mp4"))},` +
          `segment_template=${normalizePath(
            path.join(audioDir, "seg_$Number$.m4s")
          )},` +
          `playlist_name=${normalizePath(
            path.join(audioDir, "playlist.m3u8")
          )},` +
          `hls_group_id=audio,hls_name=${audio.name
            .toUpperCase()
            .replace(/\s+/g, "_")}` +
          (audio.isDefault ? `,default=yes` : "")
      );
    });

    // Subtitles (directly reference source files)
    finalSubtitles.forEach((sub) => {
      const subDir = path.join(outputDir, "subtitles", sub.lang);
      fs.mkdirSync(subDir, { recursive: true });

      args.push(
        `input=${normalizePath(sub.path)},stream=text,language=${
          sub.lang
        },format=webvtt,` +
          `segment_template=${normalizePath(
            path.join(subDir, "sub_$Number$.vtt")
          )},` +
          `playlist_name=${normalizePath(path.join(subDir, "playlist.m3u8"))}`
      );
    });

    // Encryption
    if (encryptionOptions.enabled && encryptionOptions.clearkey) {
      args.push(
        `--enable_raw_key_encryption`,
        `--keys label=:key_id=${encryptionOptions.clearkey.key_id}:key=${encryptionOptions.clearkey.key}`
      );
    }

    // Common options
    args.push(
      `--mpd_output ${normalizePath(path.join(outputDir, "manifest.mpd"))}`,
      `--hls_master_playlist_output ${normalizePath(
        path.join(outputDir, "master.m3u8")
      )}`,
      `--generate_static_live_mpd`,
      `--segment_duration 6`,
      `--hls_playlist_type vod`,
      `--default_audio_language ${
        audioTracks.find((t) => t.isDefault)?.lang || "und"
      }`
    );

    await this.executeCommand(`packager ${args.join(" ")}`);
  }

  async packageUniversalWithClearKey(
    targetDir: string,
    clearkey: ClearKey,
    audioTracks: AudioTrack[] = [],
    subtitles: SubtitleTrack[] | "auto" = "auto"
  ) {
    await this.packageCommon(targetDir, audioTracks, subtitles, {
      enabled: true,
      clearkey,
    });
  }

  async packageWithoutEncryption(
    targetDir: string,
    audioTracks: AudioTrack[] = [],
    subtitles: SubtitleTrack[] | "auto" = "auto"
  ) {
    await this.packageCommon(targetDir, audioTracks, subtitles, {
      enabled: false,
    });
  }

  async cleanup(): Promise<void> {
    await this.resourceManager.cleanup();
  }

  async uploadToS3(outputDir: string) {
    // Implement your S3 upload logic here
    // This would upload only the packaged files (manifest.mpd, master.m3u8, segments)
    // and skip the intermediate files
  }
}
