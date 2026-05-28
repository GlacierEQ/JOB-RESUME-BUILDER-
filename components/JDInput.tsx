"use client";

import React from "react";
import styles from "./JDInput.module.css";
import { mockJobDescriptionText } from "@/lib/mockData";

interface JDInputProps {
  value: string;
  onChange: (val: string) => void;
}

export default function JDInput({ value, onChange }: JDInputProps) {
  const handleLoadDemo = () => {
    onChange(mockJobDescriptionText.trim());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          Target Job Description <span className={styles.badge}>Paste Listing</span>
        </div>
        <button type="button" className={styles.loadBtn} onClick={handleLoadDemo}>
          Load Sample JD
        </button>
      </div>

      <textarea
        className={styles.textarea}
        placeholder="Paste target job description text here... e.g.
We are looking for a Senior Frontend Engineer...
Required Skills:
- React
- TypeScript
- CSS Modules..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
