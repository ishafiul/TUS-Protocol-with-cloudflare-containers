import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../../../type/env";
import type { DurableObjectNamespace } from '@cloudflare/workers-types';

const DO_CALL_TIMEOUT = 1000 * 60 * 30; // 30 minutes

function validateRequestId(requestId: string) {
  if (requestId.includes('..')) {
    throw new Error('Path traversal detected');
  }
  return true;
}

// Authentication disabled for demo
// async function checkAppAccess(c: any) {
//   const authHeader = c.req.header('Authorization');
//   if (authHeader !== c.env.AUTH_TOKEN) {
//     throw new Error('Unauthorized');
//   }
// }

export default function tusHead(app: HonoApp) {
  app.openapi(
    createRoute({
      method: "head",
      path: "/files/attachments/{id}",
      tags: ["TUS Upload"],
      description: "Get upload session information and current offset",
      request: {
        params: z.object({
          id: z.string().openapi({
            description: "Upload file identifier",
            example: "upload_123"
          })
        }),
        headers: z.object({
          "Authorization": z.string().optional().openapi({
            description: "Authentication token",
            example: "Bearer token123"
          })
        })
      },
      responses: {
        204: {
          description: "Upload session information",
          headers: z.object({
            "Upload-Offset": z.string().openapi({
              description: "Current upload offset in bytes",
              example: "1024"
            }),
            "Upload-Length": z.string().optional().openapi({
              description: "Total upload length in bytes (if known)",
              example: "2048"
            }),
            "Upload-Defer-Length": z.string().optional().openapi({
              description: "Whether upload length is deferred",
              example: "1"
            }),
            "Tus-Resumable": z.string().openapi({
              description: "TUS protocol version",
              example: "1.0.0"
            }),
            "Upload-Metadata": z.string().optional().openapi({
              description: "Base64 encoded upload metadata",
              example: "filename dGVzdC5wZGY="
            }),
            "Upload-Expires": z.string().optional().openapi({
              description: "Upload expiration time",
              example: "2024-12-31T23:59:59Z"
            }),
            "Cache-Control": z.string().optional().openapi({
              description: "Cache control directive",
              example: "no-store"
            })
          })
        },
        401: {
          description: "Unauthorized - invalid or missing auth token",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Unauthorized"
                })
              })
            }
          }
        },
        404: {
          description: "Upload session not found",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Upload session not found"
                })
              })
            }
          }
        },
        410: {
          description: "Upload session has expired",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Upload session has expired"
                })
              })
            }
          }
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Upload handler error"
                })
              })
            }
          }
        }
      }
    }),
    async (c) => {
      const fileId = c.req.param('id');
      if (fileId == null) {
        return c.json({ error: 'File ID is required' }, 400);
      }

      try {
        validateRequestId(fileId);
        // await checkAppAccess(c); // Auth disabled for demo
      } catch (error) {
        console.log({ fileId, context: 'tusHead', error });
        return c.json({ error: (error as any)?.message || 'Unknown error' }, 400);
      }

      const durableObjNs: DurableObjectNamespace = c.env.ATTACHMENT_UPLOAD_HANDLER;

      if (durableObjNs == null) {
        return c.json({ error: 'Invalid bucket configuration' }, 500);
      }

      const handler = durableObjNs.get(durableObjNs.idFromName(fileId));

      try {
        const response = await handler.fetch(c.req.url, {
          body: c.req.raw.body as any,
          method: c.req.method,
          headers: c.req.raw.headers as any,
          signal: AbortSignal.timeout(DO_CALL_TIMEOUT) as any,
        });

        return response as Response;
      } catch (error) {
        console.log({ fileId, context: 'durableObjectCall', error });
        return c.json({ error: 'Upload handler error' }, 500);
      }
    }
  );
}
