import type { ModelMessage } from "ai";
import {
  initPersistence,
  loadChatState,
  saveChatState,
  type PersistedChatState,
} from "./persistence";

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

export function initSession() {
  initPersistence();
}

function toPersistedState(state: ChatState): PersistedChatState {
  return {
    history: state.history,
    modelId: state.modelId,
    summary: state.summary,
    tokenUsage: state.tokenUsage,
    lastContextTokens: state.lastContextTokens,
  };
}

function persistChat(chatId: string) {
  const state = chatMap.get(chatId);
  if (!state) return;
  saveChatState(chatId, toPersistedState(state));
}

function getOrCreateChatState(chatId: string): ChatState {
  if (chatMap.has(chatId)) return chatMap.get(chatId)!;

  const persisted = loadChatState(chatId);
  if (persisted) {
    const state: ChatState = {
      history: persisted.history ?? [],
      modelId: persisted.modelId,
      summary: persisted.summary,
      tokenUsage: persisted.tokenUsage,
      lastContextTokens: persisted.lastContextTokens,
    };
    chatMap.set(chatId, state);
    return state;
  }

  const fresh: ChatState = { history: [] };
  chatMap.set(chatId, fresh);
  return fresh;
}

export function getOrCreateChat(chatId: string): ModelMessage[] {
  return getOrCreateChatState(chatId).history;
}

export function pushMessages(chatId: string, ...messages: ModelMessage[]) {
  const state = getOrCreateChatState(chatId);
  state.history.push(...messages);
  persistChat(chatId);
}

export function resetChat(chatId: string) {
  const state = getOrCreateChatState(chatId);
  state.history = [];
  state.tokenUsage = undefined;
  state.summary = undefined;
  state.lastContextTokens = undefined;
  persistChat(chatId);
  return state.history;
}

/**
 * Drop the raw history while leaving the chat's summary, model selection and
 * lifetime token totals in place.
 */
export function clearChatHistory(chatId: string) {
  const state = getOrCreateChatState(chatId);
  state.history = [];
  persistChat(chatId);
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
  persistChat(chatId);
}

export function getChatModelId(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).modelId;
}

export function setChatModelId(chatId: string, modelId: string) {
  const state = getOrCreateChatState(chatId);
  state.modelId = modelId;
  persistChat(chatId);
}

export function getChatSummary(chatId: string): string | undefined {
  return getOrCreateChatState(chatId).summary;
}

export function setChatSummary(chatId: string, summary: string | undefined) {
  const state = getOrCreateChatState(chatId);
  state.summary = summary;
  persistChat(chatId);
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
  persistChat(chatId);
}

export function isCompacting(chatId: string): boolean {
  return getOrCreateChatState(chatId).compacting === true;
}

export function setCompacting(chatId: string, compacting: boolean) {
  const state = getOrCreateChatState(chatId);
  state.compacting = compacting;
}
