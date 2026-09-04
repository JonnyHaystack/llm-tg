import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "bun";
import { logger } from "../utils/logger";
import type { ModelMessage } from "ai";

export type PersistedChatState = {
  history: ModelMessage[];
  modelId?: string;
  summary?: string;
  tokenUsage?: { totalInputTokens: number; totalOutputTokens: number };
  lastContextTokens?: number;
};

const dataDir = env.CHAT_DATA_DIR ?? "./data/chats";

export function initPersistence() {
  mkdirSync(dataDir, { recursive: true });
  logger.info("persistence.initialized", { path: dataDir });
}

function chatFilePath(chatId: string): string {
  return join(dataDir, `${chatId}.json`);
}

export function loadChatState(chatId: string): PersistedChatState | null {
  const path = chatFilePath(chatId);
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as PersistedChatState;
  } catch (error) {
    logger.error("persistence.load.error", error, { chatId });
    return null;
  }
}

export function saveChatState(chatId: string, state: PersistedChatState): void {
  Bun.write(chatFilePath(chatId), JSON.stringify(state, null, 2)).catch(
    (error) => {
      logger.error("persistence.save.error", error, { chatId });
    },
  );
}
