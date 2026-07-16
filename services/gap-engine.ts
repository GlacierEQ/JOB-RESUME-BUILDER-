import { callGroq } from "./groq";
import { gapAnalysisPrompt } from "@/prompts/gap-analysis";
import { ResumeProfile, JobDescriptionProfile, GapAnalysis, GapAnalysisSchema } from "@/lib/schemas";

export async function analyzeGaps(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
): Promise<GapAnalysis> {
  const prompt = gapAnalysisPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.0);
  const parsed = GapAnalysisSchema.safeParse(result);

  if (!parsed.success) {
    throw new Error("The model returned an invalid gap analysis.", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
