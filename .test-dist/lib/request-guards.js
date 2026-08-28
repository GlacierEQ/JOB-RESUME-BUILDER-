"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBoundaryError = exports.JSON_LIMIT_BYTES = exports.TEXT_LIMIT_BYTES = void 0;
exports.byteLength = byteLength;
exports.readBoundedRequestJson = readBoundedRequestJson;
exports.requireBoundedText = requireBoundedText;
exports.requireBoundedJsonObject = requireBoundedJsonObject;
exports.requestBoundaryStatus = requestBoundaryStatus;
exports.TEXT_LIMIT_BYTES = 256 * 1024;
exports.JSON_LIMIT_BYTES = 1024 * 1024;
class RequestBoundaryError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.name = "RequestBoundaryError";
        this.status = status;
    }
}
exports.RequestBoundaryError = RequestBoundaryError;
function byteLength(value) {
    return new TextEncoder().encode(value).byteLength;
}
async function readBoundedBody(request, maxBytes) {
    if (!request.body)
        return "";
    const reader = request.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (!value?.byteLength)
                continue;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel().catch(() => undefined);
                throw new RequestBoundaryError(`Request body exceeds the ${maxBytes}-byte boundary.`, 413);
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bounded = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bounded.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bounded);
}
async function readBoundedRequestJson(request, maxBytes = exports.JSON_LIMIT_BYTES) {
    const declared = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declared) && declared > maxBytes) {
        throw new RequestBoundaryError(`Request body exceeds the ${maxBytes}-byte boundary.`, 413);
    }
    const text = await readBoundedBody(request, maxBytes);
    if (!text.trim()) {
        throw new RequestBoundaryError("Request body is empty.");
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw new RequestBoundaryError("Request body is not valid JSON.");
    }
    return requireBoundedJsonObject(parsed, "request", maxBytes);
}
function requireBoundedText(value, field, maxBytes = exports.TEXT_LIMIT_BYTES) {
    if (typeof value !== "string" || !value.trim()) {
        throw new RequestBoundaryError(`${field} must be a non-empty string.`);
    }
    if (byteLength(value) > maxBytes) {
        throw new RequestBoundaryError(`${field} exceeds the ${maxBytes}-byte request boundary.`, 413);
    }
    return value;
}
function requireBoundedJsonObject(value, field, maxBytes = exports.JSON_LIMIT_BYTES) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new RequestBoundaryError(`${field} must be a JSON object.`);
    }
    let rendered;
    try {
        rendered = JSON.stringify(value);
    }
    catch {
        throw new RequestBoundaryError(`${field} must be JSON serializable.`);
    }
    if (byteLength(rendered) > maxBytes) {
        throw new RequestBoundaryError(`${field} exceeds the ${maxBytes}-byte request boundary.`, 413);
    }
    return value;
}
function requestBoundaryStatus(error) {
    if (error instanceof RequestBoundaryError)
        return error.status;
    if (error instanceof Error && error.name === "ZodError")
        return 400;
    return 500;
}
