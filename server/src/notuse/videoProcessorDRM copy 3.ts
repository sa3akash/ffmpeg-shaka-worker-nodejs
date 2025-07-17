import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

interface ResolutionProfile {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  audioBitrate?: string;
}

interface TranscodeResult {
  videoPath: string;
  audioPath: string;
  resolution: ResolutionProfile;
}

// Supported resolutions to transcode
export const resolutions: ResolutionProfile[] = [
  { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2000k', audioBitrate: '128k' },
];

// Generate random ClearKey keyId and key (16 bytes each)
export const clearkey = {
  keyId: crypto.randomBytes(16).toString('hex'),
  key: crypto.randomBytes(16).toString('hex'),
};

console.log('🔑 ClearKey keyId:', clearkey.keyId);
console.log('🔑 ClearKey key:', clearkey.key);

// Normalize Windows paths to POSIX style for packager compatibility
const normalizePath = (p: string) => p.replace(/\\/g, '/');

/**
 * Transcode input video to specified resolution using ffmpeg
 */
async function transcodeVideo(inputPath: string, outputDir: string, res: ResolutionProfile): Promise<string> {
  const outputPath = path.join(outputDir, `video_${res.name}.mp4`);

  return new Promise((resolve, reject) => {
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
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Extract audio from input video with specified bitrate
 */
async function extractAudio(inputPath: string, outputDir: string, res: ResolutionProfile): Promise<string> {
  const outputPath = path.join(outputDir, `audio_${res.name}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:a aac',
        `-b:a ${res.audioBitrate || '128k'}`,
        '-ac 2',
        '-vn',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Transcode input video into multiple resolutions and extract audio
 */
export async function transcode(inputPath: string, outputDir: string): Promise<TranscodeResult[]> {
  await fs.mkdir(outputDir, { recursive: true });
  const results: TranscodeResult[] = [];

  for (const res of resolutions) {
    const resDir = path.join(outputDir, res.name);
    await fs.mkdir(resDir, { recursive: true });

    const [videoPath, audioPath] = await Promise.all([
      transcodeVideo(inputPath, resDir, res),
      extractAudio(inputPath, resDir, res),
    ]);

    results.push({ videoPath, audioPath, resolution: res });
    console.log(`✅ Transcoded ${res.name}`);
  }

  return results;
}

/**
 * Run Shaka Packager CLI with given arguments, streaming output to current process
 */
async function runPackager(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('packager', args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Packager exited with code ${code}`));
    });
  });
}

/**
 * Package transcoded streams into HLS or DASH with ClearKey DRM using Shaka Packager
 */
async function packageStreams(
  outputBaseDir: string,
  format: 'hls' | 'dash',
  transcodeResults: TranscodeResult[]
): Promise<void> {
  const outputDir = path.join(outputBaseDir, format);
  await fs.mkdir(outputDir, { recursive: true });

  const inputArgs: string[] = [];

  // Audio stream (take from first resolution)
  const audioInput = normalizePath(transcodeResults[0].audioPath);
  const audioOutputDir = normalizePath(path.join(outputDir, 'audio'));
  await fs.mkdir(audioOutputDir, { recursive: true });

  inputArgs.push(
    `input=${audioInput},stream=audio,` +
      `init_segment=${audioOutputDir}/init.mp4,` +
      `segment_template=${audioOutputDir}/seg_$Number$.m4s,` +
      `playlist_name=audio.m3u8,` +
      `hls_group_id=audio,hls_name=ENGLISH`
  );

  // Video streams for each resolution
  for (const result of transcodeResults) {
    const videoInput = normalizePath(result.videoPath);
    const videoOutputDir = normalizePath(path.join(outputDir, result.resolution.name));
    await fs.mkdir(videoOutputDir, { recursive: true });

    inputArgs.push(
      `input=${videoInput},stream=video,` +
        `init_segment=${videoOutputDir}/init.mp4,` +
        `segment_template=${videoOutputDir}/seg_$Number$.m4s,` +
        `playlist_name=playlist.m3u8,` +
        `iframe_playlist_name=iframe.m3u8,` +
        `bandwidth=${parseInt(result.resolution.bitrate) * 1000}`
    );
  }

  // Common packager arguments with **NO** `0x` prefix for keys
  const commonArgs = [
    ...inputArgs,
    '--segment_duration', '6',
    '--enable_raw_key_encryption',
    '--keys', `key_id=${clearkey.keyId}:key=${clearkey.key}`,
    '--clear_lead', '0',
  ];

  // Format specific output options
  const formatSpecificArgs =
    format === 'hls'
      ? ['--hls_master_playlist_output', normalizePath(path.join(outputDir, 'master.m3u8'))]
      : ['--mpd_output', normalizePath(path.join(outputDir, 'manifest.mpd')), '--generate_static_live_mpd'];

  const args = [...commonArgs, ...formatSpecificArgs];

  console.log('🔐 Running packager with args:', args.join(' '));
  await runPackager(args);
  console.log(`✅ ${format.toUpperCase()} Packaging done`);
}

/**
 * Package as HLS
 */
export async function packageHLS(outputBaseDir: string, transcodeResults: TranscodeResult[]) {
  await packageStreams(outputBaseDir, 'hls', transcodeResults);
}

/**
 * Package as DASH
 */
export async function packageDASH(outputBaseDir: string, transcodeResults: TranscodeResult[]) {
  await packageStreams(outputBaseDir, 'dash', transcodeResults);
}
