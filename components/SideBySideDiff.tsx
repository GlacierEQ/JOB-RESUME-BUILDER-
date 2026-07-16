"use client";

import React, { useState } from "react";
import styles from "./SideBySideDiff.module.css";
import { TailoredResume } from "@/lib/schemas";

interface SideBySideDiffProps {
  tailoredResume: TailoredResume;
  onBulletUpdate?: (companyIdx: number, bulletIdx: number, text: string) => void;
}

export default function SideBySideDiff({ tailoredResume, onBulletUpdate }: SideBySideDiffProps) {
  const [revertedMap, setRevertedMap] = useState<Record<string, boolean>>({});

  const handleToggleRevert = (
    companyIdx: number,
    bulletIdx: number,
    originalText: string,
    tailoredText: string,
  ) => {
    const key = `${companyIdx}-${bulletIdx}`;
    const newRevertedState = !revertedMap[key];

    setRevertedMap((previous) => ({
      ...previous,
      [key]: newRevertedState,
    }));

    onBulletUpdate?.(
      companyIdx,
      bulletIdx,
      newRevertedState ? originalText : tailoredText,
    );
  };

  const renderHighlightedText = (text: string, keywords: string[]) => {
    const uniqueKeywords = Array.from(
      new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)),
    ).sort((left, right) => right.length - left.length);

    if (uniqueKeywords.length === 0) {
      return <span>{text}</span>;
    }

    const keywordPattern = new RegExp(
      `(${uniqueKeywords.map(escapeRegExp).join("|")})`,
      "gi",
    );
    const keywordLookup = new Set(
      uniqueKeywords.map((keyword) => keyword.toLowerCase()),
    );

    return (
      <>
        {text.split(keywordPattern).map((part, index) =>
          keywordLookup.has(part.toLowerCase()) ? (
            <mark key={`${part}-${index}`} className={styles.highlightAdded}>
              {part}
            </mark>
          ) : (
            <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
          ),
        )}
      </>
    );
  };

  return (
    <div className={`${styles.container} card-glass animate-fade`}>
      <div className={styles.header}>
        <div className={styles.title}>✏️ Tailored Bullets Workspace</div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotOriginal}`} />
            <span>Original Experience</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotTailored}`} />
            <span>Tailored Suggestions</span>
          </div>
        </div>
      </div>

      <div className={styles.workspace}>
        {tailoredResume.tailoredExperience.map((experience, companyIdx) => (
          <div key={`${experience.company}-${companyIdx}`} className={styles.experienceSection}>
            <div className={styles.experienceHeader}>
              <div>
                <span className={styles.companyName}>{experience.company}</span>
                <div className={styles.roleTitle}>{experience.title}</div>
              </div>
            </div>

            <div className={styles.bulletsList}>
              {experience.bullets.map((bullet, bulletIdx) => {
                const key = `${companyIdx}-${bulletIdx}`;
                const isReverted = revertedMap[key] ?? false;

                return (
                  <div key={key} className={styles.bulletRow}>
                    <div className={`${styles.bulletColumn} ${styles.originalCol}`}>
                      <div className={styles.bulletText}>• {bullet.original}</div>
                    </div>

                    <div
                      className={`${styles.bulletColumn} ${styles.tailoredCol} ${
                        isReverted ? styles.revertedCol : ""
                      }`}
                    >
                      <div
                        className={`${styles.bulletText} ${
                          isReverted ? styles.revertedState : ""
                        }`}
                      >
                        • {isReverted
                          ? bullet.original
                          : renderHighlightedText(
                              bullet.tailored,
                              bullet.keywordsAddressed,
                            )}
                      </div>

                      {!isReverted && bullet.riskFlag && (
                        <div className={styles.riskBanner}>⚠️ {bullet.riskFlag}</div>
                      )}

                      <div className={styles.metaInfo}>
                        {!isReverted && (
                          <>
                            <div className={styles.reasonBox}>
                              <strong>Why:</strong> {bullet.changeReason}
                            </div>
                            <div className={styles.keywordsRow}>
                              <span className={styles.keywordLabel}>Keywords:</span>
                              {bullet.keywordsAddressed.map((keyword) => (
                                <span key={keyword} className={styles.keywordBadge}>
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        <div className={styles.badgeRow}>
                          {!isReverted ? (
                            <span
                              className={`${styles.confidenceTag} ${
                                styles[`conf${bullet.confidence}`]
                              }`}
                            >
                              {bullet.confidence} Confidence
                            </span>
                          ) : (
                            <span
                              className={styles.confidenceTag}
                              style={{
                                color: "var(--text-muted)",
                                backgroundColor: "var(--border)",
                              }}
                            >
                              Reverted to original
                            </span>
                          )}

                          <button
                            type="button"
                            className={styles.revertBtn}
                            onClick={() =>
                              handleToggleRevert(
                                companyIdx,
                                bulletIdx,
                                bullet.original,
                                bullet.tailored,
                              )
                            }
                          >
                            {isReverted ? "Use Tailored" : "Revert Bullet"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
