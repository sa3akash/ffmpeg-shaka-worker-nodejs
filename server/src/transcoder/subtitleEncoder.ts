import fs from "fs/promises";
import path from "path";
import { languageMap, SubtitleTrack } from "./utils";


export class SubtitlesEncoder {
  constructor(private subtitlesDir: string) {}

  // Convert .srt to .vtt
  private async convertSrtToVtt(file: string) {
    const inputPath = path.join(this.subtitlesDir, file);
    const outputPath = inputPath.replace(/\.srt$/i, ".vtt");

    const content = await fs.readFile(inputPath, "utf-8");
    const vttContent = "WEBVTT\n\n" + content.replace(/\r?\n/g, "\n");

    await fs.writeFile(outputPath, vttContent, "utf-8");
    return outputPath;
  }

  public async findSubtitles() :Promise<SubtitleTrack[]>{
    const files = await fs.readdir(this.subtitlesDir);

    // Convert all .srt files to .vtt if not already converted
    for (const file of files) {
      if (file.endsWith(".srt")) {
        const vttFile = file.replace(/\.srt$/i, ".vtt");
        const vttExists = files.includes(vttFile);
        if (!vttExists) {
          await this.convertSrtToVtt(file);
        }
      }
    }

    // Refresh the list after potential conversions
    const updatedFiles = await fs.readdir(this.subtitlesDir);

    // Return all .vtt subtitles
    return updatedFiles
      .filter((file) => file.endsWith(".vtt"))
      .map((file) => {
        const lang = file.split(".")[0].toLowerCase();
        return {
          path: path.join(this.subtitlesDir, file),
          lang,
          name: languageMap[lang] || lang.toUpperCase(),
        };
      });
  }
}
