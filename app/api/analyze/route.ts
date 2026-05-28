import { NextResponse } from "next/server";
import { parseResume } from "@/services/resume-parser";
import { parseJobDescription } from "@/services/jd-parser";
import { scoreMatch } from "@/services/match-engine";
import { analyzeGaps } from "@/services/gap-engine";

export async function POST(request: Request) {
  try {
    const { resumeText, jdText } = await request.json();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Missing required inputs: resumeText and jdText must be provided." },
        { status: 400 }
      );
    }

    // Sequentially orchestrate parsing, scoring, and gap services
    const resumeProfile = await parseResume(resumeText);
    const jdProfile = await parseJobDescription(jdText);
    
    const [originalScore, gapAnalysis] = await Promise.all([
      scoreMatch(resumeProfile, jdProfile),
      analyzeGaps(resumeProfile, jdProfile)
    ]);

    return NextResponse.json({
      resume: resumeProfile,
      jobDescription: jdProfile,
      originalMatch: originalScore,
      gapAnalysis: gapAnalysis,
      status: "analyzed"
    });
  } catch (error: any) {
    console.error("API Analyze handler failed:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during analysis." },
      { status: 500 }
    );
  }
}
