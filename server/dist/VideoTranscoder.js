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
exports.ShakaPackagerTranscoder = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class ShakaPackagerTranscoder {
    constructor(outputDir, encryptionEnabled = false) {
        this.profiles = [
            { name: '144p', height: 144, bitrate: '100k', codec: 'libx264', audioBitrate: '64k' },
            { name: '360p', height: 360, bitrate: '500k', codec: 'libx264', audioBitrate: '96k' },
            { name: '480p', height: 480, bitrate: '800k', codec: 'libx264', audioBitrate: '96k' },
            { name: '720p', height: 720, bitrate: '1500k', codec: 'libx264', audioBitrate: '128k' },
            { name: '1080p', height: 1080, bitrate: '3000k', codec: 'libx264', audioBitrate: '128k' },
            { name: '4K', height: 2160, bitrate: '12000k', codec: 'libvpx-vp9', audioBitrate: '192k' }
        ];
        this.segmentDuration = 4;
        this.outputDir = outputDir;
        this.encryptionEnabled = encryptionEnabled;
        this.ensureOutputDir();
    }
    ensureOutputDir() {
        if (!fs_1.default.existsSync(this.outputDir)) {
            fs_1.default.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    generateKeyAndKid() {
        return {
            key: crypto_1.default.randomBytes(16).toString('hex'),
            kid: crypto_1.default.randomBytes(16).toString('hex')
        };
    }
    transcodeToProfile(inputPath, videoId, profile) {
        return __awaiter(this, void 0, void 0, function* () {
            const profileDir = path_1.default.join(this.outputDir, videoId, profile.name);
            const outputPath = path_1.default.join(profileDir, 'output.mp4');
            if (!fs_1.default.existsSync(profileDir)) {
                fs_1.default.mkdirSync(profileDir, { recursive: true });
            }
            const ffmpegCmd = `
      ffmpeg -hide_banner -y -i ${inputPath} \
      -c:v ${profile.codec} -b:v ${profile.bitrate} -vf "scale=-2:${profile.height}" \
      -c:a aac -b:a ${profile.audioBitrate || '128k'} \
      ${outputPath}
    `;
            (0, child_process_1.execSync)(ffmpegCmd, { stdio: 'inherit' });
            return outputPath;
        });
    }
    packageWithShakaPackager(videoId, encryptedProfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            const videoIdDir = path_1.default.join(this.outputDir, videoId);
            const shakaCmdArgs = [];
            encryptedProfiles.forEach((profile, index) => {
                shakaCmdArgs.push(`input=${profile.path},stream=video,output=${path_1.default.join(videoIdDir, `${profile.kid}_dash.mp4`)},`
                    + `playlist_name=${profile.kid}/manifest.mpd,dash_only=1`);
                shakaCmdArgs.push(`input=${profile.path},stream=video,output=${path_1.default.join(videoIdDir, `${profile.kid}_hls.mp4`)},`
                    + `playlist_name=${profile.kid}/playlist.m3u8,hls_only=1`);
            });
            if (this.encryptionEnabled) {
                shakaCmdArgs.push('--enable_raw_key_encryption');
                encryptedProfiles.forEach(profile => {
                    shakaCmdArgs.push(`--keys label=${profile.kid}:key_id=${profile.kid}:key=${profile.key}`);
                });
            }
            shakaCmdArgs.push(`--mpd_output ${path_1.default.join(videoIdDir, 'manifest.mpd')}`);
            shakaCmdArgs.push(`--hls_master_playlist_output ${path_1.default.join(videoIdDir, 'master.m3u8')}`);
            const shakaCmd = `shaka-packager ${shakaCmdArgs.join(' ')}`;
            console.log('Executing:', shakaCmd);
            (0, child_process_1.execSync)(shakaCmd, { stdio: 'inherit' });
        });
    }
    transcodeVideo(inputPath, videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Starting transcoding for video ${videoId}`);
            const encryptedProfiles = yield Promise.all(this.profiles.map((profile) => __awaiter(this, void 0, void 0, function* () {
                const outputPath = yield this.transcodeToProfile(inputPath, videoId, profile);
                const { key, kid } = this.generateKeyAndKid();
                return { path: outputPath, key, kid };
            })));
            yield this.packageWithShakaPackager(videoId, encryptedProfiles);
            return {
                dashManifest: path_1.default.join(this.outputDir, videoId, 'manifest.mpd'),
                hlsManifest: path_1.default.join(this.outputDir, videoId, 'master.m3u8')
            };
        });
    }
}
exports.ShakaPackagerTranscoder = ShakaPackagerTranscoder;
(() => __awaiter(void 0, void 0, void 0, function* () {
    const transcoder = new ShakaPackagerTranscoder('./output', true);
    yield transcoder.transcodeVideo('./input.mp4', 'video123');
    console.log('DASH manifest:', './output/video123/manifest.mpd');
    console.log('HLS manifest:', './output/video123/master.m3u8');
}))();
//# sourceMappingURL=VideoTranscoder.js.map