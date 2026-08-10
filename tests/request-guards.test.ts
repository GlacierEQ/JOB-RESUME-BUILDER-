import assert from "node:assert/strict";
import test from "node:test";
import {
  RequestBoundaryError,
  readBoundedRequestJson,
  requireBoundedJsonObject,
  requireBoundedText,
} from "../lib/request-guards";

test("bounded text rejects empty and oversized payloads", () => {
  assert.throws(() => requireBoundedText("", "resumeText"), RequestBoundaryError);
  assert.throws(
    () => requireBoundedText("x".repeat(32), "resumeText", 16),
    (error: unknown) => error instanceof RequestBoundaryError && error.status === 413,
  );
  assert.equal(requireBoundedText("valid", "resumeText", 16), "valid");
});

test("bounded JSON requires an object and enforces encoded size", () => {
  assert.throws(() => requireBoundedJsonObject([], "payload"), RequestBoundaryError);
  assert.throws(
    () => requireBoundedJsonObject({ body: "x".repeat(50) }, "payload", 16),
    (error: unknown) => error instanceof RequestBoundaryError && error.status === 413,
  );
});

test("request reader rejects declared and actual oversized bodies", async () => {
  const declared = new Request("https://example.invalid", {
    method: "POST",
    headers: { "content-length": "4096" },
    body: JSON.stringify({ ok: true }),
  });
  await assert.rejects(
    () => readBoundedRequestJson(declared, 64),
    (error: unknown) => error instanceof RequestBoundaryError && error.status === 413,
  );

  const actual = new Request("https://example.invalid", {
    method: "POST",
    body: JSON.stringify({ body: "x".repeat(256) }),
  });
  await assert.rejects(
    () => readBoundedRequestJson(actual, 64),
    (error: unknown) => error instanceof RequestBoundaryError && error.status === 413,
  );
});

test("request reader rejects malformed JSON instead of turning it into a server error", async () => {
  const request = new Request("https://example.invalid", {
    method: "POST",
    body: "{not-json",
  });
  await assert.rejects(
    () => readBoundedRequestJson(request),
    (error: unknown) => error instanceof RequestBoundaryError && error.status === 400,
  );
});
