import type { Context } from 'hono';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';

export const DO_CALL_TIMEOUT = 1000 * 60 * 30; // 30 minutes
export const ATTACHMENT_PREFIX = 'attachments';

export function validateRequestId(requestId: string): boolean {
  if (requestId.includes('..')) {
    throw new Error('Path traversal detected');
  }
  return true;
}

export async function checkAppAccess(c: Context): Promise<void> {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== c.env.AUTH_TOKEN) {
    throw new Error('Unauthorized');
  }
}

export async function callDurableObject(
  c: Context,
  fileId: string,
  durableObjNs: DurableObjectNamespace
): Promise<Response> {
  const handler = durableObjNs.get(durableObjNs.idFromName(fileId));
  
  const response = await handler.fetch(c.req.url, {
    body: c.req.raw.body as any,
    method: c.req.method,
    headers: c.req.raw.headers as any,
    signal: AbortSignal.timeout(DO_CALL_TIMEOUT) as any,
  });
  
  return response as Response;
}

export function createErrorResponse(message: string, status: number = 500) {
  return Response.json({ error: message }, { status });
}

export function logError(context: string, error: unknown, metadata?: Record<string, any>) {
  console.log({
    context,
    error: error instanceof Error ? error.message : String(error),
    ...metadata
  });
}
