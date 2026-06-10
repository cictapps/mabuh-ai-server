import { AuthenticationError } from "../errors.js";

export function createSupabaseAuth(authVerifier) {
  return async function supabaseAuth(req, _res, next) {
    const authorization = req.get("authorization") ?? "";
    const match = authorization.match(/^Bearer ([^\s]+)$/);

    if (!match) {
      return next(new AuthenticationError());
    }

    try {
      req.auth = await authVerifier.verifyAccessToken(match[1]);
      return next();
    } catch {
      return next(new AuthenticationError("The Supabase session is invalid or expired"));
    }
  };
}
