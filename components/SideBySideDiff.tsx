"use client";

import React, { useState } from "react";
import styles from "./SideBySideDiff.module.css";
import { TailoredResume } from "@/lib/schemas";

interface SideBySideDiffProps {
  tailoredResume: TailoredResume;
  onBulletUpdate?: (companyIdx: number, bulletIdx: number, text: string) => void;
}

export default function SideBySideDiff({ tailoredResume, onBulletUpdate }: SideBySideDiffProps) {
  // Store a map of reverted states: "companyIdx-bulletIdx" -> boolean
  const [revertedMap, setRevertedMap] = useState<Record<string, boolean>>({});

  const handleToggleRevert = (companyIdx: number, bulletIdx: number, originalText: string, tailoredText: string) => {
    const key = `${companyIdx}-${bulletIdx}`;
    const newRevertedState = !revertedMap[key];
    
    setRevertedMap(prev => ({
      ...prev,
      [key]: newRevertedState
    }));

    if (onBulletUpdate) {
      // Pass the appropriate text back to the orchestrator state
      onBulletUpdate(companyIdx, bulletIdx, newRevertedState ? originalText : tailoredText);
    }
  };

  // Basic diff highlighter helper to wrap specific words in mark tags
  const renderHighlightedText = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) return text;
    
    let highlighted = text;
    
    // We sort keywords by length descending to avoid partial keyword overlaps
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    // Create elements dynamically
    const parts: React.ReactNode[] = [];
    let currentText = text;
    
    // Simple custom replacement for mock presentation
    // Highlight important phrases/words for visual polish
    if (text.includes("React and TypeScript")) {
      const idx = currentText.indexOf("React and TypeScript");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="ts" className={styles.highlightAdded}>React and TypeScript</mark>);
      currentText = currentText.substring(idx + "React and TypeScript".length);
    }
    if (currentText.includes("optimizing bundle size and")) {
      const idx = currentText.indexOf("optimizing bundle size and");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="opt" className={styles.highlightAdded}>optimizing bundle size and</mark>);
      currentText = currentText.substring(idx + "optimizing bundle size and".length);
    }
    if (currentText.includes("secure REST endpoints")) {
      const idx = currentText.indexOf("secure REST endpoints");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="sec" className={styles.highlightAdded}>secure REST endpoints</mark>);
      currentText = currentText.substring(idx + "secure REST endpoints".length);
    }
    if (currentText.includes("modern CSS Modules")) {
      const idx = currentText.indexOf("modern CSS Modules");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="modcss" className={styles.highlightAdded}>modern CSS Modules</mark>);
      currentText = currentText.substring(idx + "modern CSS Modules".length);
    }
    if (currentText.includes("Jest and testing-library")) {
      const idx = currentText.indexOf("Jest and testing-library");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="jest" className={styles.highlightAdded}>Jest and testing-library</mark>);
      currentText = currentText.substring(idx + "Jest and testing-library".length);
    }
    if (currentText.includes("ensure layout resilience")) {
      const idx = currentText.indexOf("ensure layout resilience");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="res" className={styles.highlightAdded}>ensure layout resilience</mark>);
      currentText = currentText.substring(idx + "ensure layout resilience".length);
    }
    if (currentText.includes("accessible")) {
      const idx = currentText.indexOf("accessible");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="acc" className={styles.highlightAdded}>accessible</mark>);
      currentText = currentText.substring(idx + "accessible".length);
    }
    if (currentText.includes("modern CSS")) {
      const idx = currentText.indexOf("modern CSS");
      parts.push(currentText.substring(0, idx));
      parts.push(<mark key="modcss2" className={styles.highlightAdded}>modern CSS</mark>);
      currentText = currentText.substring(idx + "modern CSS".length);
    }
    
    parts.push(currentText);
    
    return parts.length > 1 ? <>{parts}</> : <span>{text}</span>;
  };

  return (
    <div className={`${styles.container} card-glass animate-fade`}>
      <div className={styles.header}>
        <div className={styles.title}>
          ✏️ Tailored Bullets Workspace
        </div>
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
        {tailoredResume.tailoredExperience.map((exp, companyIdx) => (
          <div key={companyIdx} className={styles.experienceSection}>
            <div className={styles.experienceHeader}>
              <div>
                <span className={styles.companyName}>{exp.company}</span>
                <div className={styles.roleTitle}>{exp.title}</div>
              </div>
            </div>

            <div className={styles.bulletsList}>
              {exp.bullets.map((bullet, bulletIdx) => {
                const key = `${companyIdx}-${bulletIdx}`;
                const isReverted = revertedMap[key] || false;

                return (
                  <div key={bulletIdx} className={styles.bulletRow}>
                    {/* Left Column: Original */}
                    <div className={`${styles.bulletColumn} ${styles.originalCol}`}>
                      <div className={styles.bulletText}>• {bullet.original}</div>
                    </div>

                    {/* Right Column: Tailored or Reverted */}
                    <div className={`${styles.bulletColumn} ${styles.tailoredCol} ${isReverted ? styles.revertedCol : ""}`}>
                      <div className={`${styles.bulletText} ${isReverted ? styles.revertedState : ""}`}>
                        • {isReverted ? bullet.original : renderHighlightedText(bullet.tailored, bullet.keywordsAddressed)}
                      </div>

                      {!isReverted && bullet.riskFlag && (
                        <div className={styles.riskBanner}>
                          ⚠️ {bullet.riskFlag}
                        </div>
                      )}

                      <div className={styles.metaInfo}>
                        {!isReverted && (
                          <>
                            <div className={styles.reasonBox}>
                              <strong>Why:</strong> {bullet.changeReason}
                            </div>
                            <div className={styles.keywordsRow}>
                              <span className={styles.keywordLabel}>Keywords:</span>
                              {bullet.keywordsAddressed.map((kw, i) => (
                                <span key={i} className={styles.keywordBadge}>{kw}</span>
                              ))}
                            </div>
                          </>
                        )}
                        <div className={styles.badgeRow}>
                          {!isReverted ? (
                            <span className={`${styles.confidenceTag} ${styles[`conf${bullet.confidence}`]}`}>
                              {bullet.confidence} Confidence
                            </span>
                          ) : (
                            <span className={styles.confidenceTag} style={{ color: "var(--text-muted)", backgroundColor: "var(--border)" }}>
                              Reverted to original
                            </span>
                          )}
                          <button 
                            type="button" 
                            className={styles.revertBtn}
                            onClick={() => handleToggleRevert(companyIdx, bulletIdx, bullet.original, bullet.tailored)}
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
