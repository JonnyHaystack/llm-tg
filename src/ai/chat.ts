import {
  generateText,
  stepCountIs,
  type ModelMessage,
  type UserContent,
} from "ai";
import { logger } from "../utils/logger";
import {
  addChatTokenUsage,
  getChatModelId,
  getChatTokenUsage,
  getOrCreateChat,
  resetChat,
} from "./session";
import { groq } from "./providers/groq";
import { googleSearchTool } from "./tools/web-search";
import type { InputFile } from "grammy";
import { env } from "bun";

export const DEFAULT_MODEL_ID = env.GROQ_DEFAULT_MODEL_ID!;

type GenerateTextFn = typeof generateText;

export type MessageContext = {
  firstname: string | undefined;
  userId?: string;
  timestamp: string;
  replyingTo?: string;
};

export type ImageData = {
  mimeType: string;
  data: string; // base64 encoded
};

export type SendMessageParams = {
  chatId: string;
  messageContext: MessageContext;
  message: string;
  images?: ImageData[];
  generateTextFn?: GenerateTextFn;
};

export type SendMessageResult = {
  text: string;
  images: InputFile[];
};

export type ChatDebugStats = {
  chatId: string;
  selectedModelId?: string;
  effectiveModelId: string;
  historyMessages: number;
  userMessages: number;
  assistantMessages: number;
  otherMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

export const systemPrompt = [
  "You are a helpful chat bot in a group chat setting.",
  "You must only respond in a small subset of valid markdown: for example **bold**, *italic*, `code`, ~~strike~~, ```<language>\\ncode\\n```. Tables, math formatting, etc. are not supported.",
  "Be concise while still conveying substantially all information relevant to any question.",
  "Don't worry about formalities, but respond in a pleasant manner.",
].join("\n");

function resolveChatModel(chatId: string) {
  const selection = getChatModelId(chatId);
  return groq(selection ?? DEFAULT_MODEL_ID);
}

function buildMessageContent(
  message: string,
  messageContext: MessageContext,
  images?: ImageData[],
): UserContent {
  const contextString = `Context: ${JSON.stringify(messageContext)}`;
  const content: UserContent = [
    { type: "text", text: `${contextString}\nMessage: ${message}` },
  ];

  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: "file",
        data: img.data,
        mediaType: img.mimeType,
      });
    }
  }

  return content;
}

/** The slice of a generateText result that carries token counts. */
type MeasuredResult = {
  totalUsage?: { inputTokens?: number; outputTokens?: number };
};

function finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function recordTurnUsage({
  chatId,
  result,
}: {
  chatId: string;
  result: MeasuredResult;
}) {
  addChatTokenUsage(chatId, {
    inputTokens: finiteOrUndefined(result.totalUsage?.inputTokens),
    outputTokens: finiteOrUndefined(result.totalUsage?.outputTokens),
  });
}

export function getChatDebugStats(chatId: string): ChatDebugStats {
  const history = getOrCreateChat(chatId);
  const selectedModelId = getChatModelId(chatId)?.trim();
  const effectiveModelId = selectedModelId || DEFAULT_MODEL_ID;
  const usage = getChatTokenUsage(chatId);

  const userMessages = history.filter(
    (message) => message.role === "user",
  ).length;
  const assistantMessages = history.filter(
    (message) => message.role === "assistant",
  ).length;

  return {
    chatId,
    selectedModelId,
    effectiveModelId,
    historyMessages: history.length,
    userMessages,
    assistantMessages,
    otherMessages: history.length - userMessages - assistantMessages,
    totalInputTokens: usage.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens,
  };
}

export async function sendMessage({
  chatId,
  messageContext,
  message,
  images
}: SendMessageParams): Promise<SendMessageResult> {
  const log = logger.child({ chatId });
  const chatModel = resolveChatModel(chatId);

  const history = getOrCreateChat(chatId);
  const userMessage: ModelMessage = {
    role: "user",
    content: buildMessageContent(message, messageContext, images),
  };
  const messages = [...history, userMessage];

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: systemPrompt,
      messages,
      tools: {
        googleSearch: googleSearchTool,
      },
      stopWhen: stepCountIs(5),
    });

    history.push(userMessage, ...result.response.messages);
    recordTurnUsage({ chatId, result });

    return {
      text: result.text,
      images: generatedImages,
    };
  } catch (error) {
    log.error("ai.chat.error", { error });

    throw error;
  }
}

export async function newChat({
  chatId,
}: {
  chatId: string;
}): Promise<SendMessageResult> {
  resetChat(chatId);

  return {
    text: "Chat history cleared.",
    images: [],
  };
}
