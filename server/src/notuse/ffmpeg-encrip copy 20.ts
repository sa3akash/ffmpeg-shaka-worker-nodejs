import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

interface ResolutionProfile {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  maxInputHeight?: number; // Maximum input height this profile should be used for
}

type SubtitleTrack = {
  path: string;
  lang: string;
};

type AudioTrack = {
  path: string;
  lang: string;
  name: string;
  isDefault?: boolean;
};

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

const normalizePath = (p: string) => p.replace(/\\/g, "/");

export class VideoTranscoder {
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

  constructor(private inputPath: string, private outputBaseDir: string) {}

  private async getVideoMetadata(): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.inputPath, (err, metadata) => {
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
      });
    });
  }

  private selectResolutions(): ResolutionProfile[] {
    if (!this.metadata) return [];

    const inputHeight = this.metadata.height;
    return this.RESOLUTION_PROFILES.filter(
      (profile) =>
        !profile.maxInputHeight || inputHeight <= profile.maxInputHeight
    );
  }

  public async init(): Promise<void> {
    this.metadata = await this.getVideoMetadata();
    this.selectedResolutions = this.selectResolutions();

    if (this.selectedResolutions.length === 0) {
      throw new Error("No suitable resolutions found for input video");
    }
  }

  public async transcode(): Promise<{
    videoPaths: string[];
    audioTracks: AudioTrack[];
    resolutions: ResolutionProfile[];
  }> {
    if (!this.metadata) await this.init();

    fs.mkdirSync(this.outputBaseDir, { recursive: true });

    // Create organized folder structure
    const videoBaseDir = path.join(this.outputBaseDir, "video");
    const audioBaseDir = path.join(this.outputBaseDir, "audio");
    fs.mkdirSync(videoBaseDir, { recursive: true });
    fs.mkdirSync(audioBaseDir, { recursive: true });

    const command = ffmpeg(this.inputPath);
    const videoPaths: string[] = [];
    const audioTracks: AudioTrack[] = [];

    // Process each selected resolution
    this.selectedResolutions.forEach((res) => {
      const resDir = path.join(videoBaseDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outPath = path.join(resDir, `video_${res.name}.mp4`);
      videoPaths.push(outPath);

      const output = command
        .output(outPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${res.width}x${res.height}`)
        .videoBitrate(res.bitrate)
        .outputOptions([
          "-preset fast",
          "-profile:v main",
          "-crf 20",
          "-movflags +faststart",
        ]);

      // Include all audio tracks in each video
      // this.metadata!.audioTracks.forEach((_, i) => {
      //   output.outputOptions([`-map 0:a:${i}`]);
      // });
    });

    // Process audio tracks
    this.metadata!.audioTracks.forEach((track, index) => {
      const lang = track.language || `audio${index}`;
      const isDefault = index === 0;
      const audioDir = path.join(audioBaseDir, lang);
      fs.mkdirSync(audioDir, { recursive: true });

      const audioPath = path.join(audioDir, `audio_${lang}.mp4`);

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
        isDefault,
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

    const key = crypto.randomBytes(16).toString("hex");
    const key_id = crypto.randomBytes(16).toString("hex");

    const keyData = { key_id, key };

    const filePath = path.join(targetDir, "clearkey.json");
    fs.writeFileSync(filePath, JSON.stringify(keyData, null, 2));

    console.log("🔐 ClearKey saved");
    return keyData;
  }

  private async packageCommon(
    outputDir: string,
    audioTracks: AudioTrack[],
    subtitles: SubtitleTrack[] = [],
    encryptionOptions: {
      enabled: boolean;
      clearkey?: ClearKey;
    } = { enabled: false }
  ) {
    fs.mkdirSync(outputDir, { recursive: true });
    const args = [];

    // Video streams
    const videoBaseDir = path.join(this.outputBaseDir, "video");
    this.selectedResolutions.forEach((res) => {
      const resDir = path.join(outputDir, "video", res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const input = normalizePath(
        path.join(videoBaseDir, res.name, `video_${res.name}.mp4`)
      );
      const segmentPath = normalizePath(path.join(resDir, "seg_$Number$.m4s"));

      args.push(
        `input=${input},stream=video,` +
          `init_segment=${normalizePath(path.join(resDir, "init.mp4"))},` +
          `segment_template=${segmentPath},` +
          `playlist_name=${normalizePath(
            path.join(resDir, "playlist.m3u8")
          )},` +
          `hls_group_id=video,` +
          `hls_name=${res.name.toUpperCase()}`
      );
    });

    // Audio streams
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
          `hls_group_id=audio,` +
          `hls_name=${audio.name.toUpperCase().replace(/\s+/g, "_")}` +
          (audio.isDefault ? `,default=yes` : "")
      );
    });

    // Subtitles
    subtitles.forEach((sub) => {
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

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging content...");

    try {
      await execPromise(command);
      console.log("✅ Packaging completed successfully");
    } catch (error) {
      console.error("❌ Packaging failed:", error);
      throw error;
    }
  }

  async packageUniversalWithClearKey(
    targetDir: string,
    clearkey: ClearKey,
    subtitles: SubtitleTrack[] = [],
    audioTracks: AudioTrack[] = []
  ) {
    await this.packageCommon(targetDir, audioTracks, subtitles, {
      enabled: true,
      clearkey,
    });
  }

  async packageWithoutEncryption(
    targetDir: string,
    subtitles: SubtitleTrack[] = [],
    audioTracks: AudioTrack[] = []
  ) {
    await this.packageCommon(targetDir, audioTracks, subtitles, {
      enabled: false,
    });
  }
}

/*
  async packageUniversalNoEncription(targetDir: string) {
    const outputDir = path.join(targetDir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Configuration for long videos
    const segmentDuration = 6; // seconds per segment
    const hlsPlaylistType = "vod"; // or 'event' for live streams

    // Common arguments for both versions
    const baseArgs = [];

    // Add video streams with resolution-based folders
    this.resolutions.forEach((res) => {
      const resDir = res.name;
      fs.mkdirSync(path.join(outputDir, resDir), { recursive: true });

      const input = normalizePath(
        path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`)
      );

      baseArgs.push(
        `input=${input},stream=video,` +
          `init_segment=${resDir}/init.mp4,` +
          `segment_template=${resDir}/seg_$Number$.m4s,` +
          `playlist_name=${resDir}/playlist.m3u8,` +
          `hls_group_id=video,` +
          `hls_name=${res.name.toUpperCase()}`
      );
    });

    // Add audio stream
    const audioDir = "audio";
    fs.mkdirSync(path.join(outputDir, audioDir), { recursive: true });

    const audioInput = normalizePath(
      path.join(this.outputBaseDir, "audio.mp4")
    );
    baseArgs.push(
      `input=${audioInput},stream=audio,` +
        `init_segment=${audioDir}/init.mp4,` +
        `segment_template=${audioDir}/seg_$Number$.m4s,` +
        `playlist_name=${audioDir}/playlist.m3u8,` +
        `hls_group_id=audio,` +
        `hls_name=AUDIO`
    );

    // Generate unencrypted version
    const unencryptedArgs = [
      ...baseArgs,
      `--mpd_output manifest.mpd`,
      `--hls_master_playlist_output master.m3u8`,
      `--generate_static_live_mpd`,
      `--segment_duration ${segmentDuration}`,
      `--hls_playlist_type ${hlsPlaylistType}`,
      `--fragment_duration ${segmentDuration}`,
      `--segment_sap_aligned`,
      `--min_buffer_time ${segmentDuration * 2}`,
      `--minimum_update_period ${segmentDuration}`,
    ];

    console.log("📦 Packaging unencrypted version...");
    await execPromise(`packager ${unencryptedArgs.join(" ")}`, {
      cwd: outputDir,
    });

    console.log("✅ Successfully packaged video with proper segmentation");
  }

  */
