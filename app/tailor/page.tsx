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

  const handleStartAnalysis = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      alert("Provide both the source resume and target job description.");
      return;
    }

    setCurrentStep("analyzing");
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
      setCurrentStep("review");
    } catch (error) {
      console.error("Tailoring request failed:", error);
      alert(readErrorMessage(error));
      setCurrentStep("analysis_results");
    } finally {
      stopCues();
    }
  };

  const handleReviewComplete = () => {
    setCurrentStep("review_complete");
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
          Analyze and tailor source experience for a target role without inventing qualifications.
        </p>
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
          <span>Review Complete</span>
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

      {currentStep === "review_complete" && (
        <div className={`${styles.exportPanel} card-glass animate-scale`}>
          <h2>Review marked complete</h2>
          <p style={{ maxWidth: "600px" }}>
            This prototype records only the local workflow state. It has not generated or downloaded a document. Return to the comparison to continue reviewing, or start a new run.
          </p>
          <div className={styles.btnActionsRow} style={{ marginTop: "16px" }}>
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
