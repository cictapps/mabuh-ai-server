import { randomUUID } from "node:crypto";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

export function requestId(req, res, next) {
  const suppliedId = req.get("x-request-id");
  const id =
    typeof suppliedId === "string" && SAFE_REQUEST_ID.test(suppliedId)
      ? suppliedId
      : randomUUID();
  req.id = id;
  res.set("x-request-id", id);
  next();
}
