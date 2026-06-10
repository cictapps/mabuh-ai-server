import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createChatRouter } from "./routes/chat.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export function createApp({ config, mistralClient }) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin:
        config.corsOrigin === "*"
          ? "*"
          : config.corsOrigin.split(",").map((origin) => origin.trim()),
    }),
  );
  app.use(requestId);
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/ready", (_req, res) => {
    const ready = Boolean(config.mistralApiKey);
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
    });
  });
  app.use("/chat", createChatRouter({ mistralClient }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
