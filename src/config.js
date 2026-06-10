const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value) => value === "true" || value === "1";

export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: parseInteger(env.PORT, 3000),
    mistralApiKey: env.MISTRAL_API_KEY?.trim() ?? "",
    mistralModel: env.MISTRAL_MODEL?.trim() || "mistral-small-latest",
    mistralTimeoutMs: parseInteger(env.MISTRAL_TIMEOUT_MS, 15_000),
    corsOrigin: env.CORS_ORIGIN?.trim() || "*",
    trustProxy: parseBoolean(env.TRUST_PROXY),
  };
}
