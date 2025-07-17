import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";
import os from "os";

interface ResolutionProfile {
  name: string;
  width: number;
  height: number;
  bitrate: string;
}

interface TranscodeResult {
  videoPath: string;
  audioPath: string;
  resolution: ResolutionProfile;
}

interface PackagingOptions {
  segmentDuration?: number;
  clearLead?: number;
  enableLowLatency?: boolean;
  encryption?: boolean;
  outputFormats?: ("hls" | "dash")[];
}

export const DEFAULT_RESOLUTIONS: ResolutionProfile[] = [
  {
    name: "360p",
    width: 640,
    height: 360,
    bitrate: "800k",
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    bitrate: "2000k",
  },
];

export class VideoDRMPackager {
  private readonly clearkey: { keyId: string; key: string };
  private readonly tempDir: string;

  constructor() {
    this.clearkey = {
      keyId: crypto.randomBytes(16).toString("hex"),
      key: crypto.randomBytes(16).toString("hex"),
    };
    this.tempDir = path.join(os.tmpdir(), `drm-packager-${Date.now()}`);
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/\/+$/, "");
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn("⚠️ Cleanup error:", err);
    }
  }
  
public async transcode(
  inputPath: string,
  outputDir: string,
  resolutions: ResolutionProfile[] = DEFAULT_RESOLUTIONS
): Promise<TranscodeResult[]> {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(this.tempDir, { recursive: true });

  const filterChains: string[] = [];
  const results: TranscodeResult[] = [];

  const audioOut = path.join(this.tempDir, "audio.mp4");

  for (const [index, res] of resolutions.entries()) {
    const resDir = path.join(outputDir, res.name);
    await fs.mkdir(resDir, { recursive: true });

    const videoOut = path.join(resDir, `video_${res.name}.mp4`);
    filterChains.push(`[0:v]scale=w=${res.width}:h=${res.height}[v${index}]`);

    results.push({
      videoPath: videoOut,
      audioPath: audioOut,
      resolution: res,
    });
  }

  const filterComplex = filterChains.join(";");

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath).complexFilter(filterComplex);

    for (const [index, res] of resolutions.entries()) {
      const resDir = path.join(outputDir, res.name);
      const videoOut = path.join(resDir, `video_${res.name}.mp4`);
      command
        .output(videoOut)
        .outputOptions([
          `-map [v${index}]`,
          "-c:v libx264",
          `-b:v ${res.bitrate}`,
          "-preset fast",
          "-crf 20",
          "-movflags +faststart",
        ]);
    }

    command
      .output(audioOut)
      .outputOptions([
        "-map a:0",
        "-c:a aac",
        "-b:a 128k",
        "-ac 2",
        "-movflags +faststart",
      ]);

    command
      .on("end", () => {
        console.log("✅ All video resolutions and audio transcoded in one FFmpeg call");
        resolve(results);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
        reject(err);
      });

    command.run();
  });
}


  public async package(
    outputBaseDir: string,
    transcodeResults: TranscodeResult[],
    options: PackagingOptions = {}
  ): Promise<void> {
    const {
      segmentDuration = 6,
      clearLead = 0,
      enableLowLatency = false,
      encryption = true,
      outputFormats = ["hls", "dash"],
    } = options;

    const tasks: Promise<void>[] = [];

    if (outputFormats.includes("hls")) {
      tasks.push(
        this.packageFormat(outputBaseDir, transcodeResults, "hls", {
          segmentDuration,
          clearLead,
          enableLowLatency,
          encryption,
        })
      );
    }

    if (outputFormats.includes("dash")) {
      tasks.push(
        this.packageFormat(outputBaseDir, transcodeResults, "dash", {
          segmentDuration,
          clearLead,
          enableLowLatency,
          encryption,
        })
      );
    }

    await Promise.all(tasks);
    await this.cleanup();
  }

  private async packageFormat(
    outputBaseDir: string,
    transcodeResults: TranscodeResult[],
    format: "hls" | "dash",
    options: {
      segmentDuration: number;
      clearLead: number;
      enableLowLatency: boolean;
      encryption: boolean;
    }
  ): Promise<void> {
    const outputDir = path.join(outputBaseDir, format);
    await fs.mkdir(outputDir, { recursive: true });

    const args = await this.buildPackagerArgs(
      outputDir,
      transcodeResults,
      format,
      options
    );

    await this.runPackager(args);
    console.log(`✅ ${format.toUpperCase()} packaging complete`);
  }

  private async buildPackagerArgs(
    outputDir: string,
    transcodeResults: TranscodeResult[],
    format: "hls" | "dash",
    options: {
      segmentDuration: number;
      clearLead: number;
      enableLowLatency: boolean;
      encryption: boolean;
    }
  ): Promise<string[]> {
    const args: string[] = [];

    // Add audio stream
    const audioInput = this.normalizePath(transcodeResults[0].audioPath);
    const audioOutputDir = this.normalizePath(path.join(outputDir, "audio"));
    await fs.mkdir(audioOutputDir, { recursive: true });

    args.push(
      `input=${audioInput},stream=audio,init_segment=${audioOutputDir}/init.mp4,` +
        `segment_template=${audioOutputDir}/seg_$Number$.m4s,` +
        `playlist_name=audio.m3u8,hls_group_id=audio,hls_name=ENGLISH`
    );

    // Add video streams
    for (const result of transcodeResults) {
      const videoInput = this.normalizePath(result.videoPath);
      const videoOutputDir = this.normalizePath(
        path.join(outputDir, result.resolution.name)
      );
      await fs.mkdir(videoOutputDir, { recursive: true });

      args.push(
        `input=${videoInput},stream=video,init_segment=${videoOutputDir}/init.mp4,` +
          `segment_template=${videoOutputDir}/seg_$Number$.m4s,` +
          `playlist_name=playlist.m3u8,iframe_playlist_name=iframe.m3u8,` +
          `bandwidth=${parseInt(result.resolution.bitrate) * 1000}`
      );
    }

    // Common options
    args.push(
      "--segment_duration",
      options.segmentDuration.toString(),
      "--clear_lead",
      options.clearLead.toString()
    );

    // Encryption options
    if (options.encryption) {
      args.push(
        "--enable_raw_key_encryption",
        "--keys",
        `key_id=${this.clearkey.keyId}:key=${this.clearkey.key}`
      );
    }

    // Format-specific options
    if (format === "hls") {
      args.push(
        "--hls_master_playlist_output",
        this.normalizePath(path.join(outputDir, "master.m3u8"))
      );

      if (options.enableLowLatency) {
        args.push("--hls_playlist_type", "VOD");
      }
    } else {
      args.push(
        "--mpd_output",
        this.normalizePath(path.join(outputDir, "manifest.mpd")),
        "--generate_static_live_mpd"
      );

      if (options.enableLowLatency) {
        args.push(
          "--low_latency_dash_mode",
          "--utc_timings",
          "urn:mpeg:dash:utc:http-xsdate:2014", // Required for low latency
          "--time_shift_buffer_depth",
          "60", // Recommended for low latency
          "--preserved_segments_outside_live_window",
          "10" // Recommended for low latency
        );
      }
    }

    return args;
  }

  private async runPackager(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn("packager", args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error("Packager error output:", stderr);
          reject(new Error(`Packager failed with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to start packager: ${err.message}`));
      });
    });
  }

  public getKeyInfo(): { keyId: string; key: string } {
    return { ...this.clearkey };
  }

  public async generateLicenseFile(outputDir: string): Promise<string> {
    const license = {
      keys: [
        {
          kty: "oct",
          kid: this.clearkey.keyId, // hex
          k: this.clearkey.key, // hex
          kid_b64: Buffer.from(this.clearkey.keyId, "hex").toString("base64"), // optional
          k_b64: Buffer.from(this.clearkey.key, "hex").toString("base64"),
        },
      ],
      type: "temporary",
    };

    const licensePath = path.join(outputDir, "license.json");
    await fs.writeFile(licensePath, JSON.stringify(license, null, 2));
    return licensePath;
  }
}
