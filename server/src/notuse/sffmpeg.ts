import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

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

export class VideoTranscoder {
  private resolutions: Resolution[] = [
    { name: "360p", width: 640, height: 360, bitrate: "800k" },
    { name: "720p", width: 1280, height: 720, bitrate: "2000k" },
  ];

  constructor(
    private inputPath: string,
    private outputBaseDir: string
  ) {}

  async transcode(): Promise<void> {
    fs.mkdirSync(this.outputBaseDir, { recursive: true });

    const command = ffmpeg(this.inputPath);

    // Create output streams for all resolutions
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

    // Extract audio only once
    const audioPath = path.join(this.outputBaseDir, "audio.mp4");
    command
      .output(audioPath)
      .noVideo()
      .audioCodec("aac")
      .audioBitrate("128k");

    return new Promise((resolve, reject) => {
      command
        .on("end", () => {
          console.log("✅ Transcoding completed.");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg error:", err);
          reject(err);
        })
        .run();
    });
  }

  async packageHLS(targetDir: string) {
    const hlsDir = path.join(targetDir, "hls");
    fs.mkdirSync(hlsDir, { recursive: true });

    const inputArgs = this.resolutions.map((res) => {
      const input = path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`);
      const outDir = path.join(hlsDir, res.name);
      fs.mkdirSync(outDir, { recursive: true });

      return `input=${input},stream=video,init_segment=${path.join(outDir, "init.mp4")},segment_template=${path.join(outDir, "seg_$Number$.m4s")},playlist_name=playlist.m3u8`;
    });

    // Add audio input
    const audioDir = path.join(hlsDir, "audio");
    fs.mkdirSync(audioDir, { recursive: true });
    inputArgs.push(`input=${path.join(this.outputBaseDir, "audio.mp4")},stream=audio,init_segment=${path.join(audioDir, "init.mp4")},segment_template=${path.join(audioDir, "seg_$Number$.m4s")},playlist_name=audio.m3u8`);

    const args = [
      ...inputArgs,
      `--hls_master_playlist_output ${path.join(hlsDir, "master.m3u8")}`,
      `--segment_duration 6`,
    ];

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging HLS...");
    await execPromise(command);
    console.log("✅ HLS Packaging done.");
  }

  async packageDASH(targetDir: string) {
    const dashDir = path.join(targetDir, "dash");
    fs.mkdirSync(dashDir, { recursive: true });

    const inputArgs = this.resolutions.map((res) => {
      const input = path.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`);
      const outDir = path.join(dashDir, res.name);
      fs.mkdirSync(outDir, { recursive: true });

      return `input=${input},stream=video,init_segment=${path.join(outDir, "init.mp4")},segment_template=${path.join(outDir, "seg_$Number$.m4s")}`;
    });

    // Add audio input
    const audioDir = path.join(dashDir, "audio");
    fs.mkdirSync(audioDir, { recursive: true });
    inputArgs.push(`input=${path.join(this.outputBaseDir, "audio.mp4")},stream=audio,init_segment=${path.join(audioDir, "init.mp4")},segment_template=${path.join(audioDir, "seg_$Number$.m4s")}`);

    const args = [
      ...inputArgs,
      `--mpd_output ${path.join(dashDir, "manifest.mpd")}`,
      `--segment_duration 6`,
      `--generate_static_live_mpd`,
    ];

    const command = `packager ${args.join(" ")}`;
    console.log("📦 Packaging DASH...");
    await execPromise(command);
    console.log("✅ DASH Packaging done.");
  }
}
