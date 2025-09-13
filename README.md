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

- `GET /` - List all available endpoints
- `GET /container/<ID>` - Start a Node.js container for each ID with a 2m timeout
- `GET /container/<ID>/health` - Check container health
- `GET /container/<ID>/env` - Show container environment info
- `GET /lb` - Load balance requests over multiple containers
- `GET /error` - Start a container that errors (demonstrates error handling)
- `GET /singleton` - Get a single specific container instance

## Architecture

- **Worker**: TypeScript Worker using Hono framework that routes requests to containers
- **Container**: Node.js TypeScript application using Hono framework running inside Docker containers
- **Durable Objects**: Each container instance is backed by a Durable Object for state management
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
