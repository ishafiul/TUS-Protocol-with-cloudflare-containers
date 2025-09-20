import { neon } from '@neondatabase/serverless';
export declare class SimpleDatabaseService {
    sql: ReturnType<typeof neon>;
    constructor();
    getFileByR2Key(r2Key: string): Promise<any>;
    updateFileStatus(id: string, status: string, processedAt?: Date): Promise<any>;
    createRawImage(fileId: string, exifData: any, processingSettings: any): Promise<any>;
    updateRawImage(fileId: string, exifData: any, processingSettings: any): Promise<any>;
    getRawImageByFileId(fileId: string): Promise<any>;
    createConvertedFile(convertedFileData: any): Promise<any>;
    getConvertedFilesByOriginalId(originalFileId: string): Promise<any[]>;
    createVideo(fileId: string, videoMetadata: any): Promise<any>;
    updateVideo(fileId: string, videoMetadata: any): Promise<any>;
    getVideoByFileId(fileId: string): Promise<any>;
    createM3U8Playlist(playlistData: any): Promise<any>;
    getM3U8PlaylistsByVideoId(videoId: string): Promise<any[]>;
    createVideoSegments(segmentsData: any[]): Promise<any[]>;
    getVideoSegmentsByPlaylistId(playlistId: string): Promise<any[]>;
    getProcessingJobsByFileId(fileId: string): Promise<any[]>;
    updateProcessingJobStatus(id: string, status: string, result?: any, errorMessage?: string): Promise<any>;
    getFileWithDetails(fileId: string): Promise<any>;
    startProcessingJob(jobId: string): Promise<any>;
    completeProcessingJob(jobId: string, result: any): Promise<any>;
    failProcessingJob(jobId: string, errorMessage: string): Promise<any>;
    storeRawImageProcessingResult(fileId: string, exifData: any, processingSettings: any): Promise<any>;
    storeVideoProcessingResult(fileId: string, videoMetadata: any, processingSettings: any): Promise<any>;
    storeConvertedFileResult(originalFileId: string, convertedFileData: any): Promise<any>;
    storeHLSResult(videoId: string, playlistData: any, segments: any[]): Promise<{
        playlist: any;
        segments: any[];
    }>;
}
//# sourceMappingURL=simpleDatabaseService.d.ts.map