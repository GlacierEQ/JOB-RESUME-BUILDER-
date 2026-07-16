import React from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span>🦎</span> Resume Shapeshifter
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a
            href="https://github.com/GlacierEQ/JOB-RESUME-BUILDER-"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
          >
            GitHub
          </a>
          <Link href="/tailor" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            Enter Workspace
          </Link>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.badge} style={{ animation: "pulseGlow 2s infinite ease-in-out" }}>
          Source-Grounded JD-to-Resume Prototype
        </div>
        <h1 className={styles.heroTitle}>
          Tailor Your Resume <span className={styles.heroTitleHighlight}>Without Inventing Experience</span>.
        </h1>
        <p className={styles.heroSubtitle}>
          Resume Shapeshifter analyzes a job description, proposes source-grounded rewrites, and keeps every original bullet visible for review before export.
        </p>
        <div className={styles.heroActions}>
          <Link href="/tailor" className="btn-primary" style={{ fontSize: "1.1rem" }}>
            Open Tailoring Workspace ➜
          </Link>
        </div>
      </main>

      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Built For Verifiable Relevance</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureCardTitle}>Deterministic Truthfulness Guard</h3>
            <p className={styles.featureCardDesc}>
              Generated output is rejected when it changes employers or titles, loses the source bullet, introduces unsupported skills, or adds numeric claims absent from the original resume.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚖️</div>
            <h3 className={styles.featureCardTitle}>Side-by-Side Human Review</h3>
            <p className={styles.featureCardDesc}>
              Every original bullet remains visible beside the proposed rewrite so the user can review, revert, or edit before using the result.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureCardTitle}>Structured Match Analysis</h3>
            <p className={styles.featureCardDesc}>
              Match output is organized by skill coverage, responsibilities, seniority, keywords, and explicitly missing requirements rather than presented as an unexplained percentage alone.
            </p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>© {new Date().getFullYear()} Resume Shapeshifter.</span>
          <span>Prototype: verify every suggestion before submission.</span>
        </div>
      </footer>
    </div>
  );
}
