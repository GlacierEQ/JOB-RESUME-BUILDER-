"use client";

import React from "react";
import styles from "./ScoreCard.module.css";
import { MatchScore } from "@/lib/schemas";

interface ScoreCardProps {
  originalScore: MatchScore;
  tailoredScore?: MatchScore;
  isTailored?: boolean;
}

export default function ScoreCard({ originalScore, tailoredScore, isTailored = false }: ScoreCardProps) {
  // SVG circular properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const getStrokeDashoffset = (score: number) => {
    return circumference - (score / 100) * circumference;
  };

  const activeScore = isTailored && tailoredScore ? tailoredScore : originalScore;

  return (
    <div className={`${styles.container} card-glass animate-fade`}>
      <div className={styles.scoreHeader}>
        <div className={styles.title}>
          🎯 JD Match Analysis
        </div>
        <span className={`${styles.badge} ${isTailored ? styles.badgeTailored : styles.badgeOriginal}`}>
          {isTailored ? "Tailored Assessment" : "Original Assessment"}
        </span>
      </div>

      <div className={styles.scoresWrapper}>
        {/* Original Score Card */}
        <div className={`${styles.scoreVisualCard} ${styles.cardOriginal}`}>
          <div className={styles.gaugeContainer}>
            <svg className={styles.gaugeSvg}>
              <circle className={styles.gaugeTrack} cx="70" cy="70" r={radius} />
              <circle 
                className={`${styles.gaugeValue} ${styles.originalValue}`} 
                cx="70" 
                cy="70" 
                r={radius} 
                strokeDasharray={circumference}
                strokeDashoffset={getStrokeDashoffset(originalScore.overallScore)}
              />
            </svg>
            <div className={styles.gaugeNumber}>{originalScore.overallScore}</div>
          </div>
          <div className={styles.scoreLabel}>Original Match</div>
          
          <div className={styles.subscoresList}>
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreName}>Skills Coverage</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className={styles.subscoreBarContainer}>
                  <div 
                    className={`${styles.subscoreBar} ${styles.originalBar}`} 
                    style={{ width: `${originalScore.skillCoverageScore}%` }}
                  />
                </div>
                <span>{originalScore.skillCoverageScore}%</span>
              </div>
            </div>
            
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreName}>Responsibilities</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className={styles.subscoreBarContainer}>
                  <div 
                    className={`${styles.subscoreBar} ${styles.originalBar}`} 
                    style={{ width: `${originalScore.responsibilityAlignmentScore}%` }}
                  />
                </div>
                <span>{originalScore.responsibilityAlignmentScore}%</span>
              </div>
            </div>

            <div className={styles.subscoreItem}>
              <span className={styles.subscoreName}>Seniority Fit</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className={styles.subscoreBarContainer}>
                  <div 
                    className={`${styles.subscoreBar} ${styles.originalBar}`} 
                    style={{ width: `${originalScore.seniorityScore}%` }}
                  />
                </div>
                <span>{originalScore.seniorityScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tailored Score Card (If Tailored is present) */}
        {isTailored && tailoredScore && (
          <div className={`${styles.scoreVisualCard} ${styles.cardTailored}`}>
            <div className={styles.gaugeContainer}>
              <svg className={styles.gaugeSvg}>
                <circle className={styles.gaugeTrack} cx="70" cy="70" r={radius} />
                <circle 
                  className={`${styles.gaugeValue} ${styles.tailoredValue}`} 
                  cx="70" 
                  cy="70" 
                  r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={getStrokeDashoffset(tailoredScore.overallScore)}
                />
              </svg>
              <div className={styles.gaugeNumber}>{tailoredScore.overallScore}</div>
            </div>
            <div className={styles.scoreLabel}>Tailored Match</div>

            <div className={styles.subscoresList}>
              <div className={styles.subscoreItem}>
                <span className={styles.subscoreName}>Skills Coverage</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className={styles.subscoreBarContainer}>
                    <div 
                      className={`${styles.subscoreBar} ${styles.tailoredBar}`} 
                      style={{ width: `${tailoredScore.skillCoverageScore}%` }}
                    />
                  </div>
                  <span>{tailoredScore.skillCoverageScore}%</span>
                </div>
              </div>
              
              <div className={styles.subscoreItem}>
                <span className={styles.subscoreName}>Responsibilities</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className={styles.subscoreBarContainer}>
                    <div 
                      className={`${styles.subscoreBar} ${styles.tailoredBar}`} 
                      style={{ width: `${tailoredScore.responsibilityAlignmentScore}%` }}
                    />
                  </div>
                  <span>{tailoredScore.responsibilityAlignmentScore}%</span>
                </div>
              </div>

              <div className={styles.subscoreItem}>
                <span className={styles.subscoreName}>Seniority Fit</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className={styles.subscoreBarContainer}>
                    <div 
                      className={`${styles.subscoreBar} ${styles.tailoredBar}`} 
                      style={{ width: `${tailoredScore.seniorityScore}%` }}
                    />
                  </div>
                  <span>{tailoredScore.seniorityScore}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.explanationBox}>
        <div className={styles.explanationTitle}>Match Explanation</div>
        <div className={styles.explanationText}>{activeScore.explanation}</div>

        {activeScore.criticalMissingRequirements.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div className={styles.explanationTitle}>Critical Gaps identified:</div>
            <div className={styles.missingList}>
              {activeScore.criticalMissingRequirements.map((gap, i) => (
                <div key={i} className={styles.missingItem}>
                  <span className={styles.missingIcon}>⚠️</span>
                  <span>{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
