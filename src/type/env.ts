import { Context, Hono } from 'hono';
import { OpenAPIHono } from '@hono/zod-openapi';
import { MyContainer } from '..';
import type { R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';
import type { QueueMessage } from '../services/queueService';

export type Env = {
  DB_URL: string;
  ASSETS: Fetcher;
  MY_CONTAINER: DurableObjectNamespace<MyContainer>;
  AUTH_TOKEN: string;
  ATTACHMENT_BUCKET: R2Bucket;
  ATTACHMENT_UPLOAD_HANDLER: DurableObjectNamespace;
  FILE_PROCESSING_QUEUE: Queue<QueueMessage>;
};

export type HonoTypes = {
  Bindings: Env;
  Variables: {
  };
};
export type HonoApp = OpenAPIHono<HonoTypes>;
export type HonoContext = Context<HonoTypes>;