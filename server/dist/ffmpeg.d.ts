export declare class VideoTranscoder {
    private inputPath;
    private outputBaseDir;
    private resolutions;
    constructor(inputPath: string, outputBaseDir: string);
    transcode(): Promise<void>;
    packageHLS(targetDir: string): Promise<void>;
    packageDASH(targetDir: string): Promise<void>;
}
