import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

// Main files table - stores all uploaded files
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  filetype: varchar('filetype', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  r2Key: varchar('r2_key', { length: 500 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(), // 'raw_image', 'video', 'other'
  status: varchar('status', { length: 50 }).notNull().default('uploaded'), // 'uploaded', 'processing', 'processed', 'failed'
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Raw image files table - stores metadata for RAW image files
export const rawImages = pgTable('raw_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  cameraMake: varchar('camera_make', { length: 100 }),
  cameraModel: varchar('camera_model', { length: 100 }),
  lensModel: varchar('lens_model', { length: 100 }),
  iso: integer('iso'),
  aperture: varchar('aperture', { length: 20 }),
  shutterSpeed: varchar('shutter_speed', { length: 20 }),
  focalLength: varchar('focal_length', { length: 20 }),
  whiteBalance: varchar('white_balance', { length: 50 }),
  exposureMode: varchar('exposure_mode', { length: 50 }),
  meteringMode: varchar('metering_mode', { length: 50 }),
  flash: boolean('flash'),
  imageWidth: integer('image_width'),
  imageHeight: integer('image_height'),
  orientation: integer('orientation'),
  gpsLatitude: varchar('gps_latitude', { length: 50 }),
  gpsLongitude: varchar('gps_longitude', { length: 50 }),
  gpsAltitude: varchar('gps_altitude', { length: 50 }),
  dateTimeOriginal: timestamp('datetime_original'),
  dateTimeDigitized: timestamp('datetime_digitized'),
  software: varchar('software', { length: 200 }),
  artist: varchar('artist', { length: 200 }),
  copyright: varchar('copyright', { length: 200 }),
  exifData: jsonb('exif_data'), // Store full EXIF data as JSON
  processingSettings: jsonb('processing_settings'), // Store processing parameters
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Converted files table - stores info about processed/converted files
export const convertedFiles = pgTable('converted_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalFileId: uuid('original_file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  convertedFrom: varchar('converted_from', { length: 50 }).notNull(), // 'raw_image', 'video'
  filename: varchar('filename', { length: 255 }).notNull(),
  filetype: varchar('filetype', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  r2Key: varchar('r2_key', { length: 500 }).notNull().unique(),
  format: varchar('format', { length: 20 }).notNull(), // 'jpg', 'png', 'webp', 'mp4', 'webm', etc.
  quality: integer('quality'), // For images: 1-100, for videos: bitrate
  dimensions: jsonb('dimensions'), // { width: number, height: number }
  conversionSettings: jsonb('conversion_settings'), // Store conversion parameters
  processingTime: integer('processing_time'), // Processing time in milliseconds
  status: varchar('status', { length: 50 }).notNull().default('processing'), // 'processing', 'completed', 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Video files table - stores metadata for video files and m3u8 playlists
export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  duration: integer('duration'), // Duration in seconds
  width: integer('width'),
  height: integer('height'),
  frameRate: varchar('frame_rate', { length: 20 }),
  bitrate: integer('bitrate'),
  codec: varchar('codec', { length: 50 }),
  audioCodec: varchar('audio_codec', { length: 50 }),
  audioChannels: integer('audio_channels'),
  audioSampleRate: integer('audio_sample_rate'),
  hasAudio: boolean('has_audio').default(false),
  hasVideo: boolean('has_video').default(true),
  orientation: integer('orientation'),
  metadata: jsonb('metadata'), // Store full video metadata as JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// M3U8 playlists table - stores HLS playlist information
export const m3u8Playlists = pgTable('m3u8_playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  playlistType: varchar('playlist_type', { length: 50 }).notNull(), // 'master', 'media'
  filename: varchar('filename', { length: 255 }).notNull(),
  r2Key: varchar('r2_key', { length: 500 }).notNull().unique(),
  targetDuration: integer('target_duration'),
  version: integer('version'),
  sequence: integer('sequence'),
  discontinuitySequence: integer('discontinuity_sequence'),
  endList: boolean('end_list').default(false),
  independentSegments: boolean('independent_segments').default(false),
  playlistContent: text('playlist_content').notNull(), // The actual m3u8 content
  segmentCount: integer('segment_count').default(0),
  totalDuration: integer('total_duration'), // Total duration in seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Video segments table - stores individual video segments for HLS
export const videoSegments = pgTable('video_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  playlistId: uuid('playlist_id').notNull().references(() => m3u8Playlists.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  r2Key: varchar('r2_key', { length: 500 }).notNull().unique(),
  duration: integer('duration').notNull(), // Duration in seconds
  sequence: integer('sequence').notNull(),
  size: integer('size').notNull(),
  bitrate: integer('bitrate'),
  resolution: varchar('resolution', { length: 20 }), // e.g., "1920x1080"
  codec: varchar('codec', { length: 50 }),
  isDiscontinuity: boolean('is_discontinuity').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Processing jobs table - tracks file processing status
export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  jobType: varchar('job_type', { length: 50 }).notNull(), // 'raw_image_processing', 'video_transcoding', 'hls_generation'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  priority: integer('priority').default(0),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  errorMessage: text('error_message'),
  processingStartedAt: timestamp('processing_started_at'),
  processingCompletedAt: timestamp('processing_completed_at'),
  processingTime: integer('processing_time'), // Processing time in milliseconds
  settings: jsonb('settings'), // Job-specific settings
  result: jsonb('result'), // Job result data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type RawImage = typeof rawImages.$inferSelect;
export type NewRawImage = typeof rawImages.$inferInsert;

export type ConvertedFile = typeof convertedFiles.$inferSelect;
export type NewConvertedFile = typeof convertedFiles.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type M3U8Playlist = typeof m3u8Playlists.$inferSelect;
export type NewM3U8Playlist = typeof m3u8Playlists.$inferInsert;

export type VideoSegment = typeof videoSegments.$inferSelect;
export type NewVideoSegment = typeof videoSegments.$inferInsert;

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
