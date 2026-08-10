"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import ResumeInput from "@/components/ResumeInput";
import JDInput from "@/components/JDInput";
import ScoreCard from "@/components/ScoreCard";
import GapAnalysisView from "@/components/GapAnalysis";
import SideBySideDiff from "@/components/SideBySideDiff";
import ReviewCompletionControls from "@/components/PDFExportButton";
import JDRequirementsSummary from "@/components/JDRequirementsSummary";
import PrivateRunHistory from "@/components/PrivateRunHistory";
import {
  compileApplicationArtifacts,
  type ApplicationCompilation,
  type CompiledArtifact,
} from "@/lib/application-compiler";
import {
  advanceRun,
  createRun,
  IndexedDbRunStore,
  type StoredTailoringRun,
} from "@/lib/run-store";
import type {
  GapAnalysis as GapAnalysisType,
  JobDescriptionProfile,
  MatchScore,
  ResumeProfile,
  TailoredResume as TailoredResumeType,
} from "@/lib/schemas";

type WorkflowStep =
  | "ingest"
  | "analyzing"
  | "analysis_results"
  | "tailoring"
  | "review"
  | "review_complete";

interface AnalyzeResponse {
  readonly resume: ResumeProfile;
  readonly jobDescription: JobDescriptionProfile;
  readonly originalMatch: MatchScore;
  readonly gapAnalysis: GapAnalysisType;
}

interface TailorResponse {
  readonly tailoredResume: TailoredResumeType;
  readonly tailoredMatch: MatchScore;
}

const privateRunStore = new IndexedDbRunStore();

