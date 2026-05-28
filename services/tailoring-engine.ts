import { callGroq } from "./groq";
import { bulletRewriterPrompt } from "@/prompts/bullet-rewriter";
import { ResumeProfile, JobDescriptionProfile, GapAnalysis, TailoredResume, TailoredResumeSchema } from "@/lib/schemas";
import { mockTailoredResume } from "@/lib/mockData";

export async function tailorResume(
  resume: ResumeProfile, 
  jd: JobDescriptionProfile,
  gaps: GapAnalysis
): Promise<TailoredResume> {
  const prompt = bulletRewriterPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{GAPS_JSON}", JSON.stringify(gaps, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.3); // Moderate temperature for natural tailoring phrasing

  if (!result) {
    return mockTailoredResume;
  }

  const parsed = TailoredResumeSchema.safeParse(result);
  if (!parsed.success) {
    console.error("Zod Schema Validation Failure on tailored resume:", parsed.error);
    return mockTailoredResume;
  }

  return parsed.data;
}
