# Cloudflare Containers with Node.js and Hono

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/containers-template)

![Containers Template Preview](https://imagedelivery.net/_yJ02hpOMj_EnGvsU2aygw/5aba1fb7-b937-46fd-fa67-138221082200/public)

<!-- dash-content-start -->

This is a [Container](https://developers.cloudflare.com/containers/) project using **Node.js, TypeScript, and Hono framework** instead of Go.

It demonstrates:
- Node.js TypeScript container with Hono framework
- Container configuration, launching and routing
- Load balancing over multiple containers
- Health checks and environment information
- Error handling and lifecycle hooks
- TypeScript compilation and type safety

<!-- dash-content-end -->

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/containers-template
```

## Getting Started

First, run:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then run the development server (using the package manager of your choice):

```bash
npm run dev
```

Open [http://localhost:8787](http://localhost:8787) with your browser to see the result.

## Available Endpoints

### Container Management
- `GET /` - List all available endpoints
- `GET /container/<ID>` - Start a Node.js container for each ID with a 2m timeout
- `GET /container/<ID>/health` - Check container health
- `GET /container/<ID>/env` - Show container environment info
- `GET /lb` - Load balance requests over multiple containers
- `GET /error` - Start a container that errors (demonstrates error handling)
- `GET /singleton` - Get a single specific container instance

### File Upload & Processing
- `POST /api/upload` - Upload files with TUS protocol support
- `POST /api/upload/files` - Direct file upload endpoint

### Files Management
- `GET /api/files` - List all files with pagination and filtering
- `GET /api/files/:fileId/download` - Download original file
- `GET /api/files/:fileId/download/converted/:convertedFileId` - Download converted file
- `GET /api/files/:fileId/preview` - Preview image files

### Gallery Preview
- `GET /show` - Interactive file gallery with Mux player for videos and fullscreen image viewer

### Video Streaming
- `GET /video/:fileId/master.m3u8` - Master playlist for adaptive streaming
- `GET /video/:fileId/:resolution.m3u8` - Media playlist for specific resolution (360p, 480p, 720p, 1080p)

### API Documentation
- `GET /docs` - Interactive API documentation
- `GET /docs.json` - OpenAPI specification

## Environment Variables

### Required Variables

- `POSTGRES_CONNECTION_STRING`: Neon database connection string
- `R2_ENDPOINT`: R2 endpoint URL (e.g., `https://your-account-id.r2.cloudflarestorage.com`)
- `R2_ACCESS_KEY_ID`: R2 access key ID
- `R2_SECRET_ACCESS_KEY`: R2 secret access key

### Optional Variables

- `R2_BUCKET_NAME`: R2 bucket name (default: `attachments`)
- `NODE_ENV`: Node environment (default: `production`)
- `PORT`: Container port (default: `8080`)
- `MESSAGE`: Custom message for process endpoint (default: `CF Container App`)

### Docker Environment Setup

The Dockerfile includes all necessary environment variables with defaults. Override them when running the container:

```bash
docker run -e POSTGRES_CONNECTION_STRING="your-db-url" \
           -e R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com" \
           -e R2_ACCESS_KEY_ID="your-key" \
           -e R2_SECRET_ACCESS_KEY="your-secret" \
           your-container-image
```

## Architecture

- **Worker**: TypeScript Worker using Hono framework that routes requests to containers and serves video streams
- **Container**: Node.js TypeScript application using Hono framework for video processing and file conversion
- **Durable Objects**: Each container instance is backed by a Durable Object for state management
- **R2 Storage**: Cloudflare R2 for storing processed videos and M3U8 playlists
- **Database**: PostgreSQL (Neon) for metadata storage
- **Video Processing**: MP4 conversion with multiple resolutions and HLS adaptive streaming
- **Build Process**: TypeScript compilation with source maps and type declarations

You can start editing your Worker by modifying `src/index.ts` and you can start
editing your Container by editing the content of `container_src`.

## Deploying To Production

| Command          | Action                                |
| :--------------- | :------------------------------------ |
| `npm run deploy` | Deploy your application to Cloudflare |

## Learn More

To learn more about Containers, take a look at the following resources:

- [Container Documentation](https://developers.cloudflare.com/containers/) - learn about Containers
- [Container Class](https://github.com/cloudflare/containers) - learn about the Container helper class

Your feedback and contributions are welcome!
