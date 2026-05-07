import { createGroq } from "@ai-sdk/groq";
import { env } from 'bun';

const GROQ_API_KEY = env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  throw new Error(
    "A Groq API key must be provided with the environment variable GROQ_API_KEY",
  );
}

export const groq = createGroq({
  apiKey: GROQ_API_KEY,
});
