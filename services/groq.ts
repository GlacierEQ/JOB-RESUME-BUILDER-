import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

export class ModelServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelServiceUnavailableError";
  }
}

// Create the client only when configuration is present. Runtime calls fail
// explicitly rather than substituting sample data for a real user request.
export const groqClient = apiKey ? new Groq({ apiKey }) : null;

/**
 * Call the Groq API and return parsed JSON.
 *
 * This boundary is intentionally fail-closed: missing configuration, an empty
 * response, malformed JSON, or an upstream error must be visible to the caller.
 */
export async function callGroq(prompt: string, temperature = 0.1): Promise<unknown> {
  if (!groqClient) {
    throw new ModelServiceUnavailableError(
      "Resume Shapeshifter is not configured for model-backed analysis. Set GROQ_API_KEY in the deployment environment.",
    );
  }

  try {
    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new Error("The model service returned an empty response.");
    }

    return cleanAndParseJson(rawContent);
  } catch (error) {
    if (error instanceof ModelServiceUnavailableError) {
      throw error;
    }

    throw new Error(
      `Model service request failed: ${error instanceof Error ? error.message : "Unknown failure"}`,
      { cause: error },
    );
  }
}

/** Parse JSON content while tolerating a surrounding Markdown code fence. */
export function cleanAndParseJson(rawText: string): unknown {
  let cleanedText = rawText.trim();

  if (cleanedText.includes("```")) {
    const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      cleanedText = jsonMatch[1].trim();
    }
  }

  const startBraceIdx = cleanedText.indexOf("{");
  const endBraceIdx = cleanedText.lastIndexOf("}");

  if (startBraceIdx !== -1 && endBraceIdx !== -1) {
    cleanedText = cleanedText.substring(startBraceIdx, endBraceIdx + 1);
  }

  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    throw new Error("Malformed JSON received from the model service.", { cause: error });
  }
}
