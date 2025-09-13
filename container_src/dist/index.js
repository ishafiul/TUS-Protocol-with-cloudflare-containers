import { Hono } from 'hono';
import { serve } from '@hono/node-server';
const app = new Hono();
app.get('/', (c) => {
    return c.text('Hello from Node.js TypeScript Container!');
});
app.get('/:id', (c) => {
    const id = c.req.param('id');
    return c.json({
        message: `Hello from container for ID: ${id}`,
        id: id,
        timestamp: new Date().toISOString()
    });
});
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: process.env.MESSAGE || 'No message set'
    });
});
app.get('/env', (c) => {
    return c.json({
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.MESSAGE || 'No message set'
    });
});
app.get('/error', (c) => {
    throw new Error('This is a test error from the container');
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