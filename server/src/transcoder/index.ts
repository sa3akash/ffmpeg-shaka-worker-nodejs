import { FFmpegTranscoder } from "./ffmpegEncoder";
import path from "node:path";
import { SubtitlesEncoder } from "./subtitleEncoder";
import { ShakaPackager } from "./ShakaPackager";

export class TranscodeVideo {
  private tempDir: string;
  private inputVideo: string;
  private subtileDir: string;
  private outputDirEncripted: string;
  private outputNoEncripted: string;

  constructor(videoKey: string, outputDir: string) {
    const projectDir = path.join(__dirname, `../${videoKey}`);
    this.tempDir = path.join(projectDir, "temp");

    this.inputVideo = path.join(projectDir, "input.mkv");
    this.subtileDir = path.join(projectDir, "subtitles");

    const outputDirMain = path.join(outputDir, videoKey);

    this.outputDirEncripted = path.join(outputDirMain, "lock");
    this.outputNoEncripted = path.join(outputDirMain, "free");
  }

  public async transcode() {
    const ffmpegTranscoder = new FFmpegTranscoder(
      this.inputVideo,
      this.tempDir
    );

    console.log(`Start processing...`);

    const { audioTrackData, resolutions, videoPaths } =
      await ffmpegTranscoder.videoTranscode();

    const subtileEncoder = new SubtitlesEncoder(this.subtileDir);
    const subtilesData = await subtileEncoder.findSubtitles();

    const shaka = new ShakaPackager(
      this.tempDir,
      resolutions,
      audioTrackData,
      subtilesData
    );

    await shaka.packageUniversal(this.outputDirEncripted, true);
  }
}
