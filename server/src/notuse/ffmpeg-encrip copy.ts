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

    console.log("🔐 ClearKey saved at:", filePath);
    return keyData;
  }

  async packageDASHWithClearKey(targetDir: string, clearkey: ClearKey) {
    const dashDir = path.join(targetDir, "dash");
    fs.mkdirSync(dashDir, { recursive: true });

    // Verify input files exist
    for (const res of this.resolutions) {
      const inputFile = path.join(
        this.outputBaseDir,
        res.name,
        `video_${res.name}.mp4`
      );
      if (!fs.existsSync(inputFile)) {
        throw new Error(`Input file not found: ${inputFile}`);
      }
    }

    const audioFile = path.join(this.outputBaseDir, "audio.mp4");
    if (!fs.existsSync(audioFile)) {
      throw new Error(`Audio file not found: ${audioFile}`);
    }

    // Build stream descriptors without drm_label
    const inputArgs = this.resolutions.map((res) => {
      const input = normalizePath(
        path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`)
      );
      const outDir = normalizePath(path.join(dashDir, res.name));
      fs.mkdirSync(outDir, { recursive: true });

      return `input=${input},stream=video,init_segment=${normalizePath(
        path.join(outDir, "init.mp4")
      )},segment_template=${normalizePath(
        path.join(outDir, "seg_$Number$.m4s")
      )}`;
    });

    // Audio input
    const audioDir = normalizePath(path.join(dashDir, "audio"));
    fs.mkdirSync(audioDir, { recursive: true });

    inputArgs.push(
      `input=${normalizePath(
        audioFile
      )},stream=audio,init_segment=${normalizePath(
        path.join(audioDir, "init.mp4")
      )},segment_template=${normalizePath(
        path.join(audioDir, "seg_$Number$.m4s")
      )}`
    );

    // Create key assignments
    const keys = [
      `--keys label=:key_id=${clearkey.key_id}:key=${clearkey.key}`,
    ];

    const args = [
      ...inputArgs,
      `--enable_raw_key_encryption`,
      ...keys,
      `--mpd_output ${normalizePath(path.join(dashDir, "manifest.mpd"))}`,
      `--generate_static_live_mpd`,
      `--segment_duration 6`,
    ];

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging DASH with ClearKey...");

    try {
      await execPromise(command);

      console.log("✅ DASH ClearKey packaging done.");
    } catch (error) {
      console.error("❌ Packaging failed with error:", error);
    }
  }

  async packageHLSWithClearKey(targetDir: string, clearkey: ClearKey) {
    const hlsDir = path.join(targetDir, "hls");
    fs.mkdirSync(hlsDir, { recursive: true });

    // Build stream descriptors without drm_label
    const inputArgs = this.resolutions.map((res) => {
      const input = normalizePath(
        path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`)
      );
      const outDir = normalizePath(path.join(hlsDir, res.name));
      fs.mkdirSync(outDir, { recursive: true });

      return `input=${input},stream=video,init_segment=${normalizePath(
        path.join(outDir, "init.mp4")
      )},segment_template=${normalizePath(
        path.join(outDir, "seg_$Number$.m4s")
      )},playlist_name=playlist.m3u8`;
    });

    // Audio input
    const audioDir = normalizePath(path.join(hlsDir, "audio"));
    fs.mkdirSync(audioDir, { recursive: true });

    inputArgs.push(
      `input=${normalizePath(
        path.join(this.outputBaseDir, "audio.mp4")
      )},stream=audio,init_segment=${normalizePath(
        path.join(audioDir, "init.mp4")
      )},segment_template=${normalizePath(
        path.join(audioDir, "seg_$Number$.m4s")
      )},playlist_name=audio.m3u8`
    );

    // Create key assignments
    const keys = [
      `--keys label=:key_id=${clearkey.key_id}:key=${clearkey.key}`,
    ];

    const args = [
      ...inputArgs,
      `--enable_raw_key_encryption`,
      ...keys,
      `--hls_master_playlist_output ${normalizePath(
        path.join(hlsDir, "master.m3u8")
      )}`,
      `--segment_duration 6`,
    ];

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging HLS with ClearKey...");

    try {
      await execPromise(command);
      console.log("✅ HLS ClearKey packaging done.");
    } catch (error) {
      console.error("❌ Packaging failed with error:", error);
    }
  }
}
