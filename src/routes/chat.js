import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { ValidationError } from "../errors.js";

const SUPPORT_REPLY =
  "It sounds heavy. You don't have to carry this alone. Tap Support to reach a person who can listen.";
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_ITEMS = 20;

export function parseChatRequest(body) {
  const { message, intent = "general", history = [] } = body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    throw new ValidationError("message is required");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(
      `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
    );
  }
  if (typeof intent !== "string") {
    throw new ValidationError("intent must be a string");
  }
  if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
    throw new ValidationError(
      `history must contain at most ${MAX_HISTORY_ITEMS} messages`,
    );
  }

  const normalizedHistory = history.map((item, index) => {
    if (
      !item ||
      typeof item !== "object" ||
      !ALLOWED_ROLES.has(item.role) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      item.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new ValidationError(`history[${index}] is invalid`);
    }

    return { role: item.role, content: item.content.trim() };
  });

  return {
    message: message.trim(),
    intent: intent.trim().toLowerCase(),
    history: normalizedHistory,
  };
}

export function createChatHandler({ mistralClient }) {
  return async function chatHandler(req, res) {
    const { message, intent, history } = parseChatRequest(req.body);

    if (intent === "support") {
      return res.json({ reply: SUPPORT_REPLY });
    }

    const reply = await mistralClient.complete({ message, history });
    return res.json({ reply });
  };
}

export function createChatRouter({ mistralClient }) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many chat requests. Please try again shortly.",
      },
    },
  });

  router.post("/", limiter, createChatHandler({ mistralClient }));

  return router;
}
