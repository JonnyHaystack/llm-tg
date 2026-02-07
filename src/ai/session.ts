import type { ModelMessage } from "ai";

type ChatState = {
  history: ModelMessage[];
  modelId?: string;
};

const chatMap = new Map<string, ChatState>();

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
  return state.history;
}

export function getChatModelId(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).modelId;
}

export function setChatModelId(chatId: string, modelId: string) {
  const state = getOrCreateChatState(chatId);
  state.modelId = modelId;
}
