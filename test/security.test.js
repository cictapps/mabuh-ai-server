import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { loadConfig, validateConfig } from "../src/config.js";
import { AuthenticationError } from "../src/errors.js";
import { createSupabaseAuth } from "../src/middleware/supabase-auth.js";
import { createSupabaseAuthVerifier } from "../src/services/supabase-auth.js";

async function runAuth(authVerifier, authorization) {
  const middleware = createSupabaseAuth(authVerifier);
  let receivedError;
  const req = {
    get(name) {
      return name === "authorization" ? authorization : undefined;
    },
  };
  await middleware(
    req,
    {},
    (error) => {
      receivedError = error;
    },
  );
  return { req, receivedError };
}

async function createTokenFixture() {
  const issuer = "https://project-ref.supabase.co/auth/v1";
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "test-key";
  publicJwk.alg = "ES256";
  const verifier = createSupabaseAuthVerifier({
    supabaseUrl: "https://project-ref.supabase.co",
    jwks: createLocalJWKSet({ keys: [publicJwk] }),
  });

  const sign = (claims = {}) =>
    new SignJWT({
      role: "authenticated",
      email: "student@example.com",
      ...claims,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience("authenticated")
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

  return { verifier, sign };
}

describe("Supabase authentication", () => {
  it("accepts a valid Supabase user access token", async () => {
    const { verifier, sign } = await createTokenFixture();
    const token = await sign();
    const result = await runAuth(verifier, `Bearer ${token}`);

    assert.equal(result.receivedError, undefined);
    assert.deepEqual(result.req.auth, {
      userId: "user-123",
      email: "student@example.com",
    });
  });

  it("rejects missing and invalid bearer tokens", async () => {
    const authVerifier = {
      async verifyAccessToken() {
        throw new Error("invalid");
      },
    };

    assert.ok(
      (await runAuth(authVerifier)).receivedError instanceof
        AuthenticationError,
    );
    assert.ok(
      (await runAuth(authVerifier, "Bearer invalid")).receivedError instanceof
        AuthenticationError,
    );
  });

  it("rejects tokens without the authenticated role", async () => {
    const { verifier, sign } = await createTokenFixture();
    const token = await sign({ role: "anon" });

    await assert.rejects(
      verifier.verifyAccessToken(token),
      /authenticated user/,
    );
  });

  it("rejects tokens issued for another audience", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = "audience-key";
    const verifier = createSupabaseAuthVerifier({
      supabaseUrl: "https://project-ref.supabase.co",
      jwks: createLocalJWKSet({ keys: [publicJwk] }),
    });
    const token = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "audience-key" })
      .setIssuer("https://project-ref.supabase.co/auth/v1")
      .setAudience("other")
      .setSubject("user-123")
      .setExpirationTime("5m")
      .sign(privateKey);

    await assert.rejects(verifier.verifyAccessToken(token));
  });

  it("rejects expired access tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = "expired-key";
    const verifier = createSupabaseAuthVerifier({
      supabaseUrl: "https://project-ref.supabase.co",
      jwks: createLocalJWKSet({ keys: [publicJwk] }),
    });
    const token = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "expired-key" })
      .setIssuer("https://project-ref.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setSubject("user-123")
      .setExpirationTime("0s")
      .sign(privateKey);

    await assert.rejects(verifier.verifyAccessToken(token));
  });
});

describe("security configuration", () => {
  it("parses abuse-control settings", () => {
    const config = loadConfig({
      SUPABASE_URL: "https://project-ref.supabase.co/",
      CHAT_RATE_LIMIT: "5",
      MAX_CONCURRENT_CHATS: "3",
      TRUST_PROXY: "1",
    });

    assert.equal(config.supabaseUrl, "https://project-ref.supabase.co");
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
      /SUPABASE_URL.*CORS_ORIGIN.*TRUST_PROXY/,
    );
  });

  it("rejects insecure production authentication URLs", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      SUPABASE_URL: "http://localhost:54321",
      CORS_ORIGIN: "http://tauri.localhost",
    });

    assert.throws(() => validateConfig(config), /must use HTTPS/);
  });
});
