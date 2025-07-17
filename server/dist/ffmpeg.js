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
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execPromise = util_1.default.promisify(child_process_1.exec);
const resolutions = [
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2000k' },
];
function transcode(inputPath, outputDir) {
    return __awaiter(this, void 0, void 0, function* () {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
        const promises = resolutions.map((res) => {
            return new Promise((resolve, reject) => {
                const resDir = path_1.default.join(outputDir, res.name);
                fs_1.default.mkdirSync(resDir, { recursive: true });
                const outputPath = path_1.default.join(resDir, `video_${res.name}.mp4`);
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .outputOptions([
                    '-c:v libx264',
                    `-b:v ${res.bitrate}`,
                    `-vf scale=${res.width}:${res.height}`,
                    '-preset fast',
                    '-profile:v main',
                    '-crf 20',
                    '-movflags +faststart',
                ])
                    .output(outputPath)
                    .on('end', () => resolve())
                    .on('error', reject)
                    .run();
            });
        });
        yield Promise.all(promises);
    });
}
function packageHLS(outputBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const hlsDir = path_1.default.join(outputBaseDir, 'hls');
        fs_1.default.mkdirSync(hlsDir, { recursive: true });
        const inputArgs = resolutions.map((res) => {
            const input = path_1.default.join(outputBaseDir, res.name, `video_${res.name}.mp4`);
            const outDir = path_1.default.join(hlsDir, res.name);
            fs_1.default.mkdirSync(outDir, { recursive: true });
            return `input=${input},stream=video,output=${path_1.default.join(outDir, 'playlist.m3u8')}`;
        });
        const args = [
            ...inputArgs,
            `--hls_master_playlist_output ${path_1.default.join(hlsDir, 'master.m3u8')}`,
            `--segment_duration 6`,
        ];
        const command = `packager ${args.join(' ')}`;
        console.log('📦 Packaging HLS...');
        yield execPromise(command);
    });
}
function packageDASH(outputBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const dashDir = path_1.default.join(outputBaseDir, 'dash');
        fs_1.default.mkdirSync(dashDir, { recursive: true });
        const inputArgs = resolutions.map((res) => {
            const input = path_1.default.join(outputBaseDir, res.name, `video_${res.name}.mp4`);
            const outDir = path_1.default.join(dashDir, res.name);
            fs_1.default.mkdirSync(outDir, { recursive: true });
            return `input=${input},stream=video,output=${path_1.default.join(outDir, 'playlist.mpd')}`;
        });
        const args = [
            ...inputArgs,
            `--mpd_output ${path_1.default.join(dashDir, 'manifest.mpd')}`,
            `--segment_duration 6`,
        ];
        const command = `packager ${args.join(' ')}`;
        console.log('📦 Packaging DASH...');
        yield execPromise(command);
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const inputVideo = 'input.mp4'; // Replace with your video
        const outputDir = 'output';
        console.log('🎬 Transcoding...');
        yield transcode(inputVideo, outputDir);
        yield packageHLS(outputDir);
        yield packageDASH(outputDir);
        console.log('✅ All done. Check the output folder.');
    });
}
main().catch(console.error);
//# sourceMappingURL=ffmpeg.js.map