import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { HonoTypes } from '../type/env';

export class DatabaseService {
  private db: ReturnType<typeof drizzle>;

  constructor(env: HonoTypes['Bindings']) {
    const sql = neon(env.DATABASE_URL);
    this.db = drizzle(sql, { schema });
  }

  getDb() {
    return this.db;
  }

  // File operations
  async createFile(fileData: schema.NewFile) {
    const [file] = await this.db.insert(schema.files).values(fileData).returning();
    return file;
  }

  async getFileById(id: string) {
    const [file] = await this.db.select().from(schema.files).where(eq(schema.files.id, id));
    return file;
  }

  async getFileByR2Key(r2Key: string) {
    const [file] = await this.db.select().from(schema.files).where(eq(schema.files.r2Key, r2Key));
    return file;
  }

  async updateFileStatus(id: string, status: string, processedAt?: Date) {
    const [file] = await this.db
      .update(schema.files)
      .set({ 
        status, 
        processedAt: processedAt || new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.files.id, id))
      .returning();
    return file;
  }

  // Raw image operations
  async createRawImage(rawImageData: schema.NewRawImage) {
    const [rawImage] = await this.db.insert(schema.rawImages).values(rawImageData).returning();
    return rawImage;
  }

  async getRawImageByFileId(fileId: string) {
    const [rawImage] = await this.db
      .select()
      .from(schema.rawImages)
      .where(eq(schema.rawImages.fileId, fileId));
    return rawImage;
  }

  // Converted file operations
  async createConvertedFile(convertedFileData: schema.NewConvertedFile) {
    const [convertedFile] = await this.db.insert(schema.convertedFiles).values(convertedFileData).returning();
    return convertedFile;
  }

  async getConvertedFilesByOriginalId(originalFileId: string) {
    return await this.db
      .select()
      .from(schema.convertedFiles)
      .where(eq(schema.convertedFiles.originalFileId, originalFileId));
  }

  // Video operations
  async createVideo(videoData: schema.NewVideo) {
    const [video] = await this.db.insert(schema.videos).values(videoData).returning();
    return video;
  }

  async getVideoByFileId(fileId: string) {
    const [video] = await this.db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.fileId, fileId));
    return video;
  }

  // M3U8 playlist operations
  async createM3U8Playlist(playlistData: schema.NewM3U8Playlist) {
    const [playlist] = await this.db.insert(schema.m3u8Playlists).values(playlistData).returning();
    return playlist;
  }

  async getM3U8PlaylistsByVideoId(videoId: string) {
    return await this.db
      .select()
      .from(schema.m3u8Playlists)
      .where(eq(schema.m3u8Playlists.videoId, videoId));
  }

  // Video segment operations
  async createVideoSegment(segmentData: schema.NewVideoSegment) {
    const [segment] = await this.db.insert(schema.videoSegments).values(segmentData).returning();
    return segment;
  }

  async getVideoSegmentsByPlaylistId(playlistId: string) {
    return await this.db
      .select()
      .from(schema.videoSegments)
      .where(eq(schema.videoSegments.playlistId, playlistId))
      .orderBy(schema.videoSegments.sequence);
  }

  // Processing job operations
  async createProcessingJob(jobData: schema.NewProcessingJob) {
    const [job] = await this.db.insert(schema.processingJobs).values(jobData).returning();
    return job;
  }

  async getProcessingJobById(id: string) {
    const [job] = await this.db
      .select()
      .from(schema.processingJobs)
      .where(eq(schema.processingJobs.id, id));
    return job;
  }

  async updateProcessingJobStatus(id: string, status: string, result?: any, errorMessage?: string) {
    const [job] = await this.db
      .update(schema.processingJobs)
      .set({ 
        status,
        result,
        errorMessage,
        processingCompletedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(schema.processingJobs.id, id))
      .returning();
    return job;
  }

  async getPendingProcessingJobs(limit = 10) {
    return await this.db
      .select()
      .from(schema.processingJobs)
      .where(eq(schema.processingJobs.status, 'pending'))
      .orderBy(schema.processingJobs.priority, schema.processingJobs.createdAt)
      .limit(limit);
  }

  // Complex queries
  async getFileWithDetails(fileId: string) {
    const file = await this.getFileById(fileId);
    if (!file) return null;

    const details: any = { file };

    if (file.category === 'raw_image') {
      details.rawImage = await this.getRawImageByFileId(fileId);
      details.convertedFiles = await this.getConvertedFilesByOriginalId(fileId);
    } else if (file.category === 'video') {
      details.video = await this.getVideoByFileId(fileId);
      if (details.video) {
        details.playlists = await this.getM3U8PlaylistsByVideoId(details.video.id);
      }
    }

    details.processingJobs = await this.db
      .select()
      .from(schema.processingJobs)
      .where(eq(schema.processingJobs.fileId, fileId));

    return details;
  }
}
