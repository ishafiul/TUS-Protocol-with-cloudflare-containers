# CF Container App

This container provides video processing with MP4 conversion, adaptive streaming, and Cloudflare R2 integration.

## Features

- **Video Processing**: MP4 conversion with multiple resolutions (360p, 480p, 720p, 1080p)
- **Adaptive Streaming**: HLS M3U8 playlists for Mux player compatibility
- **R2 Integration**: All files stored in Cloudflare R2 with proper caching
- **Database Service**: PostgreSQL integration for metadata storage

## Database Service

The `SimpleDatabaseService` class provides methods for:

- **File Operations**: Get files by R2 key, update file status
- **Raw Image Processing**: Store EXIF data and processing settings
- **Converted Files**: Track processed/converted file information
- **Video Processing**: Store video metadata and HLS playlists
- **M3U8 Playlists**: Manage HLS playlist information
- **Video Segments**: Store individual video segments
- **Processing Jobs**: Track file processing job status

## R2 Service

The `R2Service` class handles:

- **File Upload**: Upload MP4 videos and M3U8 playlists to R2
- **File Retrieval**: Get files from R2 with fallback to database
- **URL Generation**: Generate public URLs for streaming

## Environment Variables

- `POSTGRES_CONNECTION_STRING`: Neon database connection string
- `R2_BUCKET_NAME`: R2 bucket name (default: attachments)
- `R2_ENDPOINT`: R2 endpoint URL
- `R2_ACCESS_KEY_ID`: R2 access key ID
- `R2_SECRET_ACCESS_KEY`: R2 secret access key

## API Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /process` - Process information
- `GET /db/test` - Test database connection

### Video Processing
- `POST /process` - Process video files with MP4 conversion and adaptive streaming

**Note**: Streaming endpoints are handled by the main Cloudflare Worker, not the container.

## Usage

```typescript
import { SimpleDatabaseService } from './db/simpleDatabaseService';

const db = new SimpleDatabaseService();

// Get file by R2 key
const file = await db.getFileByR2Key('path/to/file.jpg');

// Update file status
await db.updateFileStatus(file.id, 'processed', new Date());

// Store RAW image processing results
await db.storeRawImageProcessingResult(fileId, exifData, processingSettings);

// Store video processing results
await db.storeVideoProcessingResult(fileId, videoMetadata, processingSettings);
```

## Database Schema

The container uses the same database schema as the main worker, including:

- `files` - Main files table
- `raw_images` - RAW image metadata
- `converted_files` - Processed file information
- `videos` - Video metadata
- `m3u8_playlists` - HLS playlist information
- `video_segments` - Video segment data
- `processing_jobs` - Job tracking
