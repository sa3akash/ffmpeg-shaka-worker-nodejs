import fs from "fs";
import crypto from "crypto";
import path from "path";
import { AudioTrack, ResolutionProfile, SubtitleTrack } from "./utils";
import { spawn } from "child_process";

interface ClearKey {
  key_id: string;
  key: string;
}

const normalizePath = (p: string) => p.replace(/\\/g, "/");

export class ShakaPackager {
  constructor(
    private tempDir: string,
    private selectedResolutions: ResolutionProfile[],
    private audioTracks: AudioTrack[] = [],
    private subtitles: SubtitleTrack[] = []
  ) {}

  private async generateClearKey(targetDir: string): Promise<ClearKey> {
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

  private async packageCommon(
    outputDir: string,
    encryptionOptions: {
      enabled: boolean;
      clearkey?: ClearKey;
    } = { enabled: false }
  ) {
    fs.mkdirSync(outputDir, { recursive: true });

    const args: string[] = [];

    // Video streams
    const videoBaseDir = path.join(this.tempDir);
    this.selectedResolutions.forEach((res) => {
      const resDir = path.join(outputDir, res.name);
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
    this.audioTracks.forEach((audio) => {
      const audioDir = path.join(outputDir, "audio", audio.lang);
      fs.mkdirSync(audioDir, { recursive: true });

      const lang = /^[a-z]{2,3}$/i.test(audio.lang)
        ? audio.lang.toLowerCase()
        : "en";

      args.push(
        `input=${normalizePath(audio.path)},stream=audio,language=${lang},` +
          `init_segment=${normalizePath(path.join(audioDir, "init.mp4"))},` +
          `segment_template=${normalizePath(
            path.join(audioDir, "seg_$Number$.m4s")
          )},` +
          `playlist_name=${normalizePath(
            path.join(audioDir, "playlist.m3u8")
          )},` +
          `hls_group_id=audio,hls_name=${audio.name
            .toUpperCase()
            .replace(/\s+/g, "_")}`
      );
    });

    // Subtitles (directly reference source files)
    this.subtitles.forEach((sub) => {
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

    // Encryption flags
    if (encryptionOptions.enabled && encryptionOptions.clearkey) {
      args.push("--enable_raw_key_encryption");
      args.push(
        "--keys",
        `label=:key_id=${encryptionOptions.clearkey.key_id}:key=${encryptionOptions.clearkey.key}`
      );
    }

    // Common options — no --default_audio_language here
    args.push(
      "--mpd_output",
      normalizePath(path.join(outputDir, "manifest.mpd"))
    );
    args.push(
      "--hls_master_playlist_output",
      normalizePath(path.join(outputDir, "master.m3u8"))
    );
    args.push("--generate_static_live_mpd");
    args.push("--segment_duration", "6");
    args.push("--hls_playlist_type", "vod");

    console.log("📦 Packaging content...");

    await new Promise<void>((resolve, reject) => {
      const packagerProcess = spawn("packager", args, { stdio: "inherit" });

      packagerProcess.on("error", reject);
      packagerProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`packager exited with code ${code}`));
      });
    });
    console.log("✅ Packaging completed successfully");
  }

  async packageUniversal(targetDir: string, enabled: boolean = false) {
    if (enabled) {
      const clearkey = await this.generateClearKey(targetDir);
      await this.packageCommon(targetDir, {
        enabled: true,
        clearkey,
      });
      return clearkey;
    } else {
      await this.packageCommon(targetDir);
    }
  }
}

/*

import fs from "fs";
import crypto from "crypto";
import path from "path";
import { AudioTrack, ResolutionProfile, SubtitleTrack } from "./utils";
import { exec } from "child_process";
import util from "util";
import { spawn } from "child_process";

const execPromise = util.promisify(exec);

interface ClearKey {
  key_id: string;
  key: string;
}

const normalizePath = (p: string) => p.replace(/\\/g, "/");

export class ShakaPackager {
  constructor(
    private tempDir: string,
    private selectedResolutions: ResolutionProfile[],
    private audioTracks: AudioTrack[] = [],
    private subtitles: SubtitleTrack[] = []
  ) {}

  private async generateClearKey(targetDir: string): Promise<ClearKey> {
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

  private async packageCommon(
    outputDir: string,
    encryptionOptions: {
      enabled: boolean;
      clearkey?: ClearKey;
    } = { enabled: false }
  ) {
    fs.mkdirSync(outputDir, { recursive: true });

    const args: string[] = [];

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
    this.audioTracks.forEach((audio) => {
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
    this.subtitles.forEach((sub) => {
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
        this.audioTracks.find((t) => t.isDefault)?.lang || "und"
      }`
    );

    console.log("📦 Packaging content...");
    await new Promise<void>((resolve, reject) => {
      const packagerProcess = spawn("packager", args, { stdio: "inherit" });

      packagerProcess.on("error", reject);
      packagerProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`packager exited with code ${code}`));
      });
    });

    console.log("✅ Packaging completed successfully");
  }

  async packageUniversal(targetDir: string, enabled: boolean = false) {
    if (enabled) {
      const clearkey = await this.generateClearKey(targetDir);
      await this.packageCommon(targetDir, {
        enabled: true,
        clearkey,
      });
      return clearkey;
    } else {
      await this.packageCommon(targetDir);
    }
  }
}


*/
