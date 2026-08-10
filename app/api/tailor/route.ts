import { NextResponse } from "next/server";
import { tailorResume } from "@/services/tailoring-engine";
import { scoreMatch } from "@/services/match-engine";
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  ResumeProfileSchema,
  type ResumeProfile,
} from "@/lib/schemas";
import {
  readBoundedRequestJson,
  requireBoundedJsonObject,
  requestBoundaryStatus,
} from "@/lib/request-guards";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedRequestJson(request);
    const rawResume = requireBoundedJsonObject(body.resume, "resume");
    const rawJobDescription = requireBoundedJsonObject(
      body.jobDescription,
      "jobDescription",
    );
    const rawGapAnalysis = requireBoundedJsonObject(
      body.gapAnalysis,
      "gapAnalysis",
    );

    const typedResume = ResumeProfileSchema.parse(rawResume);
    const typedJobDescription = JobDescriptionProfileSchema.parse(
      rawJobDescription,
    );
    const gapAnalysis = GapAnalysisSchema.parse(rawGapAnalysis);

    const tailoredResume = await tailorResume(
      typedResume,
      typedJobDescription,
      gapAnalysis,
    );

    const tailoredResumeProfile: ResumeProfile = {
      ...typedResume,
      summary: tailoredResume.tailoredSummary,
      skills: tailoredResume.tailoredSkills,
      experience: typedResume.experience.map((experience) => {
        const tailoredExperience = tailoredResume.tailoredExperience.find(
          (candidate) =>
            candidate.company.toLowerCase() === experience.company.toLowerCase(),
        );
        return {
          ...experience,
          bullets: experience.bullets.map(
            (bullet: string, bulletIndex: number) => {
              const tailoredBullet = tailoredExperience?.bullets[bulletIndex];
              return tailoredBullet ? tailoredBullet.tailored : bullet;
            },
          ),
        };
      }),
    };

    const tailoredScore = await scoreMatch(
      tailoredResumeProfile,
      typedJobDescription,
    );

    return NextResponse.json({
      tailoredResume,
      tailoredMatch: tailoredScore,
      status: "tailored",
      boundary: {
        modelOutputTrustedWithoutValidation: false,
        serverPersistence: false,
        externalSubmission: false,
      },
    });
  } catch (error: unknown) {
    const status = requestBoundaryStatus(error);
    if (status >= 500) console.error("API Tailor handler failed:", error);
    const message =
      status >= 500
        ? "An unexpected error occurred during tailoring."
        : errorMessage(error, "The tailoring request is invalid.");
    return NextResponse.json({ error: message }, { status });
  }
}
