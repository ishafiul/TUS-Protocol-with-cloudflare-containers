import { QueueMessage } from './queueService';

export interface ProcessingResult {
  success: boolean;
  result?: any;
  error?: string;
  processingTime?: number;
}

export class ContainerService {
  constructor(private container: any) {}

  async processFile(message: QueueMessage): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing file: ${message.fileInfo.filename} (${message.category})`);
      
      // Create a request to the container's /process endpoint
      // The container will automatically route this to its default port (8080)
      const request = new Request('http://container/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker-Queue-Processor/1.0'
        },
        body: JSON.stringify({
          fileInfo: message.fileInfo,
          category: message.category,
          timestamp: message.timestamp,
          retryCount: message.retryCount || 0
        })
      });

      // Use the container's fetch method to forward the request
      const response = await this.container.fetch(request);
      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Container processing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      console.log(`✅ File processed successfully: ${message.fileInfo.filename} (${processingTime}ms)`);

      return {
        success: true,
        result,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ File processing failed: ${message.fileInfo.filename}`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        processingTime
      };
    }
  }

  async processBatch(messages: QueueMessage[]): Promise<ProcessingResult[]> {
    console.log(`🔄 Processing batch of ${messages.length} files`);
    
    const results: ProcessingResult[] = [];
    
    // Process files in parallel (with some concurrency limit)
    const concurrency = 5;
    const chunks = [];
    
    for (let i = 0; i < messages.length; i += concurrency) {
      chunks.push(messages.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(message => this.processFile(message))
      );
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Processing failed',
            processingTime: 0
          });
        }
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch processing completed: ${successCount}/${messages.length} files processed successfully`);
    
    return results;
  }
}
