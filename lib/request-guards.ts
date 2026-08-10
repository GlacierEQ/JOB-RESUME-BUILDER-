export const TEXT_LIMIT_BYTES = 256 * 1024;
export const JSON_LIMIT_BYTES = 1024 * 1024;

export class RequestBoundaryError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestBoundaryError";
    this.status = status;
  }
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBoundaryError(
          `Request body exceeds the ${maxBytes}-byte boundary.`,
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
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

export async function readBoundedRequestJson<T extends Record<string, unknown>>(
  request: Request,
  maxBytes = JSON_LIMIT_BYTES,
): Promise<T> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestBoundaryError(
      `Request body exceeds the ${maxBytes}-byte boundary.`,
      413,
    );
  }

  const text = await readBoundedBody(request, maxBytes);
  if (!text.trim()) {
    throw new RequestBoundaryError("Request body is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestBoundaryError("Request body is not valid JSON.");
  }
  return requireBoundedJsonObject<T>(parsed, "request", maxBytes);
}

export function requireBoundedText(
  value: unknown,
  field: string,
  maxBytes = TEXT_LIMIT_BYTES,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RequestBoundaryError(`${field} must be a non-empty string.`);
  }
  if (byteLength(value) > maxBytes) {
    throw new RequestBoundaryError(
      `${field} exceeds the ${maxBytes}-byte request boundary.`,
      413,
    );
  }
  return value;
}

export function requireBoundedJsonObject<T extends Record<string, unknown>>(
  value: unknown,
  field: string,
  maxBytes = JSON_LIMIT_BYTES,
): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestBoundaryError(`${field} must be a JSON object.`);
  }
  let rendered: string;
  try {
    rendered = JSON.stringify(value);
  } catch {
    throw new RequestBoundaryError(`${field} must be JSON serializable.`);
  }
  if (byteLength(rendered) > maxBytes) {
    throw new RequestBoundaryError(
      `${field} exceeds the ${maxBytes}-byte request boundary.`,
      413,
    );
  }
  return value as T;
}

export function requestBoundaryStatus(error: unknown): number {
  if (error instanceof RequestBoundaryError) return error.status;
  if (error instanceof Error && error.name === "ZodError") return 400;
  return 500;
}
