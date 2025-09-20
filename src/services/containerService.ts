import { QueueMessage } from './queueService';
import { getContainer } from "@cloudflare/containers";

export interface ProcessingResult {
  success: boolean;
  result?: any;
  error?: string;
  processingTime?: number;
}

export class ContainerService {
  constructor(private containerDO: any) {}

  async processFile(message: QueueMessage): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Processing file: ${message.fileInfo.filename} (${message.category})`);

      // Create a request to the container's /process endpoint
      // Using DurableObject stub instead of container
      const requestBody = JSON.stringify({
        fileInfo: message.fileInfo,
        category: message.category,
        timestamp: message.timestamp,
        retryCount: message.retryCount || 0
      });

      // Use the container's fetch method with a relative path
      const response = await this.containerDO.fetch('/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker-Queue-Processor/1.0'
        },
        body: requestBody
      });
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
