import { callGroq } from "./groq";
import { bulletRewriterPrompt } from "@/prompts/bullet-rewriter";
import { assertTruthfulTailoring } from "@/lib/truthfulness";
import {
  ResumeProfile,
  JobDescriptionProfile,
  GapAnalysis,
  TailoredResume,
  TailoredResumeSchema,
} from "@/lib/schemas";

export async function tailorResume(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
  gaps: GapAnalysis,
): Promise<TailoredResume> {
  const prompt = bulletRewriterPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{GAPS_JSON}", JSON.stringify(gaps, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.3);
  const parsed = TailoredResumeSchema.safeParse(result);

  if (!parsed.success) {
    throw new Error("The model returned an invalid tailored resume.", {
      cause: parsed.error,
    });
  }

  assertTruthfulTailoring(resume, parsed.data);
  return parsed.data;
}
