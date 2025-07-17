export declare class ShakaPackagerTranscoder {
    private readonly profiles;
    private readonly segmentDuration;
    private readonly encryptionEnabled;
    private readonly outputDir;
    constructor(outputDir: string, encryptionEnabled?: boolean);
    private ensureOutputDir;
    private generateKeyAndKid;
    private transcodeToProfile;
    private packageWithShakaPackager;
    transcodeVideo(inputPath: string, videoId: string): Promise<{
        dashManifest: string;
        hlsManifest: string;
    }>;
}
