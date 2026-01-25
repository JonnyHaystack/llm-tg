import type { ModelMessage } from "ai";

const chatMap = new Map<string, ModelMessage[]>();

export function getOrCreateChat(chatId: string): ModelMessage[] {
  if (!chatMap.has(chatId)) {
    chatMap.set(chatId, []);
  }
  return chatMap.get(chatId)!;
}

export function resetChat(chatId: string) {
  chatMap.set(chatId, []);
  return chatMap.get(chatId)!;
}
