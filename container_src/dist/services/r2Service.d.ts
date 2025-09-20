export declare class R2Service {
    private s3Client;
    private bucketName;
    constructor();
    uploadFile(key: string, content: string | Buffer, contentType: string): Promise<string>;
    uploadM3U8File(key: string, content: string): Promise<string>;
    uploadVideoFile(key: string, content: Buffer): Promise<string>;
    getFile(key: string): Promise<Buffer | null>;
    getPublicUrl(key: string): string;
}
//# sourceMappingURL=r2Service.d.ts.map