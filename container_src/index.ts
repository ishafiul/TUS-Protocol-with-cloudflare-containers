import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

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

// File processing endpoint
app.post('/process', async (c) => {
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
      throw new Error(`Simulated processing failure for ${category} file`);
    }
    
    const result = {
      success: true,
      fileInfo,
      category,
      processingResult: {
        processedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
        extractedMetadata: {
          processedBy: 'container-processor-v1',
          fileCategory: category,
          processingNode: `${process.platform}-${process.arch}`,
          timestamp: new Date().toISOString()
        }
      }
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
