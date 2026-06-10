import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { CapacityError, ValidationError } from "../errors.js";
import { createSupabaseAuth } from "../middleware/supabase-auth.js";

const SUPPORT_REPLY =
  "It sounds heavy. You don't have to carry this alone. Tap Support to reach a person who can listen.";
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const DEFAULT_LIMITS = {
  maxMessageLength: 2_000,
  maxHistoryItems: 12,
  maxPromptCharacters: 12_000,
};

export function parseChatRequest(body, limits = DEFAULT_LIMITS) {
  const { message, intent = "general", history = [] } = body ?? {};
  const { maxMessageLength, maxHistoryItems, maxPromptCharacters } = limits;

  if (typeof message !== "string" || !message.trim()) {
    throw new ValidationError("message is required");
  }
  if (message.length > maxMessageLength) {
    throw new ValidationError(
      `message must be at most ${maxMessageLength} characters`,
    );
  }
  if (typeof intent !== "string") {
    throw new ValidationError("intent must be a string");
  }
  const normalizedIntent = intent.trim().toLowerCase();
  if (!["general", "support"].includes(normalizedIntent)) {
    throw new ValidationError("intent must be general or support");
  }
  if (!Array.isArray(history) || history.length > maxHistoryItems) {
    throw new ValidationError(
      `history must contain at most ${maxHistoryItems} messages`,
    );
  }

  let promptCharacters = message.length;
  const normalizedHistory = history.map((item, index) => {
    if (
      !item ||
      typeof item !== "object" ||
      !ALLOWED_ROLES.has(item.role) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      item.content.length > maxMessageLength
    ) {
      throw new ValidationError(`history[${index}] is invalid`);
    }

    promptCharacters += item.content.length;
    return { role: item.role, content: item.content.trim() };
  });
  if (promptCharacters > maxPromptCharacters) {
    throw new ValidationError(
      `message and history must total at most ${maxPromptCharacters} characters`,
    );
  }

  return {
    message: message.trim(),
    intent: normalizedIntent,
    history: normalizedHistory,
  };
}

export function createChatHandler({
  mistralClient,
  requestLimits = DEFAULT_LIMITS,
  maxConcurrentChats = 8,
}) {
  let activeChats = 0;

  return async function chatHandler(req, res) {
    const { message, intent, history } = parseChatRequest(
      req.body,
      requestLimits,
    );
    res.set("Cache-Control", "no-store");

    if (intent === "support") {
      return res.json({ reply: SUPPORT_REPLY });
    }

    if (activeChats >= maxConcurrentChats) {
      throw new CapacityError();
    }

    activeChats += 1;
    const controller = new AbortController();
    const abortUpstream = () => controller.abort();
    req.once?.("aborted", abortUpstream);

    try {
      const reply = await mistralClient.complete({
        message,
        history,
        signal: controller.signal,
      });
      return res.json({ reply });
    } finally {
      req.off?.("aborted", abortUpstream);
      activeChats -= 1;
    }
  };
}

export function createChatRouter({
  mistralClient,
  authVerifier,
  rateLimit: requestLimit = 10,
  rateWindowMs = 60_000,
  maxConcurrentChats = 8,
  requestLimits = DEFAULT_LIMITS,
}) {
  const router = Router();
  const ipLimiter = rateLimit({
    windowMs: rateWindowMs,
    limit: requestLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many chat requests. Please try again shortly.",
      },
    },
  });
  const userLimiter = rateLimit({
    windowMs: rateWindowMs,
    limit: requestLimit,
    keyGenerator: (req) => req.auth.userId,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many chat requests. Please try again shortly.",
      },
    },
  });

  router.post(
    "/",
    ipLimiter,
    createSupabaseAuth(authVerifier),
    userLimiter,
    createChatHandler({
      mistralClient,
      requestLimits,
      maxConcurrentChats,
    }),
  );

  return router;
}
