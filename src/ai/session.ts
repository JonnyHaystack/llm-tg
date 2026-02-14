import type { ModelMessage } from "ai";

type ChatState = {
  history: ModelMessage[];
  modelId?: string;
  summary?: string;
  summaryUpdatedAt?: string;
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
  state.summary = undefined;
  state.summaryUpdatedAt = undefined;
  return state.history;
}

export function getChatModelId(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).modelId;
}

export function setChatModelId(chatId: string, modelId: string) {
  const state = getOrCreateChatState(chatId);
  state.modelId = modelId;
}

export function getChatSummary(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).summary;
}

export function setChatSummary(chatId: string, summary: string) {
  const state = getOrCreateChatState(chatId);
  state.summary = summary;
  state.summaryUpdatedAt = new Date().toISOString();
}

export function clearChatSummary(chatId: string) {
  const state = getOrCreateChatState(chatId);
  state.summary = undefined;
  state.summaryUpdatedAt = undefined;
}

export function compactChatHistory(
  chatId: string,
  keepTurns: number,
): ModelMessage[] {
  const state = getOrCreateChatState(chatId);

  if (keepTurns <= 0) {
    state.history = [];
    return state.history;
  }

  const history = state.history;
  if (history.length === 0) {
    return history;
  }

  let userTurnsSeen = 0;
  let startIndex = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "user") {
      userTurnsSeen += 1;
      if (userTurnsSeen === keepTurns) {
        startIndex = i;
        break;
      }
    }
  }

  state.history =
    userTurnsSeen < keepTurns ? history : history.slice(startIndex);
  return state.history;
}
