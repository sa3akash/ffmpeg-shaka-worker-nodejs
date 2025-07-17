import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);

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

const resolutions: ResolutionProfile[] = [
  { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2000k', audioBitrate: '128k' },
];

const normalizePath = (p: string) => p.replace(/\\/g, '/');

export const clearkey = {
  keyId: crypto.randomBytes(16).toString('hex'),
  key: crypto.randomBytes(16).toString('hex'),
};

console.log('🔑 ClearKey keyId:', clearkey.keyId);
console.log('🔑 ClearKey key:', clearkey.key);

async function transcodeVideo(inputPath: string, outputDir: string, res: ResolutionProfile): Promise<string> {
  const outputPath = path.join(outputDir, `video_${res.name}.mp4`);
  
  await new Promise<void>((resolve, reject) => {
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
      .on('end', ()=>resolve())
      .on('error', reject)
      .run();
  });
  
  return outputPath;
}

async function extractAudio(inputPath: string, outputDir: string, res: ResolutionProfile): Promise<string> {
  const outputPath = path.join(outputDir, `audio_${res.name}.mp4`);
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:a aac',
        `-b:a ${res.audioBitrate || '128k'}`,
        '-ac 2',
        '-vn',
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('end', ()=>resolve())
      .on('error', reject)
      .run();
  });
  
  return outputPath;
}

export async function transcode(inputPath: string, outputDir: string): Promise<TranscodeResult[]> {
  await fs.mkdir(outputDir, { recursive: true });

  console.log(inputPath)

  const results: TranscodeResult[] = [];

  for (const res of resolutions) {
    const resDir = path.join(outputDir, res.name);
    await fs.mkdir(resDir, { recursive: true });

    const [videoPath, audioPath] = await Promise.all([
      transcodeVideo(inputPath, resDir, res),
      extractAudio(inputPath, resDir, res)
    ]);

    results.push({
      videoPath,
      audioPath,
      resolution: res
    });

    console.log(`✅ Transcoded ${res.name}`);
  }

  return results;
}

async function packageStreams(
  outputBaseDir: string,
  format: 'hls' | 'dash',
  transcodeResults: TranscodeResult[]
): Promise<void> {
  const outputDir = path.join(outputBaseDir, format);
  await fs.mkdir(outputDir, { recursive: true });

  const inputArgs: string[] = [];

  // Add audio streams
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

  // Add video streams
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
      `bandwidth=${result.resolution.bitrate.replace('k', '000')}`
    );
  }

  const commonArgs = [
    ...inputArgs,
    '--segment_duration 6',
    '--enable_raw_key_encryption',
    `--keys="label=:key_id=${clearkey.keyId}:key=${clearkey.key}"`,
    `--clear_lead 0`
  ];

  const formatSpecificArgs = format === 'hls'
    ? [`--hls_master_playlist_output ${normalizePath(path.join(outputDir, 'master.m3u8'))}`]
    : [
        `--mpd_output ${normalizePath(path.join(outputDir, 'manifest.mpd'))}`,
        '--generate_static_live_mpd'
      ];

  const command = `packager ${[...commonArgs, ...formatSpecificArgs].join(' ')}`;

  console.log(`🔐 Packaging ${format.toUpperCase()} with ClearKey DRM...`);
  console.log('Running command:', command);

  try {
    const { stdout, stderr } = await execPromise(command);
    console.log(`✅ ${format.toUpperCase()} Packaging done`);
  } catch (error) {
    console.error(`❌ Error packaging ${format}:`, error);
    throw error;
  }
}

export async function packageHLS(outputBaseDir: string, transcodeResults: TranscodeResult[]) {
  await packageStreams(outputBaseDir, 'hls', transcodeResults);
}

export async function packageDASH(outputBaseDir: string, transcodeResults: TranscodeResult[]) {
  await packageStreams(outputBaseDir, 'dash', transcodeResults);
}
