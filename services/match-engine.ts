import { callGroq } from "./groq";
import { matchScoringPrompt } from "@/prompts/match-scoring";
import { ResumeProfile, JobDescriptionProfile, MatchScore, MatchScoreSchema } from "@/lib/schemas";
import { mockOriginalScore } from "@/lib/mockData";

export async function scoreMatch(
  resume: ResumeProfile, 
  jd: JobDescriptionProfile
): Promise<MatchScore> {
  const prompt = matchScoringPrompt
    .replace("{JD_PROFILE_JSON}", JSON.stringify(jd, null, 2))
    .replace("{RESUME_PROFILE_JSON}", JSON.stringify(resume, null, 2));

  const result = await callGroq(prompt, 0.0); // Exact precision temperature

  if (!result) {
    return mockOriginalScore;
  }

  const parsed = MatchScoreSchema.safeParse(result);
  if (!parsed.success) {
    console.error("Zod Schema Validation Failure on computed scores:", parsed.error);
    return mockOriginalScore;
  }

  return parsed.data;
}
