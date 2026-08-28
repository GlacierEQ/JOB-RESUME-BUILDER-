"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexedDbRunStore = exports.DEFAULT_RETENTION_DAYS = void 0;
exports.createRun = createRun;
exports.advanceRun = advanceRun;
const DB_NAME = "resume-shapeshifter-private-runs";
const STORE_NAME = "runs";
const DB_VERSION = 1;
exports.DEFAULT_RETENTION_DAYS = 7;
function datePlusDays(now, days) {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
function createRun(input, now = new Date(), retentionDays = exports.DEFAULT_RETENTION_DAYS) {
    if (!input.id.trim())
        throw new Error("run id is required");
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
function advanceRun(current, patch, now = new Date()) {
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
function validateRun(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("stored run is not an object");
    }
    const run = value;
    if (run.schema !== "glaciereq.local-tailoring-run.v1") {
        throw new Error("unsupported stored run schema");
    }
    if (typeof run.id !== "string" || !run.id) {
        throw new Error("stored run id is invalid");
    }
    if (!Number.isInteger(run.revision) || (run.revision ?? -1) < 0) {
        throw new Error("stored run revision is invalid");
    }
    if (!run.createdAt || !run.updatedAt || !run.expiresAt) {
        throw new Error("stored run timestamps are incomplete");
    }
    return value;
}
function openDatabase() {
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
function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
}
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
        transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
}
class IndexedDbRunStore {
    async put(run, expectedRevision) {
        const validated = validateRun(run);
        const database = await openDatabase();
        let callbackError = null;
        try {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(validated.id);
            getRequest.onsuccess = () => {
                try {
                    const existing = getRequest.result;
                    if (existing &&
                        expectedRevision !== undefined &&
                        existing.revision !== expectedRevision) {
                        throw new Error(`stale run revision: expected ${expectedRevision}, current ${existing.revision}`);
                    }
                    if (!existing &&
                        expectedRevision !== undefined &&
                        expectedRevision !== -1) {
                        throw new Error("stale run revision: run does not exist");
                    }
                    store.put(validated);
                }
                catch (error) {
                    callbackError =
                        error instanceof Error ? error : new Error("private run write failed");
                    transaction.abort();
                }
            };
            getRequest.onerror = () => {
                callbackError =
                    getRequest.error ?? new Error("failed to read existing private run");
                transaction.abort();
            };
            try {
                await transactionDone(transaction);
            }
            catch (transactionError) {
                if (callbackError)
                    throw callbackError;
                throw transactionError;
            }
            if (callbackError)
                throw callbackError;
            return validated;
        }
        finally {
            database.close();
        }
    }
    async get(id) {
        const database = await openDatabase();
        try {
            const transaction = database.transaction(STORE_NAME, "readonly");
            const value = await requestResult(transaction.objectStore(STORE_NAME).get(id));
            await transactionDone(transaction);
            if (value === undefined)
                return null;
            return validateRun(value);
        }
        finally {
            database.close();
        }
    }
    async list() {
        const database = await openDatabase();
        try {
            const transaction = database.transaction(STORE_NAME, "readonly");
            const values = await requestResult(transaction.objectStore(STORE_NAME).getAll());
            await transactionDone(transaction);
            return values
                .map(validateRun)
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }
        finally {
            database.close();
        }
    }
    async delete(id) {
        const database = await openDatabase();
        try {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).delete(id);
            await transactionDone(transaction);
        }
        finally {
            database.close();
        }
    }
    async purgeExpired(now = new Date()) {
        const runs = await this.list();
        const expired = runs.filter((run) => Date.parse(run.expiresAt) <= now.getTime());
        for (const run of expired)
            await this.delete(run.id);
        return expired.length;
    }
    async clear() {
        const database = await openDatabase();
        try {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).clear();
            await transactionDone(transaction);
        }
        finally {
            database.close();
        }
    }
}
exports.IndexedDbRunStore = IndexedDbRunStore;
