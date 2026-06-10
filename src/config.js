const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTrustProxy = (value) => {
  if (!value || value === "false" || value === "0") {
    return false;
  }
  if (value === "true") {
    return true;
  }

  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
};

const parseList = (value) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: parseInteger(env.PORT, 3000),
    mistralApiKey: env.MISTRAL_API_KEY?.trim() ?? "",
    mistralModel: env.MISTRAL_MODEL?.trim() || "mistral-small-latest",
    mistralTimeoutMs: parseInteger(env.MISTRAL_TIMEOUT_MS, 15_000),
    corsOrigin: env.CORS_ORIGIN?.trim() || "*",
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    chatApiKeys: parseList(env.CHAT_API_KEYS),
    chatRateLimit: parseInteger(env.CHAT_RATE_LIMIT, 10),
    chatRateWindowMs: parseInteger(env.CHAT_RATE_WINDOW_MS, 60_000),
    maxConcurrentChats: parseInteger(env.MAX_CONCURRENT_CHATS, 8),
    maxMessageLength: parseInteger(env.MAX_MESSAGE_LENGTH, 2_000),
    maxHistoryItems: parseInteger(env.MAX_HISTORY_ITEMS, 12),
    maxPromptCharacters: parseInteger(env.MAX_PROMPT_CHARACTERS, 12_000),
  };
}

export function validateConfig(config) {
  const errors = [];

  if (config.nodeEnv === "production" && config.chatApiKeys.length === 0) {
    errors.push("CHAT_API_KEYS must contain at least one key in production");
  }
  if (
    config.nodeEnv === "production" &&
    config.chatApiKeys.some((key) => key.length < 32)
  ) {
    errors.push("every CHAT_API_KEYS value must be at least 32 characters");
  }
  if (config.nodeEnv === "production" && config.corsOrigin === "*") {
    errors.push("CORS_ORIGIN must not be '*' in production");
  }
  if (config.nodeEnv === "production" && config.trustProxy === true) {
    errors.push("TRUST_PROXY must be a specific proxy hop count in production");
  }
  if (config.maxPromptCharacters < config.maxMessageLength) {
    errors.push("MAX_PROMPT_CHARACTERS must be at least MAX_MESSAGE_LENGTH");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join("; ")}`);
  }
}
