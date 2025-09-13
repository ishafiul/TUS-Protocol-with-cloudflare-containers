import { Container, getContainer, getRandom } from "@cloudflare/containers";
import { Hono } from "hono";

export class MyContainer extends Container<Env> {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;
  // Time before container sleeps due to inactivity (default: 30s)
  sleepAfter = "5m";
  // Environment variables passed to the container
  envVars = {
    MESSAGE: "I was passed in via the container class!",
  };

  // Optional lifecycle hooks
  override onStart() {
    console.log("Container successfully started");
  }

  override onStop() {
    console.log("Container successfully shut down");
  }

  override onError(error: unknown) {
    console.log("Container error:", error);
  }
}

// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono<{
  Bindings: Env;
}>();

// Home route - serve static HTML file
app.get("/", async (c) => {
  return c.env.ASSETS.fetch(new Request(c.req.url));
});

// API info route
app.get("/api/info", (c) => {
  return c.text(
    "Available endpoints:\n" +
      "GET /container/<ID> - Start a Node.js TypeScript container for each ID with a 5m timeout\n" +
      "GET /container/<ID>/health - Check container health\n" +
      "GET /container/<ID>/env - Show container environment\n" +
      "GET /lb - Load balance requests over multiple containers\n" +
      "GET /error - Start a container that errors (demonstrates error handling)\n" +
      "GET /singleton - Get a single specific container instance",
  );
});

// Route requests to a specific container using the container ID
app.get("/container/:id", async (c) => {
  const id = c.req.param("id");
  const containerId = c.env.MY_CONTAINER.idFromName(`/container/${id}`);
  console.log(containerId)
  const container = c.env.MY_CONTAINER.get(containerId);
  const url = new URL(c.req.url);
  url.pathname = `/${id}`;
  const containerRequest = new Request(url.toString(), c.req);
  const response = await container.fetch(containerRequest);
  console.log(response)
  return response;
});

// Route requests to container health endpoint
app.get("/container/:id/health", async (c) => {
  const id = c.req.param("id");
  const containerId = c.env.MY_CONTAINER.idFromName(`/container/${id}`);
  const container = c.env.MY_CONTAINER.get(containerId);
  const url = new URL(c.req.url);
  url.pathname = "/health";
  const healthRequest = new Request(url.toString(), c.req);
  return await container.fetch(healthRequest);
});

// Route requests to container env endpoint
app.get("/container/:id/env", async (c) => {
  const id = c.req.param("id");
  const containerId = c.env.MY_CONTAINER.idFromName(`/container/${id}`);
  const container = c.env.MY_CONTAINER.get(containerId);
  const url = new URL(c.req.url);
  url.pathname = "/env";
  const envRequest = new Request(url.toString(), c.req);
  return await container.fetch(envRequest);
});

// Demonstrate error handling - this route forces a panic in the container
app.get("/error", async (c) => {
  const container = getContainer(c.env.MY_CONTAINER, "error-test");
  return await container.fetch(c.req.raw);
});

// Load balance requests across multiple containers
app.get("/lb", async (c) => {
  const container = await getRandom(c.env.MY_CONTAINER, 3);
  return await container.fetch(c.req.raw);
});

// Get a single container instance (singleton pattern)
app.get("/singleton", async (c) => {
  const container = getContainer(c.env.MY_CONTAINER);
  return await container.fetch(c.req.raw);
});

export default app;
