"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoTranscoder = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execPromise = util_1.default.promisify(child_process_1.exec);
class VideoTranscoder {
    constructor(inputPath, outputBaseDir) {
        this.inputPath = inputPath;
        this.outputBaseDir = outputBaseDir;
        this.resolutions = [
            { name: "360p", width: 640, height: 360, bitrate: "800k" },
            { name: "720p", width: 1280, height: 720, bitrate: "2000k" },
        ];
    }
    transcode() {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(this.outputBaseDir, { recursive: true });
            const command = (0, fluent_ffmpeg_1.default)(this.inputPath);
            this.resolutions.forEach((res) => {
                const resDir = path_1.default.join(this.outputBaseDir, res.name);
                fs_1.default.mkdirSync(resDir, { recursive: true });
                const outPath = path_1.default.join(resDir, `video_${res.name}.mp4`);
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
            const audioPath = path_1.default.join(this.outputBaseDir, "audio.mp4");
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
        });
    }
    packageHLS(targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const hlsDir = path_1.default.join(targetDir, "hls");
            fs_1.default.mkdirSync(hlsDir, { recursive: true });
            const inputArgs = this.resolutions.map((res) => {
                const input = path_1.default.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`);
                const outDir = path_1.default.join(hlsDir, res.name);
                fs_1.default.mkdirSync(outDir, { recursive: true });
                return `input=${input},stream=video,init_segment=${path_1.default.join(outDir, "init.mp4")},segment_template=${path_1.default.join(outDir, "seg_$Number$.m4s")},playlist_name=playlist.m3u8`;
            });
            const audioDir = path_1.default.join(hlsDir, "audio");
            fs_1.default.mkdirSync(audioDir, { recursive: true });
            inputArgs.push(`input=${path_1.default.join(this.outputBaseDir, "audio.mp4")},stream=audio,init_segment=${path_1.default.join(audioDir, "init.mp4")},segment_template=${path_1.default.join(audioDir, "seg_$Number$.m4s")},playlist_name=audio.m3u8`);
            const args = [
                ...inputArgs,
                `--hls_master_playlist_output ${path_1.default.join(hlsDir, "master.m3u8")}`,
                `--segment_duration 6`,
            ];
            const command = `packager ${args.join(" ")}`;
            console.log("📦 Packaging HLS...");
            yield execPromise(command);
            console.log("✅ HLS Packaging done.");
        });
    }
    packageDASH(targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const dashDir = path_1.default.join(targetDir, "dash");
            fs_1.default.mkdirSync(dashDir, { recursive: true });
            const inputArgs = this.resolutions.map((res) => {
                const input = path_1.default.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`);
                const outDir = path_1.default.join(dashDir, res.name);
                fs_1.default.mkdirSync(outDir, { recursive: true });
                return `input=${input},stream=video,init_segment=${path_1.default.join(outDir, "init.mp4")},segment_template=${path_1.default.join(outDir, "seg_$Number$.m4s")}`;
            });
            const audioDir = path_1.default.join(dashDir, "audio");
            fs_1.default.mkdirSync(audioDir, { recursive: true });
            inputArgs.push(`input=${path_1.default.join(this.outputBaseDir, "audio.mp4")},stream=audio,init_segment=${path_1.default.join(audioDir, "init.mp4")},segment_template=${path_1.default.join(audioDir, "seg_$Number$.m4s")}`);
            const args = [
                ...inputArgs,
                `--mpd_output ${path_1.default.join(dashDir, "manifest.mpd")}`,
                `--segment_duration 6`,
                `--generate_static_live_mpd`,
            ];
            const command = `packager ${args.join(" ")}`;
            console.log("📦 Packaging DASH...");
            yield execPromise(command);
            console.log("✅ DASH Packaging done.");
        });
    }
}
exports.VideoTranscoder = VideoTranscoder;
//# sourceMappingURL=ffmpeg.js.map