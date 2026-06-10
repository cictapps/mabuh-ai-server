import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requestId } from "../src/middleware/request-id.js";

function invokeRequestId(suppliedId) {
  const req = {
    get(name) {
      return name === "x-request-id" ? suppliedId : undefined;
    },
  };
  const res = {
    set(_name, value) {
      this.id = value;
    },
  };
  let nextCalled = false;

  requestId(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

describe("request IDs", () => {
  it("preserves safe caller-provided IDs", () => {
    const result = invokeRequestId("mobile-client_123");

    assert.equal(result.req.id, "mobile-client_123");
    assert.equal(result.res.id, "mobile-client_123");
    assert.equal(result.nextCalled, true);
  });

  it("replaces IDs containing log-control characters", () => {
    const result = invokeRequestId("request\u001b[31m");

    assert.notEqual(result.req.id, "request\u001b[31m");
    assert.match(result.req.id, /^[0-9a-f-]{36}$/);
  });
});
