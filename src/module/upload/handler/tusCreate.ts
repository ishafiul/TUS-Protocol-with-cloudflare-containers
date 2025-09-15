import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../../../type/env";
import { parseUploadMetadata } from "../../../tus/parse";
import type { DurableObjectNamespace } from '@cloudflare/workers-types';

const DO_CALL_TIMEOUT = 1000 * 60 * 30; // 30 minutes

function validateRequestId(requestId: string) {
  if (requestId.includes('..')) {
    throw new Error('Path traversal detected');
  }
  return true;
}


export default function tusCreate(app: HonoApp) {
  app.openapi(
    createRoute({
      method: "post",
      path: "/files/attachments",
      tags: ["TUS Upload"],
      description: "Create a new TUS upload session",
      request: {
        headers: z.object({
          "Upload-Length": z.string().optional().openapi({
            description: "Total upload size in bytes",
            example: "1048576"
          }),
          "Upload-Defer-Length": z.string().optional().openapi({
            description: "Defer upload length specification",
            example: "1"
          }),
          "Upload-Metadata": z.string().optional().openapi({
            description: "Base64 encoded metadata",
            example: "filename dGVzdC5wZGY="
          }),
          "Content-Type": z.string().optional().openapi({
            description: "Content type for creation-with-upload",
            example: "application/offset+octet-stream"
          }),
          "Upload-Checksum": z.string().optional().openapi({
            description: "Checksum for upload validation",
            example: "sha256 abc123def456"
          }),
          "Authorization": z.string().optional().openapi({
            description: "Authentication token",
            example: "Bearer token123"
          })
        }),
        body: {
          content: {
            "application/offset+octet-stream": {
              schema: z.string().openapi({
                type: "string",
                format: "binary",
                description: "Upload data for creation-with-upload"
              })
            }
          },
          required: false
        }
      },
      responses: {
        201: {
          description: "Upload session created successfully",
          headers: z.object({
            "Location": z.string().openapi({
              description: "URL for the created upload resource",
              example: "/files/attachments/upload_123"
            }),
            "Tus-Resumable": z.string().openapi({
              description: "TUS protocol version",
              example: "1.0.0"
            }),
            "Upload-Expires": z.string().optional().openapi({
              description: "Upload expiration time",
              example: "2024-12-31T23:59:59Z"
            }),
            "Upload-Offset": z.string().optional().openapi({
              description: "Current upload offset for creation-with-upload",
              example: "1024"
            })
          }),
          content: {
            "application/json": {
              schema: z.object({
                uploadUrl: z.string().openapi({
                  description: "URL for continuing the upload",
                  example: "/files/attachments/upload_123"
                }),
                uploadId: z.string().openapi({
                  description: "Unique identifier for the upload",
                  example: "upload_123"
                })
              })
            }
          }
        },
        400: {
          description: "Bad request - validation error",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Invalid metadata or missing filename"
                })
              })
            }
          }
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
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Invalid bucket configuration"
                })
              })
            }
          }
        }
      }
    }),
    async (c) => {
      const fileId = parseUploadMetadata(c.req.raw.headers).filename;
      console.log("called")
      if (fileId == null) {
        return c.json({ error: 'Missing filename in upload metadata' }, 400);
      }

      try {
        validateRequestId(fileId);
        // await checkAppAccess(c); // Auth disabled for demo
      } catch (error) {
        console.log({ fileId, context: 'tusCreate', error });
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
         
         return response;
      } catch (error) {
        console.log({ fileId, context: 'durableObjectCall', error });
        return c.json({ error: 'Upload handler error' }, 500);
      }
    }
  );
}
