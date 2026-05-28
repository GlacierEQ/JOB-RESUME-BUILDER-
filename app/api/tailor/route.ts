import { NextResponse } from "next/server";
import { tailorResume } from "@/services/tailoring-engine";
import { scoreMatch } from "@/services/match-engine";
import { ResumeProfile, JobDescriptionProfile } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const { resume, jobDescription, gapAnalysis } = await request.json();

    if (!resume || !jobDescription || !gapAnalysis) {
      return NextResponse.json(
        { error: "Missing required inputs: resume, jobDescription, and gapAnalysis must be provided." },
        { status: 400 }
      );
    }

    const typedResume = resume as ResumeProfile;
    const typedJobDescription = jobDescription as JobDescriptionProfile;

    // Run the tailoring engine
    const tailoredResume = await tailorResume(typedResume, typedJobDescription, gapAnalysis);

    // Prepare a mock ResumeProfile from tailored output to pass into the scoring engine
    const tailoredResumeProfile: ResumeProfile = {
      ...typedResume,
      summary: tailoredResume.tailoredSummary,
      skills: tailoredResume.tailoredSkills,
      experience: typedResume.experience.map((exp, companyIdx) => {
        const tailoredExp = tailoredResume.tailoredExperience.find(
          (te) => te.company.toLowerCase() === exp.company.toLowerCase()
        );
        return {
          ...exp,
          bullets: exp.bullets.map((b: string, bulletIdx: number) => {
            const tb = tailoredExp?.bullets[bulletIdx];
            return tb ? tb.tailored : b;
          })
        };
      })
    };

    // Calculate the post-tailored match score
    const tailoredScore = await scoreMatch(tailoredResumeProfile, jobDescription);

    return NextResponse.json({
      tailoredResume: tailoredResume,
      tailoredMatch: tailoredScore,
      status: "tailored"
    });
  } catch (error: any) {
    console.error("API Tailor handler failed:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during tailoring." },
      { status: 500 }
    );
  }
}
