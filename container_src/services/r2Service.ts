import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'attachments';
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || 'https://3a7eac21191296079f68958f1652aef9.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '3a7eac21191296079f68958f1652aef9',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'adbec2122ff5c4ccc3236d9468118abf807844b2a8468c694a8126ebe2917a32'
      }
    });
  }

  async uploadFile(key: string, content: string | Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: 'public, max-age=36000'
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return `https://${this.bucketName}.r2.dev/${key}`;
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadM3U8File(key: string, content: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: 'application/vnd.apple.mpegurl',
        CacheControl: 'no-cache, no-store, must-revalidate' // No cache for playlists
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return `https://${this.bucketName}.r2.dev/${key}`;
    } catch (error) {
      console.error('R2 M3U8 upload error:', error);
      throw new Error(`Failed to upload M3U8 file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadVideoFile(key: string, content: Buffer): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000' // 1 year cache for video files
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return `https://${this.bucketName}.r2.dev/${key}`;
    } catch (error) {
      console.error('R2 video upload error:', error);
      throw new Error(`Failed to upload video file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('R2 get file error:', error);
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.r2.dev/${key}`;
  }
}
