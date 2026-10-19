import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const groqModel = process.env.GROQ_API_KEY
  ? new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.AI_MODEL || "openai/gpt-oss-20b",
      temperature: 0.3,
    })
  : null;

const hasOpenAI = !!process.env.OPENAI_API_KEY;
const openAIModel = hasOpenAI
  ? new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
    })
  : null;

/**
 * Invokes the LLM with fallback logic: Groq -> OpenAI -> Error
 */
export async function callLLM(messages: any[]) {
  try {
    if (groqModel) return await groqModel.invoke(messages);
  } catch (err: unknown) {
    console.error("[LLM] Groq failed:", err instanceof Error ? err.message : err);
  }

  if (openAIModel) {
    try {
      console.log("[LLM] OpenAI fallback");
      return await openAIModel.invoke(messages);
    } catch (err: unknown) {
      console.error("[LLM] OpenAI fallback failed:", err instanceof Error ? err.message : err);
      throw new Error("AI Temporarily Unavailable");
    }
  }

  throw new Error("AI Temporarily Unavailable");
}

// Keep the default export for backward compatibility if needed, 
// though we should switch to using callLLM
export const llm = groqModel || openAIModel;