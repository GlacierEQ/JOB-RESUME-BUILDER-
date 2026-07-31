import { NextResponse } from "next/server";
import { parseResume } from "@/services/resume-parser";
import { parseJobDescription } from "@/services/jd-parser";
import { scoreMatch } from "@/services/match-engine";
import { analyzeGaps } from "@/services/gap-engine";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const { resumeText, jdText } = await request.json();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Missing required inputs: resumeText and jdText must be provided." },
        { status: 400 },
      );
    }

    const resumeProfile = await parseResume(resumeText);
    const jdProfile = await parseJobDescription(jdText);

    const [originalScore, gapAnalysis] = await Promise.all([
      scoreMatch(resumeProfile, jdProfile),
      analyzeGaps(resumeProfile, jdProfile),
    ]);

    return NextResponse.json({
      resume: resumeProfile,
      jobDescription: jdProfile,
      originalMatch: originalScore,
      gapAnalysis,
      status: "analyzed",
    });
  } catch (error: unknown) {
    console.error("API Analyze handler failed:", error);
    return NextResponse.json(
      { error: errorMessage(error, "An unexpected error occurred during analysis.") },
      { status: 500 },
    );
  }
}
