import type { ModelMessage } from "ai";

/**
 * Token accounting for a chat, accumulated over every turn since it was last
 * reset.
 */
export type ChatTokenUsage = {
  totalInputTokens: number;
  totalOutputTokens: number;
};

type ChatState = {
  history: ModelMessage[];
  modelId?: string;
  tokenUsage?: ChatTokenUsage;
};

const chatMap = new Map<string, ChatState>();

function emptyTokenUsage(): ChatTokenUsage {
  return { totalInputTokens: 0, totalOutputTokens: 0 };
}

function getOrCreateChatState(chatId: string): ChatState {
  if (!chatMap.has(chatId)) {
    chatMap.set(chatId, { history: [] });
  }
  return chatMap.get(chatId)!;
}

export function getOrCreateChat(chatId: string): ModelMessage[] {
  return getOrCreateChatState(chatId).history;
}

export function resetChat(chatId: string) {
  const state = getOrCreateChatState(chatId);
  state.history = [];
  state.tokenUsage = undefined;
  return state.history;
}

export function getChatTokenUsage(chatId: string): ChatTokenUsage {
  return getOrCreateChatState(chatId).tokenUsage ?? emptyTokenUsage();
}

export function addChatTokenUsage(
  chatId: string,
  update: { inputTokens?: number; outputTokens?: number },
) {
  const state = getOrCreateChatState(chatId);
  const current = state.tokenUsage ?? emptyTokenUsage();

  state.tokenUsage = {
    totalInputTokens: current.totalInputTokens + (update.inputTokens ?? 0),
    totalOutputTokens: current.totalOutputTokens + (update.outputTokens ?? 0),
  };
}

export function getChatModelId(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).modelId;
}

export function setChatModelId(chatId: string, modelId: string) {
  const state = getOrCreateChatState(chatId);
  state.modelId = modelId;
}
