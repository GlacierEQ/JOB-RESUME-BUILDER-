import { callGroq } from "./groq";
import { jdExtractionPrompt } from "@/prompts/jd-extraction";
import { JobDescriptionProfile, JobDescriptionProfileSchema } from "@/lib/schemas";

export async function parseJobDescription(rawText: string): Promise<JobDescriptionProfile> {
  if (!rawText.trim()) {
    throw new Error("Job description content is empty.");
  }

  const prompt = jdExtractionPrompt.replace("{JD_TEXT}", rawText);
  const result = await callGroq(prompt, 0.1);
  const parsed = JobDescriptionProfileSchema.safeParse(result);

  if (!parsed.success) {
    throw new Error("The model returned an invalid job-description profile.", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
