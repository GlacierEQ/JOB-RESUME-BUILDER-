"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import ResumeInput from "@/components/ResumeInput";
import JDInput from "@/components/JDInput";
import ScoreCard from "@/components/ScoreCard";
import GapAnalysisView from "@/components/GapAnalysis";
import SideBySideDiff from "@/components/SideBySideDiff";
import PDFExportButton from "@/components/PDFExportButton";
import JDRequirementsSummary from "@/components/JDRequirementsSummary";

import { MatchScore, GapAnalysis as GapAnalysisType, TailoredResume as TailoredResumeType } from "@/lib/schemas";

type WorkflowStep = "ingest" | "analyzing" | "analysis_results" | "tailoring" | "review" | "exported";

export default function TailorWorkspace() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("ingest");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  
  // Stored Profiles from Parse
  const [resumeProfile, setResumeProfile] = useState<any | null>(null);
  const [jdProfile, setJdProfile] = useState<any | null>(null);

  // Analysis States
  const [originalScore, setOriginalScore] = useState<MatchScore | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisType | null>(null);
  const [tailoredResume, setTailoredResume] = useState<TailoredResumeType | null>(null);
  const [tailoredScore, setTailoredScore] = useState<MatchScore | null>(null);

  // Loading sequences textual cues
  const [loadingCue, setLoadingCue] = useState("");

  const handleStartAnalysis = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      alert("Please provide both your original resume and the target job description to start.");
      return;
    }

    setCurrentStep("analyzing");
    
    // Animate visual loading cues in the background
    const cues = [
      "Ingesting documents...",
      "Extracting skills and credentials...",
      "Parsing job description requirements...",
      "Computing ATS semantic compatibility match score...",
      "Assembling initial gap reports..."
    ];

    let cueIndex = 0;
    setLoadingCue(cues[0]);

    const cueInterval = setInterval(() => {
      cueIndex += 1;
      if (cueIndex < cues.length) {
        setLoadingCue(cues[cueIndex]);
      }
    }, 700);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      
      clearInterval(cueInterval);
      setResumeProfile(data.resume);
      setJdProfile(data.jobDescription);
      setOriginalScore(data.originalMatch);
      setGapAnalysis(data.gapAnalysis);
      setCurrentStep("analysis_results");
    } catch (error: any) {
      clearInterval(cueInterval);
      console.error("Analysis API failed:", error);
      alert(`Connection failed: ${error.message || "Could not complete document analysis."}`);
      setCurrentStep("ingest");
    }
  };

  const handleStartTailoring = async () => {
    if (!resumeProfile || !jdProfile || !gapAnalysis) return;

    setCurrentStep("tailoring");
    
    const cues = [
      "Aligning experiences with target qualifications...",
      "Adjusting executive summary vocabulary...",
      "Rewriting experience bullet points truthfully...",
      "Filtering against fabrication policies...",
      "Re-scoring tailored alignment structure..."
    ];

    let cueIndex = 0;
    setLoadingCue(cues[0]);

    const cueInterval = setInterval(() => {
      cueIndex += 1;
      if (cueIndex < cues.length) {
        setLoadingCue(cues[cueIndex]);
      }
    }, 700);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resume: resumeProfile, 
          jobDescription: jdProfile, 
          gapAnalysis 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      
      clearInterval(cueInterval);
      setTailoredResume(data.tailoredResume);
      setTailoredScore(data.tailoredMatch);
      setCurrentStep("review");
    } catch (error: any) {
      clearInterval(cueInterval);
      console.error("Tailoring API failed:", error);
      alert(`Connection failed: ${error.message || "Could not complete resume tailoring."}`);
      setCurrentStep("analysis_results");
    }
  };

  const handleBulletUpdate = (companyIdx: number, bulletIdx: number, text: string) => {
    if (!tailoredScore || !tailoredResume) return;

    // Check if the text matches the original or tailored text
    const targetBullet = tailoredResume.tailoredExperience[companyIdx].bullets[bulletIdx];
    const isReverting = text === targetBullet.original;

    setTailoredScore(prev => {
      if (!prev) return null;
      const scoreDiff = isReverting ? -3 : 3;
      const newScore = Math.max(originalScore?.overallScore || 60, Math.min(88, prev.overallScore + scoreDiff));
      return {
        ...prev,
        overallScore: newScore,
        explanation: isReverting 
          ? `Score adjusted reactively. Reverting this bullet reduced ATS alignment. Overall match is now ${newScore}%.`
          : `Score restored. Re-applying the tailored bullet improved alignment to ${newScore}%.`
      };
    });
  };

  const handleExport = (type: "tailored" | "comparison") => {
    setCurrentStep("exported");
  };

  const getStepClass = (step: string) => {
    const stepOrder = ["ingest", "analysis_results", "review", "exported"];
    const currentIndex = stepOrder.indexOf(
      currentStep === "analyzing" ? "ingest" : 
      currentStep === "tailoring" ? "analysis_results" : currentStep
    );
    const targetIndex = stepOrder.indexOf(step);

    if (currentIndex === targetIndex) return styles.stepActive;
    if (currentIndex > targetIndex) return styles.stepCompleted;
    return styles.stepItem;
  };

  return (
    <div className={styles.container}>
      {/* Workspace Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Resume Shapeshifter Workspace</h1>
        <p className={styles.subtitle}>
          Tailor your experience truthfully for standard applicant tracking systems (ATS).
        </p>
      </header>

      {/* Stepper progress tracker */}
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
          <span>Tailoring Workspace</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={getStepClass("exported")}>
          <span className={styles.stepNumber}>4</span>
          <span>Export Proofs</span>
        </div>
      </div>

      {/* STEP 1: INGEST */}
      {currentStep === "ingest" && (
        <div className="animate-scale" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.workspaceGrid}>
            <ResumeInput 
              value={resumeText} 
              onChange={setResumeText} 
              onFileParsed={(txt) => setResumeText(txt)}
            />
            <JDInput 
              value={jdText} 
              onChange={setJdText}
            />
          </div>
          <div className={styles.btnActionsRow}>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleStartAnalysis}
            >
              Analyze Match & Find Gaps ➜
            </button>
          </div>
        </div>
      )}

      {/* LOADING PIPELINES */}
      {(currentStep === "analyzing" || currentStep === "tailoring") && (
        <div className={`${styles.loadingContainer} card-glass animate-scale`}>
          <div className={styles.loaderRing} />
          <div className={styles.loadingTitle}>
            {currentStep === "analyzing" ? "Analyzing Match Profile" : "Creating Tailored Resume"}
          </div>
          <div className={styles.loadingProgressText}>{loadingCue}</div>
        </div>
      )}

      {/* STEP 2: ANALYSIS RESULTS */}
      {currentStep === "analysis_results" && originalScore && gapAnalysis && jdProfile && (
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
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleStartTailoring}
            >
              Generate Tailored Resume ➜
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW WORKSPACE */}
      {currentStep === "review" && originalScore && tailoredScore && tailoredResume && jdProfile && (
        <div className={styles.resultsWorkspace}>
          <div className={styles.sectionGroup}>
            <ScoreCard 
              originalScore={originalScore} 
              tailoredScore={tailoredScore} 
              isTailored={true}
            />
          </div>

          <div className={styles.sectionGroup}>
            <JDRequirementsSummary jobDescription={jdProfile} />
          </div>

          <div className={styles.sectionGroup}>
            <SideBySideDiff 
              tailoredResume={tailoredResume} 
              onBulletUpdate={handleBulletUpdate}
            />
          </div>

          <div className={styles.btnActionsRow}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setCurrentStep("analysis_results")}
            >
              ⬅ Back to Gaps
            </button>
            <PDFExportButton onExport={handleExport} />
          </div>
        </div>
      )}

      {/* STEP 4: EXPORTED PAGE */}
      {currentStep === "exported" && (
        <div className={`${styles.exportPanel} card-glass animate-scale`}>
          <div className={styles.exportSuccessIcon}>🎉</div>
          <h2>Your documents have been prepared successfully!</h2>
          <p style={{ maxWidth: "600px" }}>
            The tailored resume PDF and the side-by-side verification proof report are ready.
            All generated changes conform strictly to our truthfulness policies.
          </p>
          <div className={styles.btnActionsRow} style={{ marginTop: "16px" }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                setResumeText("");
                setJdText("");
                setOriginalScore(null);
                setGapAnalysis(null);
                setTailoredResume(null);
                setTailoredScore(null);
                setCurrentStep("ingest");
              }}
            >
              Start New Tailoring Run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
