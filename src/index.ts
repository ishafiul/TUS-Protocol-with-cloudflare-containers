
import { HonoTypes } from "./type/env";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { Scalar } from "@scalar/hono-api-reference";
import uploadRoute from "./module/upload/route";
import { ContainerService } from "./services/containerService";
import { DatabaseService } from "./services/databaseService";
import type { QueueMessage } from "./services/queueService";
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import type { Env } from "./type/env";
import type { MessageBatch } from "@cloudflare/workers-types";
export { AttachmentUploadHandler, UploadHandler } from './tus/uploadHandler'
export { MyContainer } from './container/MyContainer'

const app = new OpenAPIHono<HonoTypes>();

app.get("/", async (c) => {
  return c.env.ASSETS.fetch(new Request(c.req.url));
});
app.use("*", cors());
app.openAPIRegistry.registerComponent("securitySchemes", "AUTH", {
  type: "http",
  name: "Authorization",
  scheme: "bearer",
  in: "header",
  description: "Bearer token",
});


app.doc("/docs.json", {
  info: {
    title: "API Documentation",
    version: "v1",
  },
  openapi: "3.1.0",
});

app.get('/docs', Scalar({ url: '/docs.json' }))

// Test queue endpoint
app.post('/test/queue', async (c) => {
  try {
    const { fileInfo, category } = await c.req.json();

    if (!fileInfo || !category) {
      return c.json({ error: 'fileInfo and category are required' }, 400);
    }

    // Send test message to queue
    await c.env.FILE_PROCESSING_QUEUE.send({
      fileInfo: {
        filename: fileInfo.filename || 'test-file.jpg',
        filetype: fileInfo.filetype || 'image/jpeg',
        size: fileInfo.size || 1024,
        r2Key: fileInfo.r2Key || 'test/r2/key',
        uploadedAt: new Date().toISOString()
      },
      category: category || 'raw_image',
      processingUrl: '/process',
      timestamp: new Date().toISOString(),
      retryCount: 0
    });

    return c.json({
      success: true,
      message: 'Test message sent to queue',
      fileInfo,
      category
    });

  } catch (error) {
    console.error('Queue test error:', error);
    return c.json({
      error: 'Failed to send test message',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

const apiApp = new OpenAPIHono<HonoTypes>();
uploadRoute(apiApp);

// Files API endpoint with pagination
apiApp.get('/files', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const category = c.req.query('category');
    const status = c.req.query('status');

    if (page < 1) {
      return c.json({ error: 'Page must be greater than 0' }, 400);
    }
    if (perPage < 1 || perPage > 100) {
      return c.json({ error: 'Per page must be between 1 and 100' }, 400);
    }

    const db = new DatabaseService(c.env);
    const offset = (page - 1) * perPage;
    const dbInstance = db.getDb();

    let whereConditions: any[] = [];
    if (category) {
      whereConditions.push(eq(schema.files.category, category));
    }
    if (status) {
      whereConditions.push(eq(schema.files.status, status));
    }

    const totalResult = await dbInstance
      .select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = Number(totalResult[0]?.count || 0);

    const filesResult = await dbInstance
      .select({
        id: schema.files.id,
        filename: schema.files.filename,
        originalFilename: schema.files.originalFilename,
        filetype: schema.files.filetype,
        size: schema.files.size,
        category: schema.files.category,
        status: schema.files.status,
        uploadedAt: schema.files.uploadedAt,
        processedAt: schema.files.processedAt,
        createdAt: schema.files.createdAt,
        updatedAt: schema.files.updatedAt,
        r2Key: schema.files.r2Key,
        videoDuration: schema.videos.duration,
        videoWidth: schema.videos.width,
        videoHeight: schema.videos.height,
        videoCodec: schema.videos.codec,
        audioCodec: schema.videos.audioCodec,
        hasAudio: schema.videos.hasAudio,
        hasVideo: schema.videos.hasVideo,
        videoId: schema.videos.id
      })
      .from(schema.files)
      .leftJoin(schema.videos, eq(schema.files.id, schema.videos.fileId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(schema.files.createdAt))
      .limit(perPage)
      .offset(offset);

    const files = filesResult;
    const processedFiles = await Promise.all(files.map(async (file: any) => {
      const baseUrl = new URL(c.req.url).origin;
      const fileId = file.r2Key.split('/')[0];

      const result: any = {
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename,
        filetype: file.filetype,
        size: file.size,
        category: file.category,
        status: file.status,
        uploadedAt: file.uploadedAt,
        processedAt: file.processedAt,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        urls: {
          download: `${baseUrl}/api/files/${file.id}/download`
        }
      };

      if (file.category === 'raw_image' || file.filetype.startsWith('image/')) {
        result.urls.preview = `${baseUrl}/api/files/${file.id}/preview`;
        const convertedFiles = await db.getConvertedFilesByOriginalId(file.id);
        if (convertedFiles.length > 0) {
          result.convertedFiles = convertedFiles.map(cf => ({
            id: cf.id,
            filename: cf.filename,
            format: cf.format,
            quality: cf.quality,
            dimensions: cf.dimensions,
            downloadUrl: `${baseUrl}/api/files/${file.id}/download/converted/${cf.id}`
          }));
        }
      } else if (file.category === 'video' || file.filetype.startsWith('video/')) {
        result.urls.masterPlaylist = `${baseUrl}/video/${fileId}/master.m3u8`;
        const convertedFiles = await db.getConvertedFilesByOriginalId(file.id);
        const videoFiles = convertedFiles.filter(cf => cf.format === 'mp4');

        if (videoFiles.length > 0) {
          const video1080p = videoFiles.find(vf => vf.quality === 5000000);
          if (video1080p) {
            result.urls.download1080p = `${baseUrl}/api/files/${file.id}/download/converted/${video1080p.id}`;
          }
          result.availableResolutions = videoFiles.map(vf => ({
            resolution: vf.dimensions && typeof vf.dimensions === 'object' && 'width' in vf.dimensions && 'height' in vf.dimensions 
              ? `${vf.dimensions.width}x${vf.dimensions.height}` 
              : 'unknown',
            quality: vf.quality,
            format: vf.format,
            downloadUrl: `${baseUrl}/api/files/${file.id}/download/converted/${vf.id}`
          }));
        }

        if (file.videoDuration) {
          result.video = {
            duration: file.videoDuration,
            width: file.videoWidth,
            height: file.videoHeight,
            codec: file.videoCodec,
            audioCodec: file.audioCodec,
            hasAudio: file.hasAudio,
            hasVideo: file.hasVideo
          };
        }

        if (file.videoId) {
          const playlists = await db.getM3U8PlaylistsByVideoId(file.videoId);
          result.playlists = playlists.map(playlist => ({
            type: playlist.playlistType,
            filename: playlist.filename,
            url: playlist.playlistType === 'master' 
              ? `${baseUrl}/video/${fileId}/master.m3u8`
              : `${baseUrl}/video/${fileId}/${playlist.filename}`
          }));
        }
      }

      return result;
    }));

    const totalPages = Math.ceil(total / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      files: processedFiles,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    });

  } catch (error) {
    console.error('Files API error:', error);
    return c.json({
      error: 'Failed to retrieve files',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Download original file endpoint
apiApp.get('/files/:fileId/download', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    
    const db = new DatabaseService(c.env);
    const file = await db.getFileById(fileId);
    
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    const object = await c.env.ATTACHMENT_BUCKET.get(file.r2Key);
    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }
    
    return new Response(await object.arrayBuffer(), {
      headers: {
        'Content-Type': file.filetype,
        'Content-Disposition': `attachment; filename="${file.originalFilename}"`,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
  } catch (error) {
    console.error('Download error:', error);
    return c.json({
      error: 'Failed to download file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Download converted file endpoint
apiApp.get('/files/:fileId/download/converted/:convertedFileId', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    const convertedFileId = c.req.param('convertedFileId');
    
    const db = new DatabaseService(c.env);
    const convertedFiles = await db.getConvertedFilesByOriginalId(fileId);
    const convertedFile = convertedFiles.find(cf => cf.id === convertedFileId);
    
    if (!convertedFile) {
      return c.json({ error: 'Converted file not found' }, 404);
    }
    
    const object = await c.env.ATTACHMENT_BUCKET.get(convertedFile.r2Key);
    if (!object) {
      return c.json({ error: 'Converted file not found in storage' }, 404);
    }
    
    return new Response(await object.arrayBuffer(), {
      headers: {
        'Content-Type': convertedFile.filetype,
        'Content-Disposition': `attachment; filename="${convertedFile.filename}"`,
        'Content-Length': convertedFile.size.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
  } catch (error) {
    console.error('Converted file download error:', error);
    return c.json({
      error: 'Failed to download converted file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Preview image endpoint
apiApp.get('/files/:fileId/preview', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    
    const db = new DatabaseService(c.env);
    const file = await db.getFileById(fileId);
    
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    if (!file.filetype.startsWith('image/')) {
      return c.json({ error: 'File is not an image' }, 400);
    }
    
    const object = await c.env.ATTACHMENT_BUCKET.get(file.r2Key);
    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }
    
    return new Response(await object.arrayBuffer(), {
      headers: {
        'Content-Type': file.filetype,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${file.originalFilename}"`
      }
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    return c.json({
      error: 'Failed to preview file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.route('/api', apiApp)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle HTTP requests
    return app.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`🔄 Processing queue batch: ${batch.messages.length} messages`);

    try {
      // Create container service with the DurableObject stub
      const containerStub = env.MY_CONTAINER.get(env.MY_CONTAINER.newUniqueId());
      const containerService = new ContainerService(containerStub);

      // Process all messages in the batch
      const messages = batch.messages.map(msg => msg.body);
      const results = await containerService.processBatch(messages);

      // Log results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      console.log(`✅ Queue batch processed: ${successCount} successful, ${failureCount} failed`);

      // Acknowledge all messages (successful or failed)
      // Cloudflare Queues will handle retries automatically based on configuration
      batch.ackAll();

    } catch (error) {
      console.error(`❌ Queue batch processing failed:`, error);

      // Reject all messages to trigger retry
      batch.retryAll();
    }
  }
};
