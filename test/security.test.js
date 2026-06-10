import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig, validateConfig } from "../src/config.js";
import { AuthenticationError } from "../src/errors.js";
import { createApiKeyAuth } from "../src/middleware/api-key.js";

function runAuth(apiKeys, authorization) {
  const middleware = createApiKeyAuth(apiKeys);
  let receivedError;
  middleware(
    {
      get(name) {
        return name === "authorization" ? authorization : undefined;
      },
    },
    {},
    (error) => {
      receivedError = error;
    },
  );
  return receivedError;
}

describe("API key authentication", () => {
  it("accepts a configured bearer token", () => {
    assert.equal(runAuth(["secret-key"], "Bearer secret-key"), undefined);
  });

  it("rejects missing and invalid bearer tokens", () => {
    assert.ok(runAuth(["secret-key"]) instanceof AuthenticationError);
    assert.ok(
      runAuth(["secret-key"], "Bearer wrong-key") instanceof
        AuthenticationError,
    );
  });

  it("allows disabled authentication outside production", () => {
    assert.equal(runAuth([], undefined), undefined);
  });
});

describe("security configuration", () => {
  it("parses abuse-control settings", () => {
    const config = loadConfig({
      CHAT_API_KEYS: "first, second",
      CHAT_RATE_LIMIT: "5",
      MAX_CONCURRENT_CHATS: "3",
      TRUST_PROXY: "1",
    });

    assert.deepEqual(config.chatApiKeys, ["first", "second"]);
    assert.equal(config.chatRateLimit, 5);
    assert.equal(config.maxConcurrentChats, 3);
    assert.equal(config.trustProxy, 1);
  });

  it("fails closed for insecure production settings", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      CORS_ORIGIN: "*",
      TRUST_PROXY: "true",
    });

    assert.throws(
      () => validateConfig(config),
      /CHAT_API_KEYS.*CORS_ORIGIN.*TRUST_PROXY/,
    );
  });

  it("rejects weak production API keys", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      CHAT_API_KEYS: "short-key",
      CORS_ORIGIN: "https://app.example.com",
    });

    assert.throws(() => validateConfig(config), /at least 32 characters/);
  });
});
