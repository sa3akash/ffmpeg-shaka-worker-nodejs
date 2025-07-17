import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import {
  AudioTrack,
  RESOLUTION_PROFILES,
  ResolutionProfile,
  VideoMetadata,
} from "./utils";

export class FFmpegTranscoder {
  constructor(private inputVideo: string, private tempDir: string) {}

  public async videoTranscode() {
    const audioBaseDir = path.join(this.tempDir, "audio");
    fs.mkdirSync(this.tempDir, { recursive: true });
    fs.mkdirSync(audioBaseDir, { recursive: true });

    const videoPaths: string[] = [];
    const audioTrackData: AudioTrack[] = [];

    const { width, audioTracks } = await this.getVideoMetadata();
    const applicableResolutions = this.selectResolutions(width);

    // Process video for each resolution
    for (const res of applicableResolutions) {
      const resDir = path.join(this.tempDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outPath = path.join(resDir, `video_${res.name}.mp4`);
      // await this.transcodeVideo(res, outPath);
      videoPaths.push(outPath);
    }

    // Process each audio track
    for (const [index, track] of audioTracks.entries()) {
      const lang = track.language || `audio${index}`;
      const audioPath = path.join(audioBaseDir, `audio_${lang}.mp4`);
      await this.transcodeAudio(index, track.language, audioPath);

      audioTrackData.push({
        lang,
        path: audioPath,
        name: track.language
          ? `${track.language} Audio`
          : `Audio Track ${index + 1}`,
        isDefault: index === 0,
      });
    }

    return {
      videoPaths,
      audioTrackData,
      resolutions: applicableResolutions,
    };
  }

  private async transcodeVideo(
    res: ResolutionProfile,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(this.inputVideo)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${res.width}x${res.height}`)
        .videoBitrate(res.bitrate)
        .outputOptions([
          "-threads 2",
          "-preset fast",
          "-profile:v main",
          "-crf 20",
          "-movflags +faststart",
        ])
        .on("end", () => resolve())
        .on("error", reject)
        .save(outputPath);
    });
  }

  private async transcodeAudio(
    index: number,
    language: string | undefined,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = [`-map 0:a:${index}`];
      if (language) {
        options.push(`-metadata:s:a:0 language=${language}`);
      }

      ffmpeg(this.inputVideo)
        .noVideo()
        .audioCodec("aac")
        .audioBitrate("128k")
        .outputOptions(options)
        .on("end", () => resolve())
        .on("error", reject)
        .save(outputPath);
    });
  }

  private async getVideoMetadata(): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.inputVideo, (err, metadata) => {
        if (err) return reject(err);

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video"
        );
        if (!videoStream) return reject(new Error("No video stream found"));

        const audioTracks = metadata.streams
          .filter((s) => s.codec_type === "audio")
          .map((s, index) => ({
            index,
            language: s.tags?.language,
            codec: s.codec_name as string,
            channels: s.channels as number,
            sample_rate: s.sample_rate as number,
          }));

        resolve({
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: parseFloat(videoStream.duration || "0"),
          audioTracks,
        });
      });
    });
  }

  private selectResolutions(width: number): ResolutionProfile[] {
    const selected = RESOLUTION_PROFILES.filter((res) => width >= res.width);
    if (selected.length === 0) {
      throw new Error("No suitable resolutions found for input video");
    }
    return selected;
  }
}

/*




import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import {
  AudioTrack,
  RESOLUTION_PROFILES,
  ResolutionProfile,
  VideoMetadata,
} from "./utils";

export class FFmpegTranscoder {
  constructor(private inputVideo: string, private tempDir: string) {}

  public async videoTranscode() {
    const videoBaseDir = path.join(this.tempDir, "video");
    const audioBaseDir = path.join(this.tempDir, "audio");
    fs.mkdirSync(this.tempDir, { recursive: true });
    fs.mkdirSync(videoBaseDir, { recursive: true });
    fs.mkdirSync(audioBaseDir, { recursive: true });

    const videoPaths: string[] = [];
    const audioTrackData: AudioTrack[] = [];

    const { width, audioTracks } = await this.getVideoMetadata();
    const applicableResulation = this.selectResolutions(width);

    const command = ffmpeg(this.inputVideo);
    applicableResulation.forEach((res) => {
      const resDir = path.join(this.tempDir, res.name);
      fs.mkdirSync(resDir, { recursive: true });

      const outPath = path.join(resDir, `video_${res.name}.mp4`);
      command
        .output(outPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${res.width}x${res.height}`)
        .videoBitrate(res.bitrate)
        .outputOptions([
          "-threads 2",
          "-preset fast",
          "-profile:v main",
          "-crf 20",
          "-movflags +faststart",
        ]);
    });

    audioTracks.forEach((track, index) => {
      const lang = track.language || `audio${index}`;
      const audioPath = path.join(audioBaseDir, `audio_${lang}.mp4`);
      command
        .output(audioPath)
        .noVideo()
        .audioCodec("aac")
        .audioBitrate("128k")
        .outputOptions([
          `-map 0:a:${index}`,
          ...(track.language
            ? [`-metadata:s:a:0 language=${track.language}`]
            : []),
        ]);

      audioTrackData.push({
        lang,
        path: audioPath,
        name: track.language
          ? `${track.language} Audio`
          : `Audio Track ${index + 1}`,
        isDefault: index === 0,
      });
    });
    await new Promise<void>((resolve, reject) => {
      command
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    return {
      videoPaths,
      audioTrackData,
      resolutions: applicableResulation,
    };
  }

  private async getVideoMetadata(): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(
        this.inputVideo,
        (err: Error, metadata: ffmpeg.FfprobeData) => {
          if (err) return reject(err);

          const videoStream = metadata.streams.find(
            (s) => s.codec_type === "video"
          );
          if (!videoStream) {
            return reject(new Error("No video stream found"));
          }

          const audioTracks = metadata.streams
            .filter((stream) => stream.codec_type === "audio")
            .map((stream, index) => ({
              index,
              language: stream.tags?.language,
              codec: stream.codec_name as string,
              channels: stream.channels as number,
              sample_rate: stream.sample_rate as number,
            }));

          resolve({
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            duration: parseFloat(videoStream.duration || "0"),
            audioTracks,
          });
        }
      );
    });
  }

  private selectResolutions(width: number): ResolutionProfile[] {
    const selectedResolutions = RESOLUTION_PROFILES.filter(
      (res) => width >= res.width
    );
    if (selectedResolutions.length === 0) {
      throw new Error("No suitable resolutions found for input video");
    }
    return selectedResolutions;
  }
}


*/
