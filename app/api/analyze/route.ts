import { NextResponse } from "next/server";
import { parseResume } from "@/services/resume-parser";
import { parseJobDescription } from "@/services/jd-parser";
import { scoreMatch } from "@/services/match-engine";
import { analyzeGaps } from "@/services/gap-engine";
import {
  readBoundedRequestJson,
  requireBoundedText,
  requestBoundaryStatus,
} from "@/lib/request-guards";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedRequestJson(request);
    const resumeText = requireBoundedText(body.resumeText, "resumeText");
    const jdText = requireBoundedText(body.jdText, "jdText");

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
      boundary: {
        serverPersistence: false,
        externalSubmission: false,
      },
    });
  } catch (error: unknown) {
    const status = requestBoundaryStatus(error);
    if (status >= 500) console.error("API Analyze handler failed:", error);
    const message =
      status >= 500
        ? "An unexpected error occurred during analysis."
        : errorMessage(error, "The analysis request is invalid.");
    return NextResponse.json({ error: message }, { status });
  }
}
