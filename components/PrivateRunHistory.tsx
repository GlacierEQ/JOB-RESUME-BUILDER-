"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IndexedDbRunStore,
  type StoredTailoringRun,
} from "@/lib/run-store";

interface PrivateRunHistoryProps {
  readonly refreshToken: number;
  readonly onRestore: (run: StoredTailoringRun) => void;
}

const store = new IndexedDbRunStore();

export default function PrivateRunHistory({
  refreshToken,
  onRestore,
}: PrivateRunHistoryProps) {
  const [runs, setRuns] = useState<readonly StoredTailoringRun[]>([]);
  const [status, setStatus] = useState("Loading private runs…");

  const refresh = useCallback(async () => {
    try {
      const purged = await store.purgeExpired();
      const values = await store.list();
      setRuns(values);
      setStatus(
        values.length
          ? `${values.length} private run${values.length === 1 ? "" : "s"} stored only in this browser${purged ? ` · ${purged} expired run${purged === 1 ? "" : "s"} removed` : ""}.`
          : "No saved private runs in this browser.",
      );
    } catch (error) {
      setRuns([]);
      setStatus(
        error instanceof Error
          ? `Private browser persistence unavailable: ${error.message}`
          : "Private browser persistence unavailable.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshToken]);

  const remove = async (id: string) => {
    await store.delete(id);
    await refresh();
  };

  const clear = async () => {
    await store.clear();
    await refresh();
  };

  return (
    <section className="card-glass" style={{ padding: "18px", marginTop: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <div>
          <strong>Private run history</strong>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>{status}</p>
        </div>
        {runs.length > 0 && (
          <button type="button" className="btn-secondary" onClick={() => void clear()}>
            Clear local history
          </button>
        )}
      </div>

      {runs.length > 0 && (
        <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
          {runs.map((run) => (
            <article
              key={run.id}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <strong>
                    {run.jobDescription.company || "Target company"} · {run.jobDescription.jobTitle || "Target role"}
                  </strong>
                  <div style={{ opacity: 0.75, marginTop: "4px" }}>
                    {run.stage} · revision {run.revision} · expires {new Date(run.expiresAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="btn-primary" onClick={() => onRestore(run)}>
                    Restore
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void remove(run.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p style={{ margin: "14px 0 0", fontSize: ".9rem", opacity: 0.7 }}>
        Resume and job-description contents are stored in this browser&apos;s IndexedDB only, expire after seven days by default, and are never uploaded by the persistence layer. Clearing browser storage deletes them.
      </p>
    </section>
  );
}