export default function TailorWorkspace() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("ingest");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [jdProfile, setJdProfile] = useState<JobDescriptionProfile | null>(null);
  const [originalScore, setOriginalScore] = useState<MatchScore | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisType | null>(null);
  const [tailoredResume, setTailoredResume] = useState<TailoredResumeType | null>(null);
  const [tailoredScore, setTailoredScore] = useState<MatchScore | null>(null);
  const [loadingCue, setLoadingCue] = useState("");
  const [currentRun, setCurrentRun] = useState<StoredTailoringRun | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState("");
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [compilation, setCompilation] = useState<ApplicationCompilation | null>(null);

  const persistRun = async (
    run: StoredTailoringRun,
    expectedRevision: number,
  ): Promise<void> => {
    try {
      await privateRunStore.put(run, expectedRevision);
      setPersistenceStatus(
        `Private run saved locally · revision ${run.revision} · expires ${new Date(run.expiresAt).toLocaleString()}`,
      );
      setHistoryRefreshToken((value) => value + 1);
    } catch (error) {
      setPersistenceStatus(
        error instanceof Error
          ? `Private persistence unavailable; workflow remains usable: ${error.message}`
          : "Private persistence unavailable; workflow remains usable.",
      );
    }
  };

  const handleStartAnalysis = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      alert("Provide both the source resume and target job description.");
      return;
    }

    setCurrentStep("analyzing");
    setCompilation(null);
    const stopCues = startCueSequence(
      [
        "Ingesting documents...",
        "Extracting source experience...",
        "Parsing job requirements...",
        "Computing structured match analysis...",
        "Building the gap report...",
      ],
      setLoadingCue,
    );

    try {
      const data = await postJson<AnalyzeResponse>("/api/analyze", {
        resumeText,
        jdText,
      });

      setResumeProfile(data.resume);
      setJdProfile(data.jobDescription);
      setOriginalScore(data.originalMatch);
      setGapAnalysis(data.gapAnalysis);
      setTailoredResume(null);
      setTailoredScore(null);

      const run = createRun({
        id: globalThis.crypto.randomUUID(),
        stage: "ANALYZED",
        resumeText,
        jobDescriptionText: jdText,
        resume: data.resume,
        jobDescription: data.jobDescription,
        originalMatch: data.originalMatch,
        gapAnalysis: data.gapAnalysis,
      });
      setCurrentRun(run);
      void persistRun(run, -1);
      setCurrentStep("analysis_results");
    } catch (error) {
      console.error("Analysis request failed:", error);
      alert(readErrorMessage(error));
      setCurrentStep("ingest");
    } finally {
      stopCues();
    }
  };

  const handleStartTailoring = async () => {
    if (!resumeProfile || !jdProfile || !gapAnalysis) {
      return;
    }

    setCurrentStep("tailoring");
    const stopCues = startCueSequence(
      [
        "Aligning source experience with target requirements...",
        "Proposing source-grounded rewrites...",
        "Validating structured output...",
        "Applying deterministic truthfulness checks...",
        "Scoring the validated tailored profile...",
      ],
      setLoadingCue,
    );

    try {
      const data = await postJson<TailorResponse>("/api/tailor", {
        resume: resumeProfile,
        jobDescription: jdProfile,
        gapAnalysis,
      });

      setTailoredResume(data.tailoredResume);
      setTailoredScore(data.tailoredMatch);
      if (currentRun) {
        const nextRun = advanceRun(currentRun, {
          stage: "TAILORED",
          tailoredResume: data.tailoredResume,
          tailoredMatch: data.tailoredMatch,
        });
        setCurrentRun(nextRun);
        void persistRun(nextRun, currentRun.revision);
      }
      setCurrentStep("review");
    } catch (error) {
      console.error("Tailoring request failed:", error);
      alert(readErrorMessage(error));
      setCurrentStep("analysis_results");
    } finally {
      stopCues();
    }
  };

  const handleReviewComplete = (_reviewType: "tailored" | "comparison") => {
    if (!resumeProfile || !jdProfile || !tailoredResume) {
      alert("The reviewed run is incomplete and cannot be compiled.");
      return;
    }
    const compiled = compileApplicationArtifacts(
      resumeProfile,
      jdProfile,
      tailoredResume,
    );
    setCompilation(compiled);
    setCurrentStep("review_complete");

    if (currentRun) {
      const now = new Date();
      const nextRun = advanceRun(
        currentRun,
        {
          stage: "REVIEWED",
          reviewedAt: now.toISOString(),
        },
        now,
      );
      setCurrentRun(nextRun);
      void persistRun(nextRun, currentRun.revision);
    }
  };

  const handleArtifactDownload = (artifact: CompiledArtifact) => {
    downloadArtifact(artifact);
    if (currentRun && currentRun.stage !== "EXPORTED") {
      const now = new Date();
      const nextRun = advanceRun(
        currentRun,
        {
          stage: "EXPORTED",
          exportedAt: now.toISOString(),
        },
        now,
      );
      setCurrentRun(nextRun);
      void persistRun(nextRun, currentRun.revision);
    }
  };

  const restoreRun = (run: StoredTailoringRun) => {
    setCurrentRun(run);
    setResumeText(run.resumeText);
    setJdText(run.jobDescriptionText);
    setResumeProfile(run.resume);
    setJdProfile(run.jobDescription);
    setOriginalScore(run.originalMatch);
    setGapAnalysis(run.gapAnalysis);
    setTailoredResume(run.tailoredResume ?? null);
    setTailoredScore(run.tailoredMatch ?? null);
    setCompilation(
      run.tailoredResume && (run.stage === "REVIEWED" || run.stage === "EXPORTED")
        ? compileApplicationArtifacts(
            run.resume,
            run.jobDescription,
            run.tailoredResume,
            run.reviewedAt ?? run.updatedAt,
          )
        : null,
    );
    setPersistenceStatus(`Restored private run revision ${run.revision}.`);
    if (run.stage === "ANALYZED") setCurrentStep("analysis_results");
    else if (run.stage === "TAILORED") setCurrentStep("review");
    else setCurrentStep("review_complete");
  };

  const resetRun = () => {
    setResumeText("");
    setJdText("");
    setResumeProfile(null);
    setJdProfile(null);
    setOriginalScore(null);
    setGapAnalysis(null);
    setTailoredResume(null);
    setTailoredScore(null);
    setLoadingCue("");
    setCurrentRun(null);
    setCompilation(null);
    setPersistenceStatus("");
    setCurrentStep("ingest");
  };

  const getStepClass = (step: string) => {
    const stepOrder = ["ingest", "analysis_results", "review", "review_complete"];
    const visibleStep =
      currentStep === "analyzing"
        ? "ingest"
        : currentStep === "tailoring"
          ? "analysis_results"
          : currentStep;
    const currentIndex = stepOrder.indexOf(visibleStep);
    const targetIndex = stepOrder.indexOf(step);

    if (currentIndex === targetIndex) return styles.stepActive;
    if (currentIndex > targetIndex) return styles.stepCompleted;
    return styles.stepItem;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Resume Shapeshifter Workspace</h1>
        <p className={styles.subtitle}>
          Analyze, tailor, preserve, review, and compile source-grounded application artifacts without inventing qualifications.
        </p>
        {persistenceStatus && (
          <p style={{ marginTop: "8px", opacity: 0.76 }}>{persistenceStatus}</p>
        )}
      </header>

      <div className={styles.stepper}>
        <div className={getStepClass("ingest")}>
          <span className={styles.stepNumber}>1</span>
          <span>Ingest & Parse</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={getStepClass("analysis_results")}>
          <span className={styles.stepNumber}>2</span>
          <span>Gap Analysis</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={getStepClass("review")}>
          <span className={styles.stepNumber}>3</span>
          <span>Human Review</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={getStepClass("review_complete")}>
          <span className={styles.stepNumber}>4</span>
          <span>Compile Artifacts</span>
        </div>
      </div>

      {currentStep === "ingest" && (
        <div className="animate-scale" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.workspaceGrid}>
            <ResumeInput
              value={resumeText}
              onChange={setResumeText}
              onFileParsed={setResumeText}
            />
            <JDInput value={jdText} onChange={setJdText} />
          </div>
          <div className={styles.btnActionsRow}>
            <button type="button" className="btn-primary" onClick={handleStartAnalysis}>
              Analyze Match & Find Gaps ➜
            </button>
          </div>
          <PrivateRunHistory
            refreshToken={historyRefreshToken}
            onRestore={restoreRun}
          />
        </div>
      )}

      {(currentStep === "analyzing" || currentStep === "tailoring") && (
        <div className={`${styles.loadingContainer} card-glass animate-scale`}>
          <div className={styles.loaderRing} />
          <div className={styles.loadingTitle}>
            {currentStep === "analyzing"
              ? "Analyzing Source and Target"
              : "Creating Validated Suggestions"}
          </div>
          <div className={styles.loadingProgressText}>{loadingCue}</div>
        </div>
      )}

      {currentStep === "analysis_results" &&
        originalScore &&
        gapAnalysis &&
        jdProfile && (
          <div className={styles.resultsWorkspace}>
            <div className={styles.sectionGroup}>
              <ScoreCard originalScore={originalScore} />
            </div>
            <div className={styles.sectionGroup}>
              <JDRequirementsSummary jobDescription={jdProfile} />
            </div>
            <div className={styles.sectionGroup}>
              <GapAnalysisView gapAnalysis={gapAnalysis} />
            </div>
            <div className={styles.btnActionsRow}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentStep("ingest")}
              >
                ⬅ Adjust Inputs
              </button>
              <button type="button" className="btn-primary" onClick={handleStartTailoring}>
                Generate Validated Suggestions ➜
              </button>
            </div>
          </div>
        )}

      {currentStep === "review" &&
        originalScore &&
        tailoredScore &&
        tailoredResume &&
        jdProfile && (
          <div className={styles.resultsWorkspace}>
            <div className={styles.sectionGroup}>
              <ScoreCard
                originalScore={originalScore}
                tailoredScore={tailoredScore}
                isTailored
              />
            </div>
            <div className={styles.sectionGroup}>
              <JDRequirementsSummary jobDescription={jdProfile} />
            </div>
            <div className={styles.sectionGroup}>
              <SideBySideDiff tailoredResume={tailoredResume} />
            </div>
            <div className={styles.btnActionsRow}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentStep("analysis_results")}
              >
                ⬅ Back to Gaps
              </button>
              <ReviewCompletionControls onExport={handleReviewComplete} />
            </div>
          </div>
        )}

      {currentStep === "review_complete" && compilation && (
        <div className={`${styles.exportPanel} card-glass animate-scale`}>
          <h2>Application artifacts compiled</h2>
          <p style={{ maxWidth: "720px" }}>
            The reviewed source has been materialized into real downloadable artifacts. The JSON artifact contains the source resume, compiled resume, target identity, and exact change summary; ATS text is linearized for application systems; printable HTML is a document surface that can be printed to PDF without claiming an automatically generated PDF.
          </p>
          <div style={{ display: "grid", gap: "10px", margin: "18px 0" }}>
            {compilation.artifacts.map((artifact) => (
              <div
                key={artifact.kind}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}
              >
                <div>
                  <strong>{artifact.filename}</strong>
                  <div style={{ opacity: 0.72 }}>{artifact.mimeType}</div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleArtifactDownload(artifact)}
                >
                  Download {artifact.kind.toUpperCase()}
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: "6px", marginBottom: "18px", opacity: 0.82 }}>
            <span>Summary changed: {compilation.changes.summaryChanged ? "yes" : "no"}</span>
            <span>Skills added: {compilation.changes.skillsAdded.length}</span>
            <span>Skills removed: {compilation.changes.skillsRemoved.length}</span>
            <span>Experience bullets changed: {compilation.changes.experienceBulletsChanged.length}</span>
            <span>No external submission has been performed.</span>
          </div>
          <div className={styles.btnActionsRow}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentStep("review")}
            >
              Return to Review
            </button>
            <button type="button" className="btn-primary" onClick={resetRun}>
              Start New Tailoring Run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { readonly error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("The server returned an empty response.");
  }

  return payload as T;
}

function downloadArtifact(artifact: CompiledArtifact): void {
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifact.filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function startCueSequence(
  cues: readonly string[],
  setCue: React.Dispatch<React.SetStateAction<string>>,
): () => void {
  let index = 0;
  setCue(cues[0] ?? "Working...");

  const interval = window.setInterval(() => {
    index += 1;
    if (index < cues.length) {
      setCue(cues[index] ?? "Working...");
    }
  }, 700);

  return () => window.clearInterval(interval);
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
