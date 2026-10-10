import { expect, mock, test } from "bun:test";
import { getModelId } from "../ai/chat";
import { getChat } from "../ai/chat-store";
import { uniqueChatId } from "../test-setup";
import { handleSwitchModel } from "./commands";

function switchModel(chatId: number, match: string) {
  return handleSwitchModel({
    chat: { id: chatId },
    msg: { message_id: 1 },
    match,
    reply: mock(async () => true),
  } as unknown as Parameters<typeof handleSwitchModel>[0]);
}

test("/switchmodel default goes back to the configured model", async () => {
  const chatId = uniqueChatId();

  await switchModel(chatId, "chosen-model");
  expect(getModelId(chatId)).toBe("chosen-model");

  await switchModel(chatId, "default");
  expect(getChat(chatId).modelId).toBeUndefined();
  expect(getModelId(chatId)).toBe("default-model");
});
