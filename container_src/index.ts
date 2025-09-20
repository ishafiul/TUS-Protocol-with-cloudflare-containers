import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { SimpleDatabaseService } from './db/simpleDatabaseService';
import { R2Service } from './services/r2Service';

const app = new Hono();

// Add CORS middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.get('/health', (c) => {
  return c.json({ status: 'UP' });
});

app.get('/process', (c) => {
  return c.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.MESSAGE || 'No message set',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/db/test', async (c) => {
  try {
    const db = new SimpleDatabaseService();
    
    // Test basic connection
    const result = await db.sql`SELECT NOW() as current_time` as any[];
    
    return c.json({
      success: true,
      message: 'Container database connection successful',
      timestamp: result[0]?.current_time,
      container: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    console.error('Container database test error:', error);
    return c.json({
      success: false,
      message: 'Container database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      container: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }, 500);
  }
});

// File processing endpoint
app.post('/process', async (c) => {
  const db = new SimpleDatabaseService();
  
  try {
    const body = await c.req.json();
    const { fileInfo, category, timestamp, retryCount } = body;
    
    console.log(`🔄 Processing file: ${fileInfo.filename} (${category})`);
    console.log(`📄 File details:`, {
      filename: fileInfo.filename,
      filetype: fileInfo.filetype,
      size: fileInfo.size,
      r2Key: fileInfo.r2Key,
      uploadedAt: fileInfo.uploadedAt,
      category,
      retryCount: retryCount || 0
    });
    
    // Get file from database
    const file = await db.getFileByR2Key(fileInfo.r2Key);
    if (!file) {
      throw new Error(`File not found in database: ${fileInfo.r2Key}`);
    }
    
    console.log(`📁 Found file in database: ${file.id}`);
    
    // Get processing job
    const processingJobs = await db.getProcessingJobsByFileId(file.id) as any[];
    const currentJob = processingJobs.find((job: any) => job.status === 'pending' || job.status === 'processing');
    
    if (currentJob) {
      // Mark job as processing
      await db.startProcessingJob(currentJob.id);
    }
    
    // Simulate processing time based on file category
    let processingTime = 0;
    switch (category) {
      case 'raw_image':
        processingTime = 2000; // 2s for image processing
        break;
      case 'video':
        processingTime = 5000; // 5s for video processing
        break;
      default:
        processingTime = 1000;
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;
    
    if (!success) {
      const errorMessage = `Simulated processing failure for ${category} file`;
      if (currentJob) {
        await db.failProcessingJob(currentJob.id, errorMessage);
      }
      throw new Error(errorMessage);
    }
    
    // Update file status
    await db.updateFileStatus(file.id, 'processed', new Date());
    
    // Store processing results based on category
    let processingResult: any = {
      processedAt: new Date().toISOString(),
      processingTimeMs: processingTime,
      extractedMetadata: {
        processedBy: 'container-processor-v1',
        fileCategory: category,
        processingNode: `${process.platform}-${process.arch}`,
        timestamp: new Date().toISOString()
      }
    };
    
    if (category === 'raw_image') {
      // Simulate RAW image processing
      const exifData = {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm f/2.8L IS USM',
        iso: 100,
        aperture: 'f/2.8',
        shutterSpeed: '1/125s',
        focalLength: '50mm',
        whiteBalance: 'Auto',
        exposureMode: 'Manual',
        meteringMode: 'Evaluative',
        flash: false,
        imageWidth: 8192,
        imageHeight: 5464,
        orientation: 1,
        gpsLatitude: '37.7749',
        gpsLongitude: '-122.4194',
        gpsAltitude: '10m',
        dateTimeOriginal: new Date().toISOString(),
        software: 'Container Processor v1.0',
        artist: 'Container Service',
        copyright: '© 2024'
      };
      
      const processingSettings = {
        whiteBalanceAdjustment: 0,
        exposureCompensation: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        noiseReduction: 'medium',
        colorProfile: 'sRGB'
      };
      
      await db.storeRawImageProcessingResult(file.id, exifData, processingSettings);
      
      // Create converted file record (simulated)
      const convertedFile = await db.storeConvertedFileResult(file.id, {
        originalFileId: file.id,
        convertedFrom: 'raw_image',
        filename: fileInfo.filename.replace(/\.[^/.]+$/, '.jpg'),
        filetype: 'image/jpeg',
        size: Math.floor(fileInfo.size * 0.3), // Simulated smaller JPEG
        r2Key: fileInfo.r2Key.replace(/\.[^/.]+$/, '.jpg'),
        format: 'jpg',
        quality: 95,
        dimensions: { width: 4096, height: 2732 },
        conversionSettings: processingSettings,
        processingTime: processingTime,
        status: 'completed'
      });
      
      processingResult.convertedFile = convertedFile;
      processingResult.exifData = exifData;
      
    } else if (category === 'video') {
      // Video processing with MP4 conversion and multiple resolutions
      const r2Service = new R2Service();
      
      const originalVideoMetadata = {
        duration: 120, // 2 minutes
        width: 1920,
        height: 1080,
        frameRate: '30/1',
        bitrate: 5000000,
        codec: 'h264',
        audioCodec: 'aac',
        audioChannels: 2,
        audioSampleRate: 48000,
        hasAudio: true,
        hasVideo: true,
        orientation: 0
      };
      
      // Store original video metadata
      await db.storeVideoProcessingResult(file.id, originalVideoMetadata, {});
      
      // Define resolution profiles for adaptive streaming
      const resolutionProfiles = [
        { name: '360p', width: 640, height: 360, bitrate: 800000, bandwidth: 800000 },
        { name: '480p', width: 854, height: 480, bitrate: 1400000, bandwidth: 1400000 },
        { name: '720p', width: 1280, height: 720, bitrate: 2800000, bandwidth: 2800000 },
        { name: '1080p', width: 1920, height: 1080, bitrate: 5000000, bandwidth: 5000000 }
      ];
      
      // Simulate MP4 conversion for each resolution and upload to R2
      const convertedFiles = [];
      for (const profile of resolutionProfiles) {
        // Simulate video file content (in real implementation, this would be actual video data)
        const simulatedVideoContent = Buffer.from(`Simulated MP4 content for ${profile.name} resolution`);
        
        const r2Key = fileInfo.r2Key.replace(/\.[^/.]+$/, `_${profile.name}.mp4`);
        
        // Upload to R2
        const r2Url = await r2Service.uploadVideoFile(r2Key, simulatedVideoContent);
        
        const convertedFile = await db.storeConvertedFileResult(file.id, {
          originalFileId: file.id,
          convertedFrom: 'video',
          filename: `${fileInfo.filename.replace(/\.[^/.]+$/, '')}_${profile.name}.mp4`,
          filetype: 'video/mp4',
          size: Math.floor(fileInfo.size * (profile.bitrate / 5000000)), // Simulate size based on bitrate
          r2Key: r2Key,
          format: 'mp4',
          quality: profile.bitrate,
          dimensions: { width: profile.width, height: profile.height },
          conversionSettings: {
            codec: 'h264',
            profile: 'high',
            level: '4.0',
            bitrate: profile.bitrate,
            audioBitrate: 128000,
            frameRate: 30
          },
          processingTime: processingTime,
          status: 'completed'
        });
        convertedFiles.push(convertedFile);
      }
      
      // Create master M3U8 playlist for adaptive streaming
      const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-STREAM-INF:BANDWIDTH=${resolutionProfiles[0].bandwidth},RESOLUTION=${resolutionProfiles[0].width}x${resolutionProfiles[0].height},CODECS="avc1.64001f,mp4a.40.2",NAME="${resolutionProfiles[0].name}"
${resolutionProfiles[0].name}.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=${resolutionProfiles[1].bandwidth},RESOLUTION=${resolutionProfiles[1].width}x${resolutionProfiles[1].height},CODECS="avc1.64001f,mp4a.40.2",NAME="${resolutionProfiles[1].name}"
${resolutionProfiles[1].name}.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=${resolutionProfiles[2].bandwidth},RESOLUTION=${resolutionProfiles[2].width}x${resolutionProfiles[2].height},CODECS="avc1.64001f,mp4a.40.2",NAME="${resolutionProfiles[2].name}"
${resolutionProfiles[2].name}.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=${resolutionProfiles[3].bandwidth},RESOLUTION=${resolutionProfiles[3].width}x${resolutionProfiles[3].height},CODECS="avc1.64001f,mp4a.40.2",NAME="${resolutionProfiles[3].name}"
${resolutionProfiles[3].name}.m3u8`;
      
      // Create individual M3U8 playlists for each resolution
      const mediaPlaylists = [];
      for (let i = 0; i < resolutionProfiles.length; i++) {
        const profile = resolutionProfiles[i];
        const segmentDuration = 10; // 10 seconds per segment
        const segmentCount = Math.ceil(originalVideoMetadata.duration / segmentDuration);
        
        let mediaPlaylistContent = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-INDEPENDENT-SEGMENTS

`;
        
        // Generate segments for this resolution
        for (let j = 0; j < segmentCount; j++) {
          const segmentDurationActual = j === segmentCount - 1 ? 
            (originalVideoMetadata.duration % segmentDuration) || segmentDuration : 
            segmentDuration;
          
          mediaPlaylistContent += `#EXTINF:${segmentDurationActual.toFixed(1)},
${profile.name}_segment${j.toString().padStart(3, '0')}.ts
`;
        }
        
        mediaPlaylistContent += `#EXT-X-ENDLIST`;
        
        // Store media playlist
        const mediaPlaylistData = {
          videoId: '', // Will be set after video creation
          playlistType: 'media',
          filename: `${profile.name}.m3u8`,
          r2Key: fileInfo.r2Key.replace(/\.[^/.]+$/, `/${profile.name}.m3u8`),
          targetDuration: segmentDuration,
          version: 6,
          sequence: 0,
          discontinuitySequence: 0,
          endList: true,
          independentSegments: true,
          playlistContent: mediaPlaylistContent,
          segmentCount: segmentCount,
          totalDuration: originalVideoMetadata.duration
        };
        
        mediaPlaylists.push(mediaPlaylistData);
      }
      
      // Get video record to get video ID
      const video = await db.getVideoByFileId(file.id);
      if (video) {
        // Upload master playlist to R2
        const masterR2Key = fileInfo.r2Key.replace(/\.[^/.]+$/, '/master.m3u8');
        const masterR2Url = await r2Service.uploadM3U8File(masterR2Key, masterPlaylistContent);
        
        // Store master playlist in database
        const masterPlaylistData = {
          videoId: video.id,
          playlistType: 'master',
          filename: 'master.m3u8',
          r2Key: masterR2Key,
          targetDuration: 10,
          version: 6,
          sequence: 0,
          discontinuitySequence: 0,
          endList: false,
          independentSegments: true,
          playlistContent: masterPlaylistContent,
          segmentCount: 0,
          totalDuration: originalVideoMetadata.duration
        };
        
        const masterPlaylist = await db.createM3U8Playlist(masterPlaylistData);
        
        // Upload media playlists to R2 and store in database
        const storedMediaPlaylists = [];
        for (const mediaPlaylistData of mediaPlaylists) {
          mediaPlaylistData.videoId = video.id;
          
          // Upload to R2
          const mediaR2Url = await r2Service.uploadM3U8File(mediaPlaylistData.r2Key, mediaPlaylistData.playlistContent);
          
          // Store in database
          const mediaPlaylist = await db.createM3U8Playlist(mediaPlaylistData);
          storedMediaPlaylists.push(mediaPlaylist);
        }
        
        processingResult.masterPlaylist = {
          ...masterPlaylist,
          r2Url: masterR2Url
        };
        processingResult.mediaPlaylists = storedMediaPlaylists.map(playlist => ({
          ...playlist,
          r2Url: r2Service.getPublicUrl(playlist.r2Key)
        }));
      }
      
      processingResult.videoMetadata = originalVideoMetadata;
      processingResult.convertedFiles = convertedFiles;
      processingResult.resolutionProfiles = resolutionProfiles;
    }
    
    // Complete processing job
    if (currentJob) {
      await db.completeProcessingJob(currentJob.id, processingResult);
    }
    
    const result = {
      success: true,
      fileInfo,
      category,
      fileId: file.id,
      processingResult
    };
    
    console.log(`✅ File processed successfully: ${fileInfo.filename} (${processingTime}ms)`);
    
    return c.json(result);
    
  } catch (error) {
    console.error(`❌ File processing failed:`, error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

const port = parseInt(process.env.PORT || '8080', 10);

console.log(`Starting Node.js TypeScript container on port ${port}`);

// Start the server
serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running on port ${port}`);

export default app;
