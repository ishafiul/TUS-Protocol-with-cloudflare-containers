import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../../../type/env";
import { DEFAULT_RETRY_PARAMS, RetryBucket } from "../../../tus/retry";
import { X_CHECKSUM_SHA256 } from "../../../tus/uploadHandler";
import { toBase64 } from "../../../tus/util";
import type { R2Bucket, R2Object, R2Range } from '@cloudflare/workers-types';

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

function objectHeaders(object: R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers as any);
  headers.set('etag', object.httpEtag);

  if (object.checksums.sha256 != null) {
    headers.set(X_CHECKSUM_SHA256, toBase64(object.checksums.sha256));
  }

  if (object.customMetadata?.[X_CHECKSUM_SHA256] != null) {
    headers.set(X_CHECKSUM_SHA256, object.customMetadata[X_CHECKSUM_SHA256]);
  }
  return headers;
}

function rangeHeader(objLen: number, r2Range: R2Range): string {
  let startIndexInclusive = 0;
  let endIndexInclusive = objLen - 1;
  if ('offset' in r2Range && r2Range.offset != null) {
    startIndexInclusive = r2Range.offset;
  }
  if ('length' in r2Range && r2Range.length != null) {
    endIndexInclusive = startIndexInclusive + r2Range.length - 1;
  }
  if ('suffix' in r2Range) {
    startIndexInclusive = objLen - r2Range.suffix;
  }
  return `bytes ${startIndexInclusive}-${endIndexInclusive}/${objLen}`;
}

export default function tusGet(app: HonoApp) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/files/attachments/{id}",
      tags: ["TUS Upload"],
      description: "Download or get information about an uploaded file",
      request: {
        params: z.object({
          id: z.string().openapi({
            description: "Upload file identifier",
            example: "upload_123"
          })
        }),
        headers: z.object({
          "Range": z.string().optional().openapi({
            description: "HTTP range header for partial content requests",
            example: "bytes=0-1023"
          }),
          "If-None-Match": z.string().optional().openapi({
            description: "ETag for conditional requests",
            example: "\"abc123def456\""
          }),
          "Authorization": z.string().optional().openapi({
            description: "Authentication token",
            example: "Bearer token123"
          })
        })
      },
      responses: {
        200: {
          description: "File content returned successfully",
          headers: z.object({
            "Content-Type": z.string().openapi({
              description: "File content type",
              example: "application/pdf"
            }),
            "Content-Length": z.string().openapi({
              description: "File size in bytes",
              example: "1048576"
            }),
            "ETag": z.string().openapi({
              description: "Entity tag for caching",
              example: "\"abc123def456\""
            }),
            "Last-Modified": z.string().openapi({
              description: "Last modification date",
              example: "Wed, 21 Oct 2024 07:28:00 GMT"
            }),
            "Cache-Control": z.string().optional().openapi({
              description: "Cache control directive",
              example: "public, max-age=3600"
            }),
            "X-Checksum-SHA256": z.string().optional().openapi({
              description: "SHA256 checksum of the file",
              example: "abc123def456"
            })
          }),
          content: {
            "application/octet-stream": {
              schema: z.string().openapi({
                type: "string",
                format: "binary",
                description: "File binary content"
              })
            }
          }
        },
        206: {
          description: "Partial content returned (range request)",
          headers: z.object({
            "Content-Range": z.string().openapi({
              description: "Content range information",
              example: "bytes 0-1023/1048576"
            }),
            "Content-Length": z.string().openapi({
              description: "Partial content size",
              example: "1024"
            }),
            "Content-Type": z.string(),
            "ETag": z.string(),
            "X-Checksum-SHA256": z.string().optional()
          }),
          content: {
            "application/octet-stream": {
              schema: z.string().openapi({
                type: "string",
                format: "binary",
                description: "Partial file binary content"
              })
            }
          }
        },
        304: {
          description: "Not modified (cached version is current)",
          headers: z.object({
            "ETag": z.string(),
            "Cache-Control": z.string().optional()
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
          description: "File not found",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "File not found"
                })
              })
            }
          }
        },
        416: {
          description: "Range not satisfiable",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string().openapi({
                  description: "Error message",
                  example: "Requested range not satisfiable"
                })
              })
            }
          }
        }
      }
    }),
    async (c) => {
      const requestId = c.req.param('id');
      if (!requestId) {
        return c.json({ error: 'File ID is required' }, 400);
      }

      // Optional: Enable auth check by uncommenting
      // try {
      //   validateRequestId(requestId);
      //   await checkAppAccess(c);
      // } catch (error) {
      //   console.log({ requestId, context: 'checkAppAccess', error });
      //   return c.json({ error: (error as any)?.message || 'Unknown error' }, 400);
      // }

      const bucket: R2Bucket = c.env.ATTACHMENT_BUCKET;

      if (bucket == null) {
        console.log('tusGet', 'bucket is null');
        return c.json({ error: 'Storage not configured' }, 500);
      }

      const cache = (globalThis as any).caches.default;
      const cacheKey = new Request(new URL(c.req.url), c.req);
      let response = await cache.match(cacheKey);
      if (response != null) {
        return response;
      }

      try {
        const object = await new RetryBucket(bucket, DEFAULT_RETRY_PARAMS).get(requestId, {
          range: c.req.raw.headers as any,
        });

        if (object == null) {
          console.log('tusGet', 'object not found', requestId);
          return c.json({ error: 'File not found' }, 404);
        }

        const headers = objectHeaders(object);

        // For HEAD requests, return TUS protocol headers
        if (c.req.method === 'HEAD') {
          const tusHeaders = new Headers({
            'Upload-Offset': object.size.toString(),
            'Upload-Length': object.size.toString(),
            'Tus-Resumable': '1.0.0',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,HEAD,PATCH,OPTIONS,DELETE',
            'Access-Control-Allow-Headers': 'Authorization,Content-Type,Location,Tus-Extension,Tus-Max-Size,Tus-Resumable,Tus-Version,Upload-Concat,Upload-Defer-Length,Upload-Length,Upload-Metadata,Upload-Offset,X-HTTP-Method-Override,X-Requested-With,X-Forwarded-Host,X-Forwarded-Proto,Forwarded',
            'Access-Control-Expose-Headers': 'Authorization,Content-Type,Location,Tus-Extension,Tus-Max-Size,Tus-Resumable,Tus-Version,Upload-Concat,Upload-Defer-Length,Upload-Length,Upload-Metadata,Upload-Offset,X-HTTP-Method-Override,X-Requested-With,X-Forwarded-Host,X-Forwarded-Proto,Forwarded'
          });
          return new Response(null, { status: 204, headers: tusHeaders });
        }

        if (object.range != null && c.req.header('range')) {
          headers.set('content-range', rangeHeader(object.size, object.range));
          response = new Response(object.body as any, { headers, status: 206 });
          return response;
        } else {
          response = new Response(object.body as any, { headers });
          // Only cache GET requests, not HEAD requests
          if (c.req.method === 'GET') {
            c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
          }
          return response;
        }
      } catch (error) {
        console.log('tusGet', 'error retrieving file', requestId, error);
        return c.json({ error: 'Failed to retrieve file' }, 500);
      }
    }
  );
}
