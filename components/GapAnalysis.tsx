"use client";

import React from "react";
import styles from "./GapAnalysis.module.css";
import { GapAnalysis } from "@/lib/schemas";

interface GapAnalysisProps {
  gapAnalysis: GapAnalysis;
}

export default function GapAnalysisView({ gapAnalysis }: GapAnalysisProps) {
  const getImportanceClass = (importance: string) => {
    switch (importance) {
      case "high":
        return styles.tagHigh;
      case "medium":
        return styles.tagMedium;
      default:
        return styles.tagLow;
    }
  };

  return (
    <div className={`${styles.container} card-glass animate-fade`}>
      <div className={styles.header}>
        <div className={styles.title}>
          🔍 Experience & Skill Gaps
          <span className={styles.countBadge}>{gapAnalysis.gaps.length} Found</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: "25%" }}>Gap Details</th>
              <th className={styles.th} style={{ width: "45%" }}>Requirements & Evidence</th>
              <th className={styles.th} style={{ width: "30%" }}>Suggested Action</th>
            </tr>
          </thead>
          <tbody>
            {gapAnalysis.gaps.map((gap, idx) => (
              <tr key={idx} className={styles.tr}>
                {/* Gap Details */}
                <td className={styles.td}>
                  <div className={styles.gapName}>
                    <span>{gap.name}</span>
                    <span className={`${styles.importanceTag} ${getImportanceClass(gap.importance)}`}>
                      {gap.importance} Priority
                    </span>
                    <span className={`${styles.safetyTag} ${gap.canSafelyAdd ? styles.safeToAdd : styles.unsafeToAdd}`}>
                      {gap.canSafelyAdd ? "✓ Safe to Add" : "⚠️ Do Not Fabricate"}
                    </span>
                  </div>
                </td>

                {/* Evidence */}
                <td className={styles.td}>
                  <div className={styles.evidenceSection}>
                    <div className={styles.evidenceBlock}>
                      <div className={styles.evidenceLabel}>Required in Job Description</div>
                      <div>"{gap.jdEvidence}"</div>
                    </div>
                    <div className={styles.evidenceBlock}>
                      <div className={styles.evidenceLabel}>Represented in Your Resume</div>
                      <div>{gap.resumeEvidence ? `"${gap.resumeEvidence}"` : "No evidence or mention found."}</div>
                    </div>
                  </div>
                </td>

                {/* Suggested Action */}
                <td className={styles.td}>
                  <div className={styles.suggestedActionBox}>
                    {gap.suggestedAction}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
