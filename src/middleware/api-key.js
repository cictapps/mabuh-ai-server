import { createHash, timingSafeEqual } from "node:crypto";
import { AuthenticationError } from "../errors.js";

const digest = (value) => createHash("sha256").update(value).digest();

export function createApiKeyAuth(apiKeys) {
  const acceptedDigests = apiKeys.map(digest);

  return function apiKeyAuth(req, _res, next) {
    if (acceptedDigests.length === 0) {
      return next();
    }

    const authorization = req.get("authorization") ?? "";
    const match = authorization.match(/^Bearer ([^\s]+)$/);
    const candidateDigest = digest(match?.[1] ?? "");
    const authenticated = acceptedDigests.some((acceptedDigest) =>
      timingSafeEqual(candidateDigest, acceptedDigest),
    );

    if (!authenticated) {
      return next(new AuthenticationError());
    }

    return next();
  };
}
