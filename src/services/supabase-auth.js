import { createRemoteJWKSet, jwtVerify } from "jose";

export function createSupabaseAuthVerifier({ supabaseUrl, jwks: suppliedJwks }) {
  const issuer = `${supabaseUrl}/auth/v1`;
  const jwks =
    suppliedJwks ??
    createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
      cooldownDuration: 10 * 60 * 1_000,
      timeoutDuration: 5_000,
    });

  return {
    async verifyAccessToken(token) {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: "authenticated",
        algorithms: ["ES256", "RS256"],
      });

      if (
        typeof payload.sub !== "string" ||
        !payload.sub ||
        payload.role !== "authenticated"
      ) {
        throw new Error("Token does not represent an authenticated user");
      }

      return {
        userId: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    },
  };
}
