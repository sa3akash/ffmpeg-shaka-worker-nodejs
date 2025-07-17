import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

type VideoProfile = {
  name: string;
  width?: number;
  height: number;
  bitrate: string;
  codec: 'libx264' | 'libvpx-vp9' | 'libaom-av1';
  audioBitrate?: string;
};

export class ShakaPackagerTranscoder {
  private readonly profiles: VideoProfile[] = [
    { name: '144p', height: 144, bitrate: '100k', codec: 'libx264', audioBitrate: '64k' },
    { name: '360p', height: 360, bitrate: '500k', codec: 'libx264', audioBitrate: '96k' },
    { name: '480p', height: 480, bitrate: '800k', codec: 'libx264', audioBitrate: '96k' },
    { name: '720p', height: 720, bitrate: '1500k', codec: 'libx264', audioBitrate: '128k' },
    { name: '1080p', height: 1080, bitrate: '3000k', codec: 'libx264', audioBitrate: '128k' },
    { name: '4K', height: 2160, bitrate: '12000k', codec: 'libvpx-vp9', audioBitrate: '192k' }
  ];

  private readonly segmentDuration = 4; // 4-second segments
  private readonly encryptionEnabled: boolean;
  private readonly outputDir: string;

  constructor(outputDir: string, encryptionEnabled = false) {
    this.outputDir = outputDir;
    this.encryptionEnabled = encryptionEnabled;
    this.ensureOutputDir();
  }

  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private generateKeyAndKid(): { key: string; kid: string } {
    return {
      key: crypto.randomBytes(16).toString('hex'),
      kid: crypto.randomBytes(16).toString('hex')
    };
  }

  private async transcodeToProfile(
    inputPath: string,
    videoId: string,
    profile: VideoProfile
  ): Promise<string> {
    const profileDir = path.join(this.outputDir, videoId, profile.name);
    const outputPath = path.join(profileDir, 'output.mp4');

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // FFmpeg command to transcode to target resolution/bitrate
    const ffmpegCmd = `
      ffmpeg -hide_banner -y -i ${inputPath} \
      -c:v ${profile.codec} -b:v ${profile.bitrate} -vf "scale=-2:${profile.height}" \
      -c:a aac -b:a ${profile.audioBitrate || '128k'} \
      ${outputPath}
    `;

    execSync(ffmpegCmd, { stdio: 'inherit' });
    return outputPath;
  }

  private async packageWithShakaPackager(
    videoId: string,
    encryptedProfiles: { path: string; key: string; kid: string }[]
  ): Promise<void> {
    const videoIdDir = path.join(this.outputDir, videoId);
    const shakaCmdArgs = [];

    // Add inputs for DASH and HLS
    encryptedProfiles.forEach((profile, index) => {
      shakaCmdArgs.push(
        `input=${profile.path},stream=video,output=${path.join(videoIdDir, `${profile.kid}_dash.mp4`)},`
        + `playlist_name=${profile.kid}/manifest.mpd,dash_only=1`
      );
      shakaCmdArgs.push(
        `input=${profile.path},stream=video,output=${path.join(videoIdDir, `${profile.kid}_hls.mp4`)},`
        + `playlist_name=${profile.kid}/playlist.m3u8,hls_only=1`
      );
    });

    // Enable encryption if specified
    if (this.encryptionEnabled) {
      shakaCmdArgs.push('--enable_raw_key_encryption');
      encryptedProfiles.forEach(profile => {
        shakaCmdArgs.push(`--keys label=${profile.kid}:key_id=${profile.kid}:key=${profile.key}`);
      });
    }

    // Generate DASH manifest
    shakaCmdArgs.push(`--mpd_output ${path.join(videoIdDir, 'manifest.mpd')}`);

    // Generate HLS master playlist
    shakaCmdArgs.push(`--hls_master_playlist_output ${path.join(videoIdDir, 'master.m3u8')}`);

    // Execute Shaka Packager
    const shakaCmd = `shaka-packager ${shakaCmdArgs.join(' ')}`;
    console.log('Executing:', shakaCmd);
    execSync(shakaCmd, { stdio: 'inherit' });
  }

  public async transcodeVideo(
    inputPath: string,
    videoId: string
  ): Promise<{ dashManifest: string; hlsManifest: string }> {
    console.log(`Starting transcoding for video ${videoId}`);

    // 1. Transcode to all profiles
    const encryptedProfiles = await Promise.all(
      this.profiles.map(async profile => {
        const outputPath = await this.transcodeToProfile(inputPath, videoId, profile);
        const { key, kid } = this.generateKeyAndKid();
        return { path: outputPath, key, kid };
      })
    );

    // 2. Package with Shaka Packager
    await this.packageWithShakaPackager(videoId, encryptedProfiles);

    return {
      dashManifest: path.join(this.outputDir, videoId, 'manifest.mpd'),
      hlsManifest: path.join(this.outputDir, videoId, 'master.m3u8')
    };
  }
}

// Example Usage
(async () => {
  const transcoder = new ShakaPackagerTranscoder('./output', true);
  await transcoder.transcodeVideo('./input.mp4', 'video123');
  console.log('DASH manifest:', './output/video123/manifest.mpd');
  console.log('HLS manifest:', './output/video123/master.m3u8');
})();