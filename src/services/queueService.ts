import { FileInfo } from '../utils/fileTypeDetection';

export interface QueueMessage {
  fileInfo: FileInfo;
  category: 'raw_image' | 'video';
  processingUrl: string;
  timestamp: string;
  retryCount?: number;
}

export class QueueService {
  constructor(private queue: Queue<QueueMessage>) {}

  async sendFileForProcessing(fileInfo: FileInfo, category: 'raw_image' | 'video'): Promise<void> {
    const message: QueueMessage = {
      fileInfo,
      category,
      processingUrl: '/process', // Container endpoint
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    try {
      await this.queue.send(message);
      console.log(`✅ File queued for processing: ${fileInfo.filename} (${category})`);
    } catch (error) {
      console.error(`❌ Failed to queue file for processing: ${fileInfo.filename}`, error);
      throw error;
    }
  }

  async sendBatchForProcessing(messages: QueueMessage[]): Promise<void> {
    try {
      const batchMessages = messages.map(message => ({ body: message }));
      await this.queue.sendBatch(batchMessages);
      console.log(`✅ Batch of ${messages.length} files queued for processing`);
    } catch (error) {
      console.error(`❌ Failed to queue batch for processing:`, error);
      throw error;
    }
  }
}
