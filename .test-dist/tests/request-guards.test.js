"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const request_guards_1 = require("../lib/request-guards");
(0, node_test_1.default)("bounded text rejects empty and oversized payloads", () => {
    strict_1.default.throws(() => (0, request_guards_1.requireBoundedText)("", "resumeText"), request_guards_1.RequestBoundaryError);
    strict_1.default.throws(() => (0, request_guards_1.requireBoundedText)("x".repeat(32), "resumeText", 16), (error) => error instanceof request_guards_1.RequestBoundaryError && error.status === 413);
    strict_1.default.equal((0, request_guards_1.requireBoundedText)("valid", "resumeText", 16), "valid");
});
(0, node_test_1.default)("bounded JSON requires an object and enforces encoded size", () => {
    strict_1.default.throws(() => (0, request_guards_1.requireBoundedJsonObject)([], "payload"), request_guards_1.RequestBoundaryError);
    strict_1.default.throws(() => (0, request_guards_1.requireBoundedJsonObject)({ body: "x".repeat(50) }, "payload", 16), (error) => error instanceof request_guards_1.RequestBoundaryError && error.status === 413);
});
(0, node_test_1.default)("request reader rejects declared and actual oversized bodies", async () => {
    const declared = new Request("https://example.invalid", {
        method: "POST",
        headers: { "content-length": "4096" },
        body: JSON.stringify({ ok: true }),
    });
    await strict_1.default.rejects(() => (0, request_guards_1.readBoundedRequestJson)(declared, 64), (error) => error instanceof request_guards_1.RequestBoundaryError && error.status === 413);
    const actual = new Request("https://example.invalid", {
        method: "POST",
        body: JSON.stringify({ body: "x".repeat(256) }),
    });
    await strict_1.default.rejects(() => (0, request_guards_1.readBoundedRequestJson)(actual, 64), (error) => error instanceof request_guards_1.RequestBoundaryError && error.status === 413);
});
(0, node_test_1.default)("request reader rejects malformed JSON instead of turning it into a server error", async () => {
    const request = new Request("https://example.invalid", {
        method: "POST",
        body: "{not-json",
    });
    await strict_1.default.rejects(() => (0, request_guards_1.readBoundedRequestJson)(request), (error) => error instanceof request_guards_1.RequestBoundaryError && error.status === 400);
});
