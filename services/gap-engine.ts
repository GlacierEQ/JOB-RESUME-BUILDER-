import { callGroq } from "./groq";
import { gapAnalysisPrompt } from "@/prompts/gap-analysis";
import { ResumeProfile, JobDescriptionProfile, GapAnalysis, GapAnalysisSchema } from "@/lib/schemas";
import { mockGapAnalysis } from "@/lib/mockData";

export async function analyzeGaps(
  resume: ResumeProfile, 
  jd: JobDescriptionProfile
): Promise<GapAnalysis> {
  const prompt = gapAnalysisPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.0);

  if (!result) {
    return mockGapAnalysis;
  }

  const parsed = GapAnalysisSchema.safeParse(result);
  if (!parsed.success) {
    console.error("Zod Schema Validation Failure on gap analysis:", parsed.error);
    return mockGapAnalysis;
  }

  return parsed.data;
}
