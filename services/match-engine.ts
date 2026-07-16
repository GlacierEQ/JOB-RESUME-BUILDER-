import { callGroq } from "./groq";
import { matchScoringPrompt } from "@/prompts/match-scoring";
import { ResumeProfile, JobDescriptionProfile, MatchScore, MatchScoreSchema } from "@/lib/schemas";

export async function scoreMatch(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
): Promise<MatchScore> {
  const prompt = matchScoringPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.0);
  const parsed = MatchScoreSchema.safeParse(result);

  if (!parsed.success) {
    throw new Error("The model returned an invalid match score.", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
