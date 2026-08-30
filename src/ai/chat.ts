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
  getChatSummary,
  getChatTokenUsage,
  getLastContextTokens,
  getOrCreateChat,
  resetChat,
  setLastContextTokens,
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
  contextTokens?: number;
  summaryChars: number;
};

export const BASE_SYSTEM_PROMPT = [
  "You are a helpful chat bot in a group chat setting.",
  "You must only respond in a small subset of valid markdown: for example **bold**, *italic*, `code`, ~~strike~~, ```<language>\ncode\n```. Tables, math formatting, etc. are not supported.",
  "Be concise while still conveying substantially all information relevant to any question.",
  "Don't worry about formalities, but respond in a pleasant manner.",
].join("\n");

/**
 * The system prompt for a chat, with its compaction summary folded in when the
 * conversation has been compacted.
 */
export function buildSystemPrompt(chatId: string): string {
  const summary = getChatSummary(chatId);
  if (!summary) {
    return BASE_SYSTEM_PROMPT;
  }

  return [
    BASE_SYSTEM_PROMPT,
    "",
    "The earlier part of this conversation was compacted to save space. The summary below is established context you already know - continue the conversation naturally from it, and don't mention that a summary exists unless asked.",
    "<conversation_summary>",
    summary,
    "</conversation_summary>",
  ].join("\n");
}

export function resolveChatModel(chatId: string) {
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

/** The slice of a generateText result that carries the final step's counts. */
type ContextMeasuredResult = {
  usage?: { inputTokens?: number; outputTokens?: number };
};

function finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Add what a finished turn cost to the chat's running totals.
 *
 * `result.totalUsage` sums every step, so it is what the turn actually billed
 * once tool calls are counted - unlike `result.usage`, which covers the final
 * step alone.
 */
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

/**
 * Record how big the context was after a turn, which is what auto-compaction
 * triggers on.
 *
 * This deliberately reads `result.usage` - the final step alone, whose input is
 * the system prompt plus the whole history - rather than `result.totalUsage`,
 * which sums every step and would wildly overcount. Provider-reported usage is
 * the only source: if it is missing, the previous measurement is left in place
 * rather than estimated.
 */
export function recordContextSize({
  chatId,
  result,
}: {
  chatId: string;
  result: ContextMeasuredResult;
}) {
  const inputTokens = finiteOrUndefined(result.usage?.inputTokens);
  const outputTokens = finiteOrUndefined(result.usage?.outputTokens);

  if (inputTokens === undefined || outputTokens === undefined) {
    return;
  }

  setLastContextTokens(chatId, inputTokens + outputTokens);
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
    contextTokens: getLastContextTokens(chatId),
    summaryChars: getChatSummary(chatId)?.length ?? 0,
  };
}

export async function sendMessage({
  chatId,
  messageContext,
  message,
  images,
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
      system: buildSystemPrompt(chatId),
      messages,
      tools: {
        googleSearch: googleSearchTool,
      },
      stopWhen: stepCountIs(5),
    });

    history.push(userMessage, ...result.response.messages);
    recordTurnUsage({ chatId, result });
    recordContextSize({ chatId, result });

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
