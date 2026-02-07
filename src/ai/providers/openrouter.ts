import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error(
    "An OpenRouter API key must be provided with the environment variable OPENROUTER_API_KEY",
  );
}

export const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});
