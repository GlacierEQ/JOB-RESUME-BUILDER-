import { callGroq } from "./groq";
import { resumeParserPrompt } from "@/prompts/resume-parser";
import { ResumeProfile, ResumeProfileSchema } from "@/lib/schemas";

export async function parseResume(rawText: string): Promise<ResumeProfile> {
  if (!rawText.trim()) {
    throw new Error("Resume content is empty.");
  }

  const prompt = resumeParserPrompt.replace("{RESUME_TEXT}", rawText);
  const result = await callGroq(prompt, 0.1);
  const parsed = ResumeProfileSchema.safeParse(result);

  if (!parsed.success) {
    throw new Error("The model returned an invalid resume profile.", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
