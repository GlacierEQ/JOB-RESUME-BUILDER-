import { callGroq } from "./groq";
import { jdExtractionPrompt } from "@/prompts/jd-extraction";
import { JobDescriptionProfile, JobDescriptionProfileSchema } from "@/lib/schemas";
import { mockJobDescription } from "@/lib/mockData";

export async function parseJobDescription(rawText: string): Promise<JobDescriptionProfile> {
  if (!rawText.trim()) {
    throw new Error("Job Description content is empty.");
  }

  const prompt = jdExtractionPrompt.replace("{JD_TEXT}", rawText);
  const result = await callGroq(prompt, 0.1);

  if (!result) {
    return mockJobDescription;
  }

  const parsed = JobDescriptionProfileSchema.safeParse(result);
  if (!parsed.success) {
    console.error("Zod Schema Validation Failure on extracted JD:", parsed.error);
    return mockJobDescription;
  }

  return parsed.data;
}
