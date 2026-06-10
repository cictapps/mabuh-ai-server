import { AppError } from "../errors.js";

export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: req.id,
    },
  });
}

export function errorHandler(error, req, res, _next) {
  const isMalformedJson =
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error;
  const isKnownError = error instanceof AppError || isMalformedJson;
  const status = isMalformedJson ? 400 : isKnownError ? error.status : 500;

  if (!isKnownError) {
    console.error(`[${req.id}]`, error);
  }

  res.status(status).json({
    error: {
      code: isMalformedJson
        ? "MALFORMED_JSON"
        : isKnownError
          ? error.code
          : "INTERNAL_ERROR",
      message: isMalformedJson
        ? "Request body contains invalid JSON"
        : isKnownError
          ? error.message
          : "An unexpected error occurred",
      requestId: req.id,
    },
  });
}
