import { neon } from '@neondatabase/serverless';

export class SimpleDatabaseService {
  public sql: ReturnType<typeof neon>;

  constructor() {
    this.sql = neon(process.env.POSTGRES_CONNECTION_STRING!);
  }

  // File operations
  async getFileByR2Key(r2Key: string) {
    const result = await this.sql`
      SELECT * FROM files 
      WHERE r2_key = ${r2Key}
      LIMIT 1
    ` as any[];
    return result[0] || null;
  }

  async updateFileStatus(id: string, status: string, processedAt?: Date) {
    const result = await this.sql`
      UPDATE files 
      SET status = ${status}, 
          processed_at = ${processedAt || new Date()},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  // Raw image operations
  async createRawImage(fileId: string, exifData: any, processingSettings: any) {
    const result = await this.sql`
      INSERT INTO raw_images (
        file_id, exif_data, processing_settings, created_at, updated_at
      ) VALUES (
        ${fileId}, ${JSON.stringify(exifData)}, ${JSON.stringify(processingSettings)}, NOW(), NOW()
      )
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async updateRawImage(fileId: string, exifData: any, processingSettings: any) {
    const result = await this.sql`
      UPDATE raw_images 
      SET exif_data = ${JSON.stringify(exifData)},
          processing_settings = ${JSON.stringify(processingSettings)},
          updated_at = NOW()
      WHERE file_id = ${fileId}
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async getRawImageByFileId(fileId: string) {
    const result = await this.sql`
      SELECT * FROM raw_images 
      WHERE file_id = ${fileId}
      LIMIT 1
    ` as any[];
    return result[0] || null;
  }

  // Converted file operations
  async createConvertedFile(convertedFileData: any) {
    const result = await this.sql`
      INSERT INTO converted_files (
        id, original_file_id, converted_from, filename, filetype, size, r2_key,
        format, quality, dimensions, conversion_settings, processing_time, status,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${convertedFileData.originalFileId}, ${convertedFileData.convertedFrom},
        ${convertedFileData.filename}, ${convertedFileData.filetype}, ${convertedFileData.size},
        ${convertedFileData.r2Key}, ${convertedFileData.format}, ${convertedFileData.quality},
        ${JSON.stringify(convertedFileData.dimensions)}, ${JSON.stringify(convertedFileData.conversionSettings)},
        ${convertedFileData.processingTime}, ${convertedFileData.status}, NOW(), NOW()
      )
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async getConvertedFilesByOriginalId(originalFileId: string) {
    return await this.sql`
      SELECT * FROM converted_files 
      WHERE original_file_id = ${originalFileId}
      ORDER BY created_at DESC
    ` as any[];
  }

  // Video operations
  async createVideo(fileId: string, videoMetadata: any) {
    const result = await this.sql`
      INSERT INTO videos (
        id, file_id, duration, width, height, frame_rate, bitrate, codec,
        audio_codec, audio_channels, audio_sample_rate, has_audio, has_video,
        orientation, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${fileId}, ${videoMetadata.duration}, ${videoMetadata.width},
        ${videoMetadata.height}, ${videoMetadata.frameRate}, ${videoMetadata.bitrate},
        ${videoMetadata.codec}, ${videoMetadata.audioCodec}, ${videoMetadata.audioChannels},
        ${videoMetadata.audioSampleRate}, ${videoMetadata.hasAudio}, ${videoMetadata.hasVideo},
        ${videoMetadata.orientation}, ${JSON.stringify(videoMetadata.metadata || {})}, NOW(), NOW()
      )
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async updateVideo(fileId: string, videoMetadata: any) {
    const result = await this.sql`
      UPDATE videos 
      SET duration = ${videoMetadata.duration},
          width = ${videoMetadata.width},
          height = ${videoMetadata.height},
          frame_rate = ${videoMetadata.frameRate},
          bitrate = ${videoMetadata.bitrate},
          codec = ${videoMetadata.codec},
          audio_codec = ${videoMetadata.audioCodec},
          audio_channels = ${videoMetadata.audioChannels},
          audio_sample_rate = ${videoMetadata.audioSampleRate},
          has_audio = ${videoMetadata.hasAudio},
          has_video = ${videoMetadata.hasVideo},
          orientation = ${videoMetadata.orientation},
          metadata = ${JSON.stringify(videoMetadata.metadata || {})},
          updated_at = NOW()
      WHERE file_id = ${fileId}
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async getVideoByFileId(fileId: string) {
    const result = await this.sql`
      SELECT * FROM videos 
      WHERE file_id = ${fileId}
      LIMIT 1
    ` as any[];
    return result[0] || null;
  }

  // M3U8 playlist operations
  async createM3U8Playlist(playlistData: any) {
    const result = await this.sql`
      INSERT INTO m3u8_playlists (
        id, video_id, playlist_type, filename, r2_key, target_duration,
        version, sequence, discontinuity_sequence, end_list, independent_segments,
        playlist_content, segment_count, total_duration, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${playlistData.videoId}, ${playlistData.playlistType},
        ${playlistData.filename}, ${playlistData.r2Key}, ${playlistData.targetDuration},
        ${playlistData.version}, ${playlistData.sequence}, ${playlistData.discontinuitySequence},
        ${playlistData.endList}, ${playlistData.independentSegments}, ${playlistData.playlistContent},
        ${playlistData.segmentCount}, ${playlistData.totalDuration}, NOW(), NOW()
      )
      RETURNING *
    ` as any[];
    return result[0] || null;
  }

  async getM3U8PlaylistsByVideoId(videoId: string) {
    return await this.sql`
      SELECT * FROM m3u8_playlists 
      WHERE video_id = ${videoId}
      ORDER BY created_at DESC
    ` as any[];
  }

  // Video segment operations
  async createVideoSegments(segmentsData: any[]) {
    if (segmentsData.length === 0) return [];
    
    const values = segmentsData.map(segment => 
      `(gen_random_uuid(), '${segment.playlistId}', ${segment.duration}, '${segment.filename}', ${segment.size}, '${segment.r2Key}', ${segment.sequence}, ${segment.bitrate || 'NULL'}, '${segment.codec || ''}', '${segment.resolution || ''}', ${segment.isDiscontinuity || false}, NOW())`
    ).join(', ');

    const result = await this.sql`
      INSERT INTO video_segments (
        id, playlist_id, duration, filename, size, r2_key, sequence,
        bitrate, codec, resolution, is_discontinuity, created_at
      ) VALUES ${values}
      RETURNING *
    ` as any[];
    return result;
  }

  async getVideoSegmentsByPlaylistId(playlistId: string) {
    return await this.sql`
      SELECT * FROM video_segments 
      WHERE playlist_id = ${playlistId}
      ORDER BY sequence ASC
    ` as any[];
  }

  // Processing job operations
  async getProcessingJobsByFileId(fileId: string) {
    return await this.sql`
      SELECT * FROM processing_jobs 
      WHERE file_id = ${fileId}
      ORDER BY created_at DESC
    ` as any[];
  }

  async updateProcessingJobStatus(id: string, status: string, result?: any, errorMessage?: string) {
    const resultData = await this.sql`
      UPDATE processing_jobs 
      SET status = ${status},
          result = ${result ? JSON.stringify(result) : null},
          error_message = ${errorMessage || null},
          processing_completed_at = ${status === 'completed' || status === 'failed' ? new Date() : null},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    ` as any[];
    return resultData[0] || null;
  }

  // Complex queries for processing
  async getFileWithDetails(fileId: string) {
    const file = await this.sql`
      SELECT * FROM files 
      WHERE id = ${fileId}
      LIMIT 1
    ` as any[];
    
    if (!file[0]) return null;

    const details: any = { file: file[0] };

    if (file[0].category === 'raw_image') {
      const rawImage = await this.getRawImageByFileId(fileId);
      const convertedFiles = await this.getConvertedFilesByOriginalId(fileId);
      details.rawImage = rawImage;
      details.convertedFiles = convertedFiles;
    } else if (file[0].category === 'video') {
      const video = await this.getVideoByFileId(fileId);
      if (video) {
        const playlists = await this.getM3U8PlaylistsByVideoId(video.id);
        details.video = video;
        details.playlists = playlists;
      }
    }

    const processingJobs = await this.getProcessingJobsByFileId(fileId);
    details.processingJobs = processingJobs;

    return details;
  }

  // Processing workflow helpers
  async startProcessingJob(jobId: string) {
    return await this.updateProcessingJobStatus(jobId, 'processing', undefined, undefined);
  }

  async completeProcessingJob(jobId: string, result: any) {
    return await this.updateProcessingJobStatus(jobId, 'completed', result, undefined);
  }

  async failProcessingJob(jobId: string, errorMessage: string) {
    return await this.updateProcessingJobStatus(jobId, 'failed', undefined, errorMessage);
  }

  // File processing result storage
  async storeRawImageProcessingResult(fileId: string, exifData: any, processingSettings: any) {
    const existing = await this.getRawImageByFileId(fileId);
    if (existing) {
      return await this.updateRawImage(fileId, exifData, processingSettings);
    } else {
      return await this.createRawImage(fileId, exifData, processingSettings);
    }
  }

  async storeVideoProcessingResult(fileId: string, videoMetadata: any, processingSettings: any) {
    const existing = await this.getVideoByFileId(fileId);
    const metadata = { ...videoMetadata.metadata, processingSettings };
    
    if (existing) {
      return await this.updateVideo(fileId, { ...videoMetadata, metadata });
    } else {
      return await this.createVideo(fileId, { ...videoMetadata, metadata });
    }
  }

  async storeConvertedFileResult(originalFileId: string, convertedFileData: any) {
    return await this.createConvertedFile(convertedFileData);
  }

  async storeHLSResult(videoId: string, playlistData: any, segments: any[]) {
    const playlist = await this.createM3U8Playlist(playlistData);
    const videoSegments = await this.createVideoSegments(
      segments.map(segment => ({
        ...segment,
        playlistId: playlist.id
      }))
    );
    
    return {
      playlist,
      segments: videoSegments
    };
  }
}