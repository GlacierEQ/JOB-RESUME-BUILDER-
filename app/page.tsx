import React from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span>🦎</span> Resume Shapeshifter
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="https://github.com/alexmercer" target="_blank" rel="noopener noreferrer" className={styles.navLink}>GitHub</a>
          <Link href="/tailor" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            Enter Workspace
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.badge} style={{ animation: "pulseGlow 2s infinite ease-in-out" }}>
          Next-Gen JD-to-Resume Engine
        </div>
        <h1 className={styles.heroTitle}>
          Tailor Your Resume <span className={styles.heroTitleHighlight}>With Absolute Truth</span>.
        </h1>
        <p className={styles.heroSubtitle}>
          Resume Shapeshifter aligns your experience with any job description, identifying gaps and rewriting bullets truthfully. No fabrication, just extreme relevance.
        </p>
        <div className={styles.heroActions}>
          <Link href="/tailor" className="btn-primary" style={{ fontSize: "1.1rem" }}>
            Open Tailoring Workspace ➜
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Built For Career Excellence</h2>
        <div className={styles.featuresGrid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureCardTitle}>Truthfulness-First Guardrails</h3>
            <p className={styles.featureCardDesc}>
              Strict semantic validations prevent experience inflation. The engine blocks hallucinated employers, fabricated titles, or metrics that were never in your original work history.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚖️</div>
            <h3 className={styles.featureCardTitle}>Side-by-Side Review</h3>
            <p className={styles.featureCardDesc}>
              Compare every single original bullet against the suggested rewrite in a scrollable parallel table. Interactively revert or tweak claims with real-time score impact calculation.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureCardTitle}>Explainable Match Score</h3>
            <p className={styles.featureCardDesc}>
              Receive clear, categorized breakdowns of your JD match: skill coverage, responsibilities, seniority, and keywords. Opaque percentages are replaced with actionable, readable proof reports.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>© {new Date().getFullYear()} Resume Shapeshifter. All rights reserved.</span>
          <span>Designed with Vanilla CSS & Next.js</span>
        </div>
      </footer>
    </div>
  );
}
