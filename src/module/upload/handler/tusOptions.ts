import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../../../type/env";
import { ALLOWED_HEADERS, ALLOWED_METHODS, EXPOSED_HEADERS } from "../../../tus/util";
import { MAX_UPLOAD_LENGTH_BYTES, TUS_VERSION } from "../../../tus/uploadHandler";

export default function tusOptions(app: HonoApp) {
  app.openapi(
    createRoute({
      method: "options",
      path: "/files/attachments",
      tags: ["TUS Upload"],
      description: "TUS protocol OPTIONS request for upload initialization",
      responses: {
        204: {
          description: "TUS protocol capabilities",
          headers: z.object({
            "Access-Control-Allow-Origin": z.string().openapi({
              description: "CORS allowed origins",
              example: "*"
            }),
            "Access-Control-Allow-Methods": z.string().openapi({
              description: "Allowed HTTP methods",
              example: ALLOWED_METHODS
            }),
            "Access-Control-Allow-Headers": z.string().openapi({
              description: "Allowed request headers",
              example: ALLOWED_HEADERS
            }),
            "Access-Control-Expose-Headers": z.string().openapi({
              description: "Exposed response headers",
              example: EXPOSED_HEADERS
            }),
            "Tus-Resumable": z.string().openapi({
              description: "TUS protocol version",
              example: TUS_VERSION
            }),
            "Tus-Version": z.string().openapi({
              description: "Supported TUS versions",
              example: TUS_VERSION
            }),
            "Tus-Max-Size": z.string().openapi({
              description: "Maximum upload size in bytes",
              example: MAX_UPLOAD_LENGTH_BYTES.toString()
            }),
            "Tus-Extension": z.string().openapi({
              description: "Supported TUS extensions",
              example: "creation,creation-defer-length,creation-with-upload,expiration"
            })
          })
        }
      }
    }),
    (c) => {
      return c.newResponse(null, 204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Expose-Headers': EXPOSED_HEADERS,
        'Tus-Resumable': TUS_VERSION,
        'Tus-Version': TUS_VERSION,
        'Tus-Max-Size': MAX_UPLOAD_LENGTH_BYTES.toString(),
        'Tus-Extension': 'creation,creation-defer-length,creation-with-upload,expiration',
      });
    }
  );

  app.openapi(
    createRoute({
      method: "options",
      path: "/files/attachments/{id}",
      tags: ["TUS Upload"],
      description: "TUS protocol OPTIONS request for existing upload",
      request: {
        params: z.object({
          id: z.string().openapi({
            description: "Upload file identifier",
            example: "upload_123"
          })
        })
      },
      responses: {
        204: {
          description: "TUS protocol capabilities for existing upload",
          headers: z.object({
            "Access-Control-Allow-Origin": z.string(),
            "Access-Control-Allow-Methods": z.string(),
            "Access-Control-Allow-Headers": z.string(),
            "Access-Control-Expose-Headers": z.string(),
            "Tus-Resumable": z.string(),
            "Tus-Version": z.string(),
            "Tus-Max-Size": z.string(),
            "Tus-Extension": z.string()
          })
        }
      }
    }),
    (c) => {
      return c.newResponse(null, 204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Expose-Headers': EXPOSED_HEADERS,
        'Tus-Resumable': TUS_VERSION,
        'Tus-Version': TUS_VERSION,
        'Tus-Max-Size': MAX_UPLOAD_LENGTH_BYTES.toString(),
        'Tus-Extension': 'creation,creation-defer-length,creation-with-upload,expiration',
      });
    }
  );
}

