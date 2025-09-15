import { Container, } from "@cloudflare/containers";
import { Hono } from "hono";
import { HonoTypes } from "./type/env";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { Scalar } from "@scalar/hono-api-reference";
import uploadRoute from "./module/upload/route";
import { ContainerService } from "./services/containerService";
import type { QueueMessage } from "./services/queueService";
import { MyContainer } from "./container/MyContainer";
import { getContainer } from "@cloudflare/containers";
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

const apiApp = new OpenAPIHono<HonoTypes>();
uploadRoute(apiApp);
app.route('/api', apiApp)

export default {
  ...app,
  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`🔄 Processing queue batch: ${batch.messages.length} messages`);
    
    try {
      // Get a container instance using getContainer
      const container = getContainer(env.MY_CONTAINER);
      const containerService = new ContainerService(container);
      
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
