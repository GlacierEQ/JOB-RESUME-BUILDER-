import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

// Create client only if API key is provided to prevent runtime load exceptions
export const groqClient = apiKey ? new Groq({ apiKey }) : null;

/**
 * Helper to call the Groq LLM API with structured instructions and fallback resilience.
 * @param prompt The complete structured prompt containing formatting schemas.
 * @param temperature Value between 0.0 and 1.0.
 */
export async function callGroq(prompt: string, temperature = 0.1): Promise<any> {
  if (!groqClient) {
    console.warn("Groq SDK: GROQ_API_KEY is not configured. Falling back to structured mock data.");
    return null;
  }

  try {
    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature,
      // request strict JSON mode where compatible
      response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0]?.message?.content || "";
    
    // Process response to extract JSON cleanly
    return cleanAndParseJson(rawContent);
  } catch (error) {
    console.error("Groq SDK execution failed:", error);
    throw new Error(`LLM Service Error: ${error instanceof Error ? error.message : "Unknown failure"}`);
  }
}

/**
 * Helper to clean and parse raw LLM output strings that may contain conversational text or markdown code wraps.
 */
function cleanAndParseJson(rawText: string): any {
  let cleanedText = rawText.trim();
  
  // Extract content inside outer brackets if markdown blocks exist
  if (cleanedText.includes("```")) {
    const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      cleanedText = jsonMatch[1].trim();
    }
  }

  // Double check braces balance
  const startBraceIdx = cleanedText.indexOf("{");
  const endBraceIdx = cleanedText.lastIndexOf("}");
  
  if (startBraceIdx !== -1 && endBraceIdx !== -1) {
    cleanedText = cleanedText.substring(startBraceIdx, endBraceIdx + 1);
  }

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON syntax parse exception on LLM output. Raw string was:\n", rawText);
    throw new Error("Malformed JSON received from LLM service. Failed to parse.");
  }
}
