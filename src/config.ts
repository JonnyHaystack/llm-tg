import { z } from "zod";

const schema = z.object({
  TELEGRAM_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  GROQ_DEFAULT_MODEL_ID: z.string(),
  WEB_SEARCH_MODEL_ID: z.string(),
  AUTO_COMPACT_TOKEN_THRESHOLD: z.coerce.number().int().positive().optional(),
  CHAT_DATA_DIR: z.string().default("./data/chats"),
});

// Blank values count as unset, so `KEY=` in a .env file falls back to the default.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value?.trim()),
);

const parsed = schema.safeParse(env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const config = parsed.data;
