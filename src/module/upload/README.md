# TUS Upload Module

This module implements the TUS (Tus Resumable Upload) protocol for handling large file uploads with resume capabilities. It's built with Hono and includes comprehensive OpenAPI documentation.

## Overview

The TUS protocol allows clients to upload files in chunks, with the ability to resume interrupted uploads. This implementation uses Cloudflare Durable Objects for upload session management and R2 for file storage.

## Routes and Handlers

### 1. OPTIONS `/files/attachments`
- **Handler**: `tusOptions.ts`
- **Purpose**: TUS protocol capability discovery
- **Returns**: CORS headers and TUS protocol information

### 2. POST `/files/attachments`
- **Handler**: `tusCreate.ts` 
- **Purpose**: Create new upload session
- **Features**:
  - Creation with upload (immediate data upload)
  - Deferred length uploads
  - Metadata parsing from headers
  - Returns upload URL and ID

### 3. PATCH `/files/attachments/{id}`
- **Handler**: `tusPatch.ts`
- **Purpose**: Continue uploading data chunks
- **Features**:
  - Offset validation
  - Checksum verification
  - Progress tracking
  - Returns new offset

### 4. GET `/files/attachments/{id}`
- **Handler**: `tusGet.ts`
- **Purpose**: Download completed files
- **Features**:
  - Range requests support
  - ETag caching
  - SHA256 checksum headers
  - Cloudflare cache integration

### 5. HEAD `/files/attachments/{id}`
- **Handler**: `tusHead.ts`
- **Purpose**: Get upload session status
- **Returns**: Current offset, metadata, expiration

### 6. DELETE `/files/attachments/{id}`
- **Handler**: `tusDelete.ts`
- **Purpose**: Cancel upload session
- **Features**: Cleanup of partial uploads

### 7. OPTIONS `/files/attachments/{id}`
- **Handler**: `tusOptions.ts`
- **Purpose**: TUS capabilities for existing uploads

## Environment Variables

Required in your `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "AUTH_TOKEN": "your-auth-token"
  },
  "r2_buckets": [
    {
      "binding": "ATTACHMENT_BUCKET",
      "bucket_name": "your-upload-bucket"
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "name": "ATTACHMENT_UPLOAD_HANDLER",
        "class_name": "AttachmentUploadHandler"
      }
    ]
  }
}
```

## TUS Protocol Features Supported

- ✅ **Core Protocol**: Basic upload/download
- ✅ **Creation**: POST to create upload sessions
- ✅ **Creation with Upload**: Upload data immediately on creation
- ✅ **Creation Defer Length**: Create without knowing final size
- ✅ **Expiration**: Upload sessions can expire
- ✅ **Checksum**: SHA256 validation
- ✅ **Termination**: DELETE to cancel uploads

## Authentication

All upload operations require an `Authorization` header matching the `AUTH_TOKEN` environment variable. Download operations (GET) have auth disabled by default for demo purposes.

## Error Handling

The handlers provide comprehensive error responses:
- **400**: Bad request (validation errors)
- **401**: Unauthorized 
- **404**: Upload/file not found
- **409**: Conflict (offset mismatch)
- **410**: Upload expired
- **416**: Range not satisfiable
- **500**: Server errors

## Usage Example

### Client Upload Flow

1. **Discovery** (OPTIONS):
```bash
curl -X OPTIONS /files/attachments
```

2. **Create Upload** (POST):
```bash
curl -X POST /files/attachments \
  -H "Upload-Length: 1000000" \
  -H "Upload-Metadata: filename dGVzdC5wZGY=" \
  -H "Authorization: Bearer your-token"
```

3. **Upload Chunks** (PATCH):
```bash
curl -X PATCH /files/attachments/upload_123 \
  -H "Upload-Offset: 0" \
  -H "Content-Type: application/offset+octet-stream" \
  -H "Authorization: Bearer your-token" \
  --data-binary @chunk1.bin
```

4. **Check Progress** (HEAD):
```bash
curl -I /files/attachments/upload_123
```

5. **Download** (GET):
```bash
curl /files/attachments/upload_123
```

## File Structure

```
src/module/upload/
├── handler/
│   ├── index.ts          # Export all handlers
│   ├── uploadFiles.ts    # Legacy multipart upload
│   ├── tusOptions.ts     # TUS OPTIONS requests
│   ├── tusCreate.ts      # TUS POST (create)
│   ├── tusPatch.ts       # TUS PATCH (upload)
│   ├── tusGet.ts         # TUS GET (download)
│   ├── tusHead.ts        # TUS HEAD (status)
│   ├── tusDelete.ts      # TUS DELETE (cancel)
│   └── tusUtils.ts       # Shared utilities
├── route.ts              # Route registration
└── README.md             # This file
```

## OpenAPI Documentation

All handlers include comprehensive OpenAPI schemas with:
- Request/response types
- Header specifications
- Error codes and messages
- Example values
- Detailed descriptions

The OpenAPI docs are automatically generated and available at your API documentation endpoint.
