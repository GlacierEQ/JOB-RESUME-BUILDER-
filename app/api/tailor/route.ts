import { NextResponse } from "next/server";
import { tailorResume } from "@/services/tailoring-engine";
import { scoreMatch } from "@/services/match-engine";
import { ResumeProfile, JobDescriptionProfile } from "@/lib/schemas";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const { resume, jobDescription, gapAnalysis } = await request.json();

    if (!resume || !jobDescription || !gapAnalysis) {
      return NextResponse.json(
        { error: "Missing required inputs: resume, jobDescription, and gapAnalysis must be provided." },
        { status: 400 },
      );
    }

    const typedResume = resume as ResumeProfile;
    const typedJobDescription = jobDescription as JobDescriptionProfile;
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
          bullets: experience.bullets.map((bullet: string, bulletIndex: number) => {
            const tailoredBullet = tailoredExperience?.bullets[bulletIndex];
            return tailoredBullet ? tailoredBullet.tailored : bullet;
          }),
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
    });
  } catch (error: unknown) {
    console.error("API Tailor handler failed:", error);
    return NextResponse.json(
      { error: errorMessage(error, "An unexpected error occurred during tailoring.") },
      { status: 500 },
    );
  }
}
