import { callGroq } from "./groq";
import { resumeParserPrompt } from "@/prompts/resume-parser";
import { ResumeProfile, ResumeProfileSchema } from "@/lib/schemas";
import { mockResume } from "@/lib/mockData";

export async function parseResume(rawText: string): Promise<ResumeProfile> {
  if (!rawText.trim()) {
    throw new Error("Resume content is empty.");
  }

  const prompt = resumeParserPrompt.replace("{RESUME_TEXT}", rawText);
  const result = await callGroq(prompt, 0.1);

  if (!result) {
    // Graceful fallback to mock data
    return mockResume;
  }

  // Validate output using Zod
  const parsed = ResumeProfileSchema.safeParse(result);
  if (!parsed.success) {
    console.error("Zod Schema Validation Failure on parsed resume:", parsed.error);
    // If validation fails, return best effort or fall back to mock data
    return mockResume;
  }

  return parsed.data;
}
