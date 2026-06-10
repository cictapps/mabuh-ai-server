import { randomUUID } from "node:crypto";

export function requestId(req, res, next) {
  const id = req.get("x-request-id")?.slice(0, 100) || randomUUID();
  req.id = id;
  res.set("x-request-id", id);
  next();
}
