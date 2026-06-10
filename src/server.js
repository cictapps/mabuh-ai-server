import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig, validateConfig } from "./config.js";
import { createMistralClient } from "./services/mistral.js";

const config = loadConfig();
validateConfig(config);
const mistralClient = createMistralClient({
  apiKey: config.mistralApiKey,
  model: config.mistralModel,
  timeoutMs: config.mistralTimeoutMs,
});
const app = createApp({ config, mistralClient });
const server = createServer(app);

server.headersTimeout = 10_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;
server.maxRequestsPerSocket = 100;

server.listen(config.port, () => {
  console.log(`Mabuh chat server listening on port ${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close server cleanly", error);
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
