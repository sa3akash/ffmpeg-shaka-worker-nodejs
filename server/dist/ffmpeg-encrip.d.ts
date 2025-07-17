type SubtitleTrack = {
    path: string;
    lang: string;
};
type AudioTrack = {
    path: string;
    lang: string;
};
interface ClearKey {
    key_id: string;
    key: string;
}
export declare class VideoTranscoder {
    private inputPath;
    private outputBaseDir;
    private resolutions;
    constructor(inputPath: string, outputBaseDir: string);
    transcode(): Promise<void>;
    generateClearKey(targetDir: string): Promise<ClearKey>;
    packageUniversalWithClearKey(targetDir: string, clearkey: ClearKey, subtitles?: SubtitleTrack[], audioTracks?: AudioTrack[]): Promise<void>;
    packageWithoutEncryption(targetDir: string, subtitles?: SubtitleTrack[], audioTracks?: AudioTrack[]): Promise<void>;
}
export {};
