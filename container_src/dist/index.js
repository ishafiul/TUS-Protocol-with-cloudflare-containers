import { Hono } from 'hono';
import { serve } from '@hono/node-server';
const app = new Hono();
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: process.env.MESSAGE || 'No message set'
    });
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
const port = parseInt(process.env.PORT || '8080', 10);
console.log(`Starting Node.js TypeScript container on port ${port}`);
// Start the server
serve({
    fetch: app.fetch,
    port,
});
console.log(`Server running on port ${port}`);
export default app;
//# sourceMappingURL=index.js.map