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
const crypto_1 = __importDefault(require("crypto"));
const execPromise = util_1.default.promisify(child_process_1.exec);
const normalizePath = (p) => p.replace(/\\/g, "/");
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
            command.output(audioPath).noVideo().audioCodec("aac").audioBitrate("128k");
            return new Promise((resolve, reject) => {
                command
                    .on("end", () => resolve())
                    .on("error", reject)
                    .run();
            });
        });
    }
    generateClearKey(targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
            const key = crypto_1.default.randomBytes(16).toString("hex");
            const key_id = crypto_1.default.randomBytes(16).toString("hex");
            const keyData = { key_id, key };
            const filePath = path_1.default.join(targetDir, "clearkey.json");
            fs_1.default.writeFileSync(filePath, JSON.stringify(keyData, null, 2));
            console.log("🔐 ClearKey saved");
            return keyData;
        });
    }
    packageUniversalWithClearKey(targetDir_1, clearkey_1) {
        return __awaiter(this, arguments, void 0, function* (targetDir, clearkey, subtitles = [], audioTracks = []) {
            const outputDir = path_1.default.join(targetDir);
            fs_1.default.mkdirSync(outputDir, { recursive: true });
            const args = [];
            this.resolutions.forEach((res) => {
                const resDir = path_1.default.join(outputDir, res.name);
                fs_1.default.mkdirSync(resDir, { recursive: true });
                const input = normalizePath(path_1.default.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`));
                const segmentPath = normalizePath(path_1.default.join(resDir, "seg_$Number$.m4s"));
                args.push(`input=${input},stream=video,` +
                    `init_segment=${normalizePath(path_1.default.join(resDir, "init.mp4"))},` +
                    `segment_template=${segmentPath},` +
                    `playlist_name=${normalizePath(path_1.default.join(resDir, "playlist.m3u8"))}`);
            });
            const audioDir = path_1.default.join(outputDir, "audio");
            fs_1.default.mkdirSync(audioDir, { recursive: true });
            const audioInput = normalizePath(path_1.default.join(this.outputBaseDir, "audio.mp4"));
            args.push(`input=${audioInput},stream=audio,` +
                `init_segment=${normalizePath(path_1.default.join(audioDir, "init.mp4"))},` +
                `segment_template=${normalizePath(path_1.default.join(audioDir, "seg_$Number$.m4s"))},` +
                `playlist_name=${normalizePath(path_1.default.join(audioDir, "playlist.m3u8"))}`);
            audioTracks.forEach((audio) => {
                const audioDir = path_1.default.join(outputDir, "audio", audio.lang);
                fs_1.default.mkdirSync(audioDir, { recursive: true });
                const audioInput = normalizePath(audio.path);
                args.push(`input=${audioInput},stream=audio,language=${audio.lang},` +
                    `init_segment=${normalizePath(path_1.default.join(audioDir, "init.mp4"))},` +
                    `segment_template=${normalizePath(path_1.default.join(audioDir, "seg_$Number$.m4s"))},` +
                    `playlist_name=${normalizePath(path_1.default.join(audioDir, "playlist.m3u8"))}` +
                    `hls_group_id=audio,` +
                    `hls_name=AUDIO`);
            });
            subtitles.forEach((sub, index) => {
                const lang = sub.lang || `lang${index}`;
                const subDir = path_1.default.join(outputDir, "subtitles", lang);
                fs_1.default.mkdirSync(subDir, { recursive: true });
                const subInput = normalizePath(sub.path);
                args.push(`input=${subInput},stream=text,language=${lang},format=webvtt,` +
                    `segment_template=${normalizePath(path_1.default.join(subDir, "sub_$Number$.vtt"))},` +
                    `playlist_name=${normalizePath(path_1.default.join(subDir, "playlist.m3u8"))}`);
            });
            args.push(`--enable_raw_key_encryption`, `--keys label=:key_id=${clearkey.key_id}:key=${clearkey.key}`, `--mpd_output ${normalizePath(path_1.default.join(outputDir, "manifest.mpd"))}`, `--hls_master_playlist_output ${normalizePath(path_1.default.join(outputDir, "master.m3u8"))}`, `--generate_static_live_mpd`, `--segment_duration 6`);
            const command = `packager ${args.join(" ")}`;
            console.log("📦 Packaging universal DASH & HLS with resolution folders...");
            try {
                yield execPromise(command);
                console.log("✅ Successfully created:");
                console.log(`- DASH: "manifest.mpd" generated`);
                console.log(`- HLS: "master.m3u8" generated`);
            }
            catch (error) {
                console.error("❌ Packaging failed:", error);
                throw error;
            }
        });
    }
    packageWithoutEncryption(targetDir_1) {
        return __awaiter(this, arguments, void 0, function* (targetDir, subtitles = [], audioTracks = []) {
            const outputDir = path_1.default.join(targetDir);
            fs_1.default.mkdirSync(outputDir, { recursive: true });
            const segmentDuration = 6;
            const hlsPlaylistType = "vod";
            const args = [];
            this.resolutions.forEach((res) => {
                const resDir = res.name;
                fs_1.default.mkdirSync(path_1.default.join(outputDir, resDir), { recursive: true });
                const input = normalizePath(path_1.default.join(this.outputBaseDir, res.name, `video_${res.name}.mp4`));
                args.push(`input=${input},stream=video,` +
                    `init_segment=${resDir}/init.mp4,` +
                    `segment_template=${resDir}/seg_$Number$.m4s,` +
                    `playlist_name=${resDir}/playlist.m3u8,` +
                    `hls_group_id=video,` +
                    `hls_name=${res.name.toUpperCase()}`);
            });
            const audioDir = "audio";
            fs_1.default.mkdirSync(path_1.default.join(outputDir, audioDir), { recursive: true });
            args.push(`input=${normalizePath(path_1.default.join(this.outputBaseDir, "audio.mp4"))},stream=audio,` +
                `init_segment=${audioDir}/init.mp4,` +
                `segment_template=${audioDir}/seg_$Number$.m4s,` +
                `playlist_name=${audioDir}/playlist.m3u8,` +
                `hls_group_id=audio,` +
                `hls_name=AUDIO`);
            audioTracks.forEach((audio) => {
                const audioDir = path_1.default.join(outputDir, "audio", audio.lang);
                fs_1.default.mkdirSync(audioDir, { recursive: true });
                const audioInput = normalizePath(audio.path);
                args.push(`input=${audioInput},stream=audio,language=${audio.lang},` +
                    `init_segment=${normalizePath(path_1.default.join(audioDir, "init.mp4"))},` +
                    `segment_template=${normalizePath(path_1.default.join(audioDir, "seg_$Number$.m4s"))},` +
                    `playlist_name=${normalizePath(path_1.default.join(audioDir, "playlist.m3u8"))}` +
                    `hls_group_id=audio,` +
                    `hls_name=AUDIO`);
            });
            subtitles.forEach((sub, index) => {
                const lang = sub.lang || `lang${index}`;
                const subDir = path_1.default.join(outputDir, "subtitles", lang);
                fs_1.default.mkdirSync(subDir, { recursive: true });
                const subInput = normalizePath(sub.path);
                args.push(`input=${subInput},stream=text,language=${lang},format=webvtt,` +
                    `segment_template=${normalizePath(path_1.default.join(subDir, "sub_$Number$.vtt"))},` +
                    `playlist_name=${normalizePath(path_1.default.join(subDir, "playlist.m3u8"))}`);
            });
            args.push(`--mpd_output manifest.mpd`, `--hls_master_playlist_output master.m3u8`, `--generate_static_live_mpd`, `--segment_duration ${segmentDuration}`, `--hls_playlist_type ${hlsPlaylistType}`, `--fragment_duration ${segmentDuration}`, `--segment_sap_aligned`, `--min_buffer_time ${segmentDuration * 2}`, `--minimum_update_period ${segmentDuration}`);
            console.log("📦 Packaging unencrypted version...");
            yield execPromise(`packager ${args.join(" ")}`, {
                cwd: outputDir,
            });
            console.log("✅ Unencrypted packaging complete");
        });
    }
}
exports.VideoTranscoder = VideoTranscoder;
//# sourceMappingURL=ffmpeg-encrip.js.map