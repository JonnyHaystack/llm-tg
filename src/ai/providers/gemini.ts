import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from 'bun';

const GEMINI_API_KEY = env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error(
    "A Gemini API key must be provided with the environment variable GEMINI_API_KEY",
  );
}

export const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});
