"use client";

import React from "react";
import styles from "./JDRequirementsSummary.module.css";
import { JobDescriptionProfile } from "@/lib/schemas";

interface JDRequirementsSummaryProps {
  jobDescription: JobDescriptionProfile;
}

export default function JDRequirementsSummary({ jobDescription }: JDRequirementsSummaryProps) {
  return (
    <div className={`${styles.container} card-glass animate-fade`}>
      <div className={styles.header}>
        <div className={styles.title}>
          💼 Extracted Job Specifications
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Job Title</span>
          <span className={styles.metaValue}>{jobDescription.jobTitle}</span>
        </div>
        {jobDescription.company && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Company</span>
            <span className={styles.metaValue}>{jobDescription.company}</span>
          </div>
        )}
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Seniority Level</span>
          <span className={styles.metaValue}>{jobDescription.seniorityLevel}</span>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        {/* Left Side: Skills & Tools */}
        <div className={styles.block}>
          <div className={styles.blockTitle}>Skills & Tools Required</div>
          <div className={styles.skillsList}>
            {jobDescription.requiredSkills.map((skill, idx) => (
              <span key={idx} className={`${styles.skillBadge} ${styles.reqSkill}`}>
                {skill}
              </span>
            ))}
            {jobDescription.preferredSkills.map((skill, idx) => (
              <span key={idx} className={`${styles.skillBadge} ${styles.prefSkill}`}>
                {skill} (Preferred)
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Key Responsibilities */}
        <div className={styles.block}>
          <div className={styles.blockTitle}>Key Responsibilities</div>
          <ul className={styles.bulletsList}>
            {jobDescription.responsibilities.map((resp, idx) => (
              <li key={idx} className={styles.bulletItem}>
                {resp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
