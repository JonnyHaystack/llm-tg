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
  /** Running summary of everything compacted out of `history` so far. */
  summary?: string;
  /** Size of the context the model last saw, as reported by the provider. */
  lastContextTokens?: number;
  /** Set while a compaction is in flight, so two turns can't compact at once. */
  compacting?: boolean;
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
  state.summary = undefined;
  state.lastContextTokens = undefined;
  return state.history;
}

/**
 * Drop the raw history while leaving the chat's summary, model selection and
 * lifetime token totals in place.
 */
export function clearChatHistory(chatId: string) {
  const state = getOrCreateChatState(chatId);
  state.history = [];
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

export function getChatSummary(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).summary;
}

export function setChatSummary(chatId: string, summary: string | undefined) {
  const state = getOrCreateChatState(chatId);
  state.summary = summary;
}

export function getLastContextTokens(chatId: string): number | undefined {
  return getOrCreateChatState(chatId).lastContextTokens;
}

export function setLastContextTokens(
  chatId: string,
  tokens: number | undefined,
) {
  const state = getOrCreateChatState(chatId);
  state.lastContextTokens = tokens;
}

export function isCompacting(chatId: string): boolean {
  return getOrCreateChatState(chatId).compacting === true;
}

export function setCompacting(chatId: string, compacting: boolean) {
  const state = getOrCreateChatState(chatId);
  state.compacting = compacting;
}
