const TEXT_LIMIT_BYTES = 256 * 1024;
const JSON_LIMIT_BYTES = 1024 * 1024;

export class RequestBoundaryError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestBoundaryError";
    this.status = status;
  }
}

function bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function requireBoundedText(
  value: unknown,
  field: string,
  maxBytes = TEXT_LIMIT_BYTES,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RequestBoundaryError(`${field} must be a non-empty string.`);
  }
  if (bytes(value) > maxBytes) {
    throw new RequestBoundaryError(`${field} exceeds the ${maxBytes}-byte request boundary.`, 413);
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
  if (bytes(rendered) > maxBytes) {
    throw new RequestBoundaryError(`${field} exceeds the ${maxBytes}-byte request boundary.`, 413);
  }
  return value as T;
}

export function requestBoundaryStatus(error: unknown): number {
  return error instanceof RequestBoundaryError ? error.status : 500;
}
