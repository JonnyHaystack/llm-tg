import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from 'bun';

const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error(
    "An OpenRouter API key must be provided with the environment variable OPENROUTER_API_KEY",
  );
}

export const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});
