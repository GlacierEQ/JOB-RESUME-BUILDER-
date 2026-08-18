"use client";

import styles from "./ApplicationReadinessPanel.module.css";
import {
  compileReadinessDossierArtifact,
  type ApplicationReadinessReport,
  type RequirementDelta,
} from "@/lib/application-readiness";

interface ApplicationReadinessPanelProps {
  readonly report: ApplicationReadinessReport;
}

const readinessCopy: Record<ApplicationReadinessReport["readiness"], string> = {
  EVIDENCE_STRONG: "All required qualifications are supported after tailoring, with no evidence regressions detected.",
  EVIDENCE_GAPPED: "The tailored resume improved or preserved evidence, but at least one required qualification remains unsupported or only partially supported.",
  EVIDENCE_REGRESSED: "Tailoring weakened at least one previously supported requirement. Repair those regressions before export.",
};

function formatDelta(value: number): string {
  const percentage = Math.round(value * 100);
  if (percentage > 0) return `+${percentage}%`;
  return `${percentage}%`;
}

function RequirementList({
  title,
  rows,
  empty,
}: {
  readonly title: string;
  readonly rows: readonly RequirementDelta[];
  readonly empty: string;
}) {
  return (
    <section className={styles.requirementSection}>
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.requirementList}>
          {rows.map((row) => (
            <li key={`${row.tier}:${row.requirement}`}>
              <div className={styles.requirementHeading}>
                <strong>{row.requirement}</strong>
                <span>{row.tier}</span>
              </div>
              <div className={styles.requirementMeta}>
                {row.before} → {row.after}
                {row.sourceAfter ? ` · evidence ${row.sourceAfter}` : " · no supporting source located"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function downloadReadiness(report: ApplicationReadinessReport) {
  const artifact = compileReadinessDossierArtifact(report);
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ApplicationReadinessPanel({ report }: ApplicationReadinessPanelProps) {
  return (
    <section className={styles.panel} aria-label="Application readiness evidence">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Application readiness</p>
          <h3>{report.readiness.replaceAll("_", " ")}</h3>
          <p className={styles.explanation}>{readinessCopy[report.readiness]}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadReadiness(report)}
        >
          Download readiness dossier
        </button>
      </div>

      <div className={styles.metrics}>
        <div><span>Required</span><strong>{formatDelta(report.coverageDelta.required)}</strong></div>
        <div><span>Preferred</span><strong>{formatDelta(report.coverageDelta.preferred)}</strong></div>
        <div><span>Tools</span><strong>{formatDelta(report.coverageDelta.tools)}</strong></div>
        <div><span>Keywords</span><strong>{formatDelta(report.coverageDelta.keywords)}</strong></div>
      </div>

      <div className={styles.grid}>
        <RequirementList
          title="Evidence gained"
          rows={report.gainedSupport}
          empty="No new requirement support was added by tailoring."
        />
        <RequirementList
          title="Required gaps"
          rows={report.unresolvedRequired}
          empty="No required qualification gaps remain."
        />
        <RequirementList
          title="Regressions"
          rows={report.regressions}
          empty="No evidence regressions detected."
        />
      </div>

      <p className={styles.boundary}>
        This is an evidence comparison, not a hiring prediction. It does not invent qualifications and it keeps human review in the loop.
      </p>
    </section>
  );
}
