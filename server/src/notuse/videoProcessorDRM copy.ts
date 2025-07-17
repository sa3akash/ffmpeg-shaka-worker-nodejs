import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// ✅ Resolutions to export
const resolutions = [
  { name: '360p', width: 640, height: 360, bitrate: '800k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2000k' },
];

// ✅ Auto-generate secure ClearKey key and ID (hex-32)
const generateClearKey = () => {
  const bytes = () => [...Array(16)].map(() => Math.floor(Math.random() * 256));
  const toHex = (bytes: number[]) =>
    bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return {
    keyId: toHex(bytes()),
    key: toHex(bytes()),
  };
};

// ✅ Validates hex format
function isValidHex32(str: string): boolean {
  return /^[a-f0-9]{32}$/.test(str);
}

// ✅ Define ClearKey (you can make this dynamic too)
export const clearkey = generateClearKey();
// Optional: Hardcode if you prefer:
// export const clearkey = { keyId: '0123456789abcdef0123456789abcdef', key: 'abcdef0123456789abcdef0123456789' };

// Log base64 for player usage
const hexToBase64 = (hex: string) =>
  Buffer.from(hex, 'hex').toString('base64');

console.log('🛡️  ClearKey (for player config):');
console.log('Key ID (base64):', hexToBase64(clearkey.keyId));
console.log('Key    (base64):', hexToBase64(clearkey.key));

if (!isValidHex32(clearkey.keyId) || !isValidHex32(clearkey.key)) {
  throw new Error('❌ Invalid ClearKey format: must be 32 lowercase hex chars');
}

/**
 * Transcode to all resolutions using FFmpeg
 */
export async function transcode(inputPath: string, outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });

  const tasks = resolutions.map((res) => {
    return new Promise<void>((resolve, reject) => {
      const resDir = path.join(outputDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outputPath = path.join(resDir, `video_${res.name}.mp4`);

      ffmpeg(inputPath)
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
        .on('end', () => {
          console.log(`✅ Transcoded: ${res.name}`);
          resolve();
        })
        .on('error', reject)
        .run();
    });
  });

  await Promise.all(tasks);
}

/**
 * Package HLS output with ClearKey DRM using Shaka Packager
 */
export async function packageHLS(outputBaseDir: string) {
  const hlsDir = path.join(outputBaseDir, 'hls');
  fs.mkdirSync(hlsDir, { recursive: true });

  console.log({hls:clearkey})

  const inputArgs = resolutions.map((res) => {
    const input = path.join(outputBaseDir, res.name, `video_${res.name}.mp4`);
    const outDir = path.join(hlsDir, res.name);
    fs.mkdirSync(outDir, { recursive: true });

    return `input=${input},stream=video,init_segment=${path.join(outDir, 'init.mp4')},segment_template=${path.join(outDir, 'seg_$Number$.m4s')},playlist_name=playlist.m3u8`;
  });

  const args = [
    ...inputArgs,
    `--hls_master_playlist_output ${path.join(hlsDir, 'master.m3u8')}`,
    `--segment_duration 6`,
    `--enable_raw_key_encryption`,
    `--keys=label=:key_id=${clearkey.keyId},key=${clearkey.key}`,
  ];

  const command = `packager ${args.join(' ')}`;
  console.log('🔐 Packaging HLS with ClearKey...');
  await execPromise(command);
  console.log('✅ HLS DRM packaging done.');
}

/**
 * Package DASH output with ClearKey DRM using Shaka Packager
 */
export async function packageDASH(outputBaseDir: string) {
  const dashDir = path.join(outputBaseDir, 'dash');
  fs.mkdirSync(dashDir, { recursive: true });
  console.log({dash:clearkey})

  const inputArgs = resolutions.map((res) => {
    const input = path.join(outputBaseDir, res.name, `video_${res.name}.mp4`);
    const outDir = path.join(dashDir, res.name);
    fs.mkdirSync(outDir, { recursive: true });

    return `input=${input},stream=video,init_segment=${path.join(outDir, 'init.mp4')},segment_template=${path.join(outDir, 'seg_$Number$.m4s')}`;
  });

  const args = [
    ...inputArgs,
    `--mpd_output ${path.join(dashDir, 'manifest.mpd')}`,
    `--segment_duration 6`,
    `--generate_static_live_mpd`,
    `--enable_raw_key_encryption`,
    `--keys=label=:key_id=${clearkey.keyId},key=${clearkey.key}`,
  ];

  const command = `packager ${args.join(' ')}`;
  console.log('🔐 Packaging DASH with ClearKey...');
  await execPromise(command);
  console.log('✅ DASH DRM packaging done.');
}
