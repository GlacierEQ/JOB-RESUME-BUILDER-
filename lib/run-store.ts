import type {
  GapAnalysis,
  JobDescriptionProfile,
  MatchScore,
  ResumeProfile,
  TailoredResume,
} from "./schemas";

export type RunStage = "ANALYZED" | "TAILORED" | "REVIEWED" | "EXPORTED";

export interface StoredTailoringRun {
  readonly schema: "glaciereq.local-tailoring-run.v1";
  readonly id: string;
  readonly revision: number;
  readonly stage: RunStage;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly resumeText: string;
  readonly jobDescriptionText: string;
  readonly resume: ResumeProfile;
  readonly jobDescription: JobDescriptionProfile;
  readonly originalMatch: MatchScore;
  readonly gapAnalysis: GapAnalysis;
  readonly tailoredResume?: TailoredResume;
  readonly tailoredMatch?: MatchScore;
  readonly reviewedAt?: string;
  readonly exportedAt?: string;
}

export interface RunStore {
  put(run: StoredTailoringRun, expectedRevision?: number): Promise<StoredTailoringRun>;
  get(id: string): Promise<StoredTailoringRun | null>;
  list(): Promise<readonly StoredTailoringRun[]>;
  delete(id: string): Promise<void>;
  purgeExpired(now?: Date): Promise<number>;
  clear(): Promise<void>;
}

const DB_NAME = "resume-shapeshifter-private-runs";
const STORE_NAME = "runs";
const DB_VERSION = 1;
export const DEFAULT_RETENTION_DAYS = 7;

function datePlusDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function createRun(
  input: Omit<StoredTailoringRun, "schema" | "revision" | "createdAt" | "updatedAt" | "expiresAt">,
  now = new Date(),
  retentionDays = DEFAULT_RETENTION_DAYS,
): StoredTailoringRun {
  if (!input.id.trim()) throw new Error("run id is required");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0 || retentionDays > 30) {
    throw new Error("retentionDays must be between 1 and 30");
  }
  const timestamp = now.toISOString();
  return {
    schema: "glaciereq.local-tailoring-run.v1",
    revision: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: datePlusDays(now, retentionDays),
    ...input,
  };
}

export function advanceRun(
  current: StoredTailoringRun,
  patch: Partial<Omit<StoredTailoringRun, "schema" | "id" | "revision" | "createdAt">>,
  now = new Date(),
): StoredTailoringRun {
  return {
    ...current,
    ...patch,
    schema: "glaciereq.local-tailoring-run.v1",
    id: current.id,
    createdAt: current.createdAt,
    revision: current.revision + 1,
    updatedAt: now.toISOString(),
  };
}

function validateRun(value: unknown): StoredTailoringRun {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stored run is not an object");
  }
  const run = value as Partial<StoredTailoringRun>;
  if (run.schema !== "glaciereq.local-tailoring-run.v1") throw new Error("unsupported stored run schema");
  if (typeof run.id !== "string" || !run.id) throw new Error("stored run id is invalid");
  if (!Number.isInteger(run.revision) || (run.revision ?? -1) < 0) throw new Error("stored run revision is invalid");
  if (!run.createdAt || !run.updatedAt || !run.expiresAt) throw new Error("stored run timestamps are incomplete");
  return value as StoredTailoringRun;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable in this runtime"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("failed to open private run database"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("expiresAt", "expiresAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export class IndexedDbRunStore implements RunStore {
  async put(run: StoredTailoringRun, expectedRevision?: number): Promise<StoredTailoringRun> {
    const validated = validateRun(run);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const existing = await requestResult(store.get(validated.id)) as StoredTailoringRun | undefined;
      if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) {
        transaction.abort();
        throw new Error(`stale run revision: expected ${expectedRevision}, current ${existing.revision}`);
      }
      if (!existing && expectedRevision !== undefined && expectedRevision !== -1) {
        transaction.abort();
        throw new Error("stale run revision: run does not exist");
      }
      store.put(validated);
      await transactionDone(transaction);
      return validated;
    } finally {
      database.close();
    }
  }

  async get(id: string): Promise<StoredTailoringRun | null> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const value = await requestResult(transaction.objectStore(STORE_NAME).get(id));
      await transactionDone(transaction);
      if (value === undefined) return null;
      return validateRun(value);
    } finally {
      database.close();
    }
  }

  async list(): Promise<readonly StoredTailoringRun[]> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const values = await requestResult(transaction.objectStore(STORE_NAME).getAll());
      await transactionDone(transaction);
      return (values as unknown[])
        .map(validateRun)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } finally {
      database.close();
    }
  }

  async delete(id: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async purgeExpired(now = new Date()): Promise<number> {
    const runs = await this.list();
    const expired = runs.filter((run) => Date.parse(run.expiresAt) <= now.getTime());
    for (const run of expired) await this.delete(run.id);
    return expired.length;
  }

  async clear(): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }
}
