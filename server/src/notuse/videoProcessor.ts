import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Define resolutions to transcode
const resolutions = [
  { name: '360p', width: 640, height: 360, bitrate: '800k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2000k' },
];

/**
 * Transcode input video into multiple resolutions using FFmpeg
 * @param inputPath Absolute path to the input video file
 * @param outputDir Folder where transcoded videos will be stored
 */
export async function transcode(inputPath: string, outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Transcode each resolution in parallel
  const promises = resolutions.map((res) => {
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
          '-movflags +faststart', // enables fast playback start
        ])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Transcoded: ${res.name}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ Error transcoding ${res.name}:`, err);
          reject(err);
        })
        .run();
    });
  });

  await Promise.all(promises);
}

/**
 * Package transcoded MP4s into HLS using Shaka Packager
 * @param outputBaseDir Base output directory where resolution folders exist
 */
export async function packageHLS(outputBaseDir: string) {
  const hlsDir = path.join(outputBaseDir, 'hls');
  fs.mkdirSync(hlsDir, { recursive: true });

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
  ];

  const command = `packager ${args.join(' ')}`;
  console.log('📦 Packaging HLS...');
  await execPromise(command);
  console.log('✅ HLS packaging done.');
}

/**
 * Package transcoded MP4s into DASH using Shaka Packager
 * @param outputBaseDir Base output directory where resolution folders exist
 */
export async function packageDASH(outputBaseDir: string) {
  const dashDir = path.join(outputBaseDir, 'dash');
  fs.mkdirSync(dashDir, { recursive: true });

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
    `--generate_static_live_mpd`, // ensures the MPD is treated as VOD
  ];

  const command = `packager ${args.join(' ')}`;
  console.log('📦 Packaging DASH...');
  await execPromise(command);
  console.log('✅ DASH packaging done.');
}
