import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import crypto from "crypto";

const execPromise = util.promisify(exec);

interface Resolution {
  name: string;
  width: number;
  height: number;
  bitrate: string;
}

type SubtitleTrack = {
  path: string; // absolute or relative path to .vtt
  lang: string; // ISO 639-1 language code, e.g., 'en', 'es'
};

type AudioTrack = {
  path: string;
  lang: string; // e.g., "en", "es", "fr"
};

interface ClearKey {
  key_id: string;
  key: string;
}
const normalizePath = (p: string) => p.replace(/\\/g, "/");

export class VideoTranscoder {
  private resolutions: Resolution[] = [
    { name: "360p", width: 640, height: 360, bitrate: "800k" },
    { name: "720p", width: 1280, height: 720, bitrate: "2000k" },
  ];

  constructor(private inputPath: string, private outputBaseDir: string) {}

  async transcode(): Promise<void> {
    fs.mkdirSync(this.outputBaseDir, { recursive: true });

    const command = ffmpeg(this.inputPath);

    this.resolutions.forEach((res) => {
      const resDir = path.join(this.outputBaseDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outPath = path.join(resDir, `video_${res.name}.mp4`);
      command
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
    });

    // Extract audio once
    const audioPath = path.join(this.outputBaseDir, "audio.mp4");
    command.output(audioPath).noVideo().audioCodec("aac").audioBitrate("128k");

    return new Promise((resolve, reject) => {
      command
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
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

  async packageUniversalWithClearKey(
    targetDir: string,
    clearkey: ClearKey,
    subtitles: SubtitleTrack[] = [],
    audioTracks: AudioTrack[] = []
  ) {
    const outputDir = path.join(targetDir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Build arguments for packaging
    const args = [];

    // Add video streams with resolution-based folders
    this.resolutions.forEach((res) => {
      const resDir = path.join(outputDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const input = normalizePath(
        path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`)
      );
      const segmentPath = normalizePath(path.join(resDir, "seg_$Number$.m4s"));

      args.push(
        `input=${input},stream=video,` +
          `init_segment=${normalizePath(path.join(resDir, "init.mp4"))},` +
          `segment_template=${segmentPath},` +
          `playlist_name=${normalizePath(path.join(resDir, "playlist.m3u8"))}`
      );
    });

    // Add audio stream
    const audioDir = path.join(outputDir, "audio");
    fs.mkdirSync(audioDir, { recursive: true });

    const audioInput = normalizePath(
      path.join(this.outputBaseDir, "audio.mp4")
    );
    args.push(
      `input=${audioInput},stream=audio,` +
        `init_segment=${normalizePath(path.join(audioDir, "init.mp4"))},` +
        `segment_template=${normalizePath(
          path.join(audioDir, "seg_$Number$.m4s")
        )},` +
        `playlist_name=${normalizePath(path.join(audioDir, "playlist.m3u8"))}`
    );

    // Add multiple audio tracks
    audioTracks.forEach((audio) => {
      const audioDir = path.join(outputDir, "audio", audio.lang);
      fs.mkdirSync(audioDir, { recursive: true });
      const audioInput = normalizePath(audio.path);
      args.push(
        `input=${audioInput},stream=audio,language=${audio.lang},` +
          `init_segment=${normalizePath(path.join(audioDir, "init.mp4"))},` +
          `segment_template=${normalizePath(
            path.join(audioDir, "seg_$Number$.m4s")
          )},` +
          `playlist_name=${normalizePath(
            path.join(audioDir, "playlist.m3u8")
          )}` +
          `hls_group_id=audio,` +
          `hls_name=AUDIO`
      );
    });

    // Add subtitle tracks if any
    subtitles.forEach((sub, index) => {
      const lang = sub.lang || `lang${index}`;

      const subDir = path.join(outputDir, "subtitles", lang);
      fs.mkdirSync(subDir, { recursive: true });

      const subInput = normalizePath(sub.path);
      args.push(
        `input=${subInput},stream=text,language=${lang},format=webvtt,` +
          `segment_template=${normalizePath(
            path.join(subDir, "sub_$Number$.vtt")
          )},` +
          `playlist_name=${normalizePath(path.join(subDir, "playlist.m3u8"))}`
      );
    });

    // Add encryption and output options
    args.push(
      `--enable_raw_key_encryption`,
      `--keys label=:key_id=${clearkey.key_id}:key=${clearkey.key}`,
      `--mpd_output ${normalizePath(path.join(outputDir, "manifest.mpd"))}`,
      `--hls_master_playlist_output ${normalizePath(
        path.join(outputDir, "master.m3u8")
      )}`,
      `--generate_static_live_mpd`,
      `--segment_duration 6`
    );

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging universal DASH & HLS with resolution folders...");

    try {
      await execPromise(command);
      console.log("✅ Successfully created:");
      console.log(`- DASH: "manifest.mpd" generated`);
      console.log(`- HLS: "master.m3u8" generated`);
    } catch (error) {
      console.error("❌ Packaging failed:", error);
      throw error;
    }
  }

  async packageWithoutEncryption(
    targetDir: string,
    subtitles: SubtitleTrack[] = [],
    audioTracks: AudioTrack[] = []
  ) {
    const outputDir = path.join(targetDir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Video segmentation configuration
    const segmentDuration = 6; // 6-second segments
    const hlsPlaylistType = "vod"; // VOD = Video on Demand

    const args = [];

    // Add video streams for each resolution
    this.resolutions.forEach((res) => {
      const resDir = res.name;
      fs.mkdirSync(path.join(outputDir, resDir), { recursive: true });

      const input = normalizePath(
        path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`)
      );

      args.push(
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

    args.push(
      `input=${normalizePath(
        path.join(this.outputBaseDir, "audio.mp4")
      )},stream=audio,` +
        `init_segment=${audioDir}/init.mp4,` +
        `segment_template=${audioDir}/seg_$Number$.m4s,` +
        `playlist_name=${audioDir}/playlist.m3u8,` +
        `hls_group_id=audio,` +
        `hls_name=AUDIO`
    );

    // Add multiple audio tracks
    audioTracks.forEach((audio) => {
      const audioDir = path.join(outputDir, "audio", audio.lang);
      fs.mkdirSync(audioDir, { recursive: true });
      const audioInput = normalizePath(audio.path);
      args.push(
        `input=${audioInput},stream=audio,language=${audio.lang},` +
          `init_segment=${normalizePath(path.join(audioDir, "init.mp4"))},` +
          `segment_template=${normalizePath(
            path.join(audioDir, "seg_$Number$.m4s")
          )},` +
          `playlist_name=${normalizePath(
            path.join(audioDir, "playlist.m3u8")
          )}` +
          `hls_group_id=audio,` +
          `hls_name=AUDIO`
      );
    });

    // Add subtitle tracks if any
    subtitles.forEach((sub, index) => {
      const lang = sub.lang || `lang${index}`;

      const subDir = path.join(outputDir, "subtitles", lang);
      fs.mkdirSync(subDir, { recursive: true });

      const subInput = normalizePath(sub.path);
      args.push(
        `input=${subInput},stream=text,language=${lang},format=webvtt,` +
          `segment_template=${normalizePath(
            path.join(subDir, "sub_$Number$.vtt")
          )},` +
          `playlist_name=${normalizePath(path.join(subDir, "playlist.m3u8"))}`
      );
    });

    // Output configuration
    args.push(
      `--mpd_output manifest.mpd`,
      `--hls_master_playlist_output master.m3u8`,
      `--generate_static_live_mpd`,
      `--segment_duration ${segmentDuration}`,
      `--hls_playlist_type ${hlsPlaylistType}`,
      `--fragment_duration ${segmentDuration}`,
      `--segment_sap_aligned`,
      `--min_buffer_time ${segmentDuration * 2}`,
      `--minimum_update_period ${segmentDuration}`
    );

    console.log("📦 Packaging unencrypted version...");
    await execPromise(`packager ${args.join(" ")}`, {
      cwd: outputDir,
    });

    console.log("✅ Unencrypted packaging complete");
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
}
