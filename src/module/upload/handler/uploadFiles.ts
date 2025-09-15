import { createRoute, z } from "@hono/zod-openapi";
import { HonoApp } from "../../../type/env";

export default function uploadFiles(app: HonoApp) {
  app.openapi(
    createRoute({
      method: "post",
      path: "/upload",
      tags: ["Upload"],
      description: "Upload a file",
      request: {
        body: {
          content: {
            "multipart/form-data": {
              schema: z.object({
                file: z.string().openapi({
                  type: "string",
                  format: "binary",
                }),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                message: z.string(),
                filename: z.string(),
              }),
            },
          },
          description: "File uploaded successfully",
        },
        400: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "Bad request - no file provided",
        },
      },
    }),
    async (c) => {
      const body = await c.req.formData();
      const file = body.get("file") as File;
      
      if (!file) {
        return c.json({ error: "No file provided" }, 400);
      }

      return c.json({
        message: "File uploaded successfully",
        filename: file.name,
      });
    }
  );
}
