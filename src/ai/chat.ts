import { generateText, stepCountIs, type ModelMessage, type UserContent } from "ai";
import { logger } from "../utils/logger";
import {
  compactChatHistory,
  getChatModelId,
  getChatSummary,
  getOrCreateChat,
  resetChat,
  setChatSummary,
} from "./session";
import { groq } from "./providers/groq";
import { googleSearchTool } from "./tools/web-search";
import type { InputFile } from "grammy";
import { env } from "bun";

export const DEFAULT_MODEL_ID = env.GROQ_DEFAULT_MODEL_ID!;

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
};

export type SendMessageResult = {
  text: string;
  images: InputFile[];
};

export type CompactChatResult = {
  summary: string;
  keepTurns: number;
  originalMessages: number;
  compactedMessages: number;
};

export const systemPrompt = [
  "You are a helpful chat bot in a group chat setting. You should comply to user requests wherever possible.",
  "You must only respond in a small subset of valid markdown: for example **bold**, *italic*, `code`, ~~strike~~, ```<language>\\ncode\\n```. Tables, math formatting, etc. are not supported.",
  "Be concise while still conveying substantially all information relevant to any question.",
  "Don't worry about formalities, but respond in a pleasant manner.",
].join("\n");

export const DEFAULT_COMPACT_KEEP_TURNS = 5;

const compactSystemPrompt = [
  "You are summarizing a Telegram chat memory for future context retention.",
  "If an existing memory summary is provided, merge it with the newer conversation into a single replacement summary.",
  "Prefer newer information when details conflict, and remove items that are clearly resolved or outdated.",
  "Return concise markdown with these exact sections:",
  "1) Per-User Facts",
  "2) Per-User Preferences",
  "3) Per-User Open Tasks",
  "4) Shared Context",
  "5) Short Narrative",
  "For per-user sections, group bullets by participant using stable labels like 'User <userId>' when available, otherwise '@username' or display name.",
  "Capture durable details and unresolved items. Avoid transient chatter.",
].join("\n");

const compactUserPrompt = [
  "Summarize the conversation so far into compact long-term memory.",
  "Merge any existing memory summary provided earlier into one updated summary.",
  "Prioritize decisions, constraints, preferences, and pending work per participant.",
  "Keep it brief but complete.",
].join("\n");

function resolveChatModel(chatId: string) {
  const selection = getChatModelId(chatId);
  return groq(selection ?? DEFAULT_MODEL_ID);
}

function buildSystemPrompt(chatId: string): string {
  const summary = getChatSummary(chatId)?.trim();
  if (!summary) {
    return systemPrompt;
  }

  return [
    systemPrompt,
    "Conversation memory summary (high priority context):",
    summary,
  ].join("\n\n");
}

export function buildCompactMessages({
  history,
  existingSummary,
}: {
  history: ModelMessage[];
  existingSummary?: string;
}): ModelMessage[] {
  const compactMessages: ModelMessage[] = [];
  const summary = existingSummary?.trim();

  if (summary) {
    compactMessages.push({
      role: "user",
      content: [
        "Existing conversation memory summary to preserve and update:",
        summary,
        "Merge the newer conversation that follows into this memory. Preserve durable details unless newer context supersedes them.",
      ].join("\n\n"),
    });
  }

  compactMessages.push(...history);
  compactMessages.push({
    role: "user",
    content: compactUserPrompt,
  });

  return compactMessages;
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

export async function sendMessage({
  chatId,
  messageContext,
  message,
  images,
}: SendMessageParams): Promise<SendMessageResult> {
  const log = logger.child({ chatId });

  const history = getOrCreateChat(chatId);
  const chatModel = resolveChatModel(chatId);

  const historyLength = history.length;

  // Add to history
  history.push({
    role: "user",
    content: buildMessageContent(message, messageContext, images),
  });

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: buildSystemPrompt(chatId),
      messages: history,
      tools: {
        googleSearch: googleSearchTool,
      },
      stopWhen: stepCountIs(5),
    });

    history.push(...result.response.messages);

    return {
      text: result.text,
      images: generatedImages,
    };
  } catch (error) {
    log.error("ai.chat.error", { error });

    // Remove last user messages from history to avoid repeated failures
    history.splice(historyLength);

    throw error;
  }
}

export async function newChat({
  chatId,
  messageContext,
}: {
  chatId: string;
  messageContext: MessageContext;
}): Promise<SendMessageResult> {
  const log = logger.child({ chatId });

  const history = resetChat(chatId);
  const chatModel = resolveChatModel(chatId);

  history.push({
    role: "user",
    content: buildMessageContent(
      "Hey, let's start a new conversation.",
      messageContext,
    ),
  });

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: buildSystemPrompt(chatId),
      messages: history,
      tools: {
        googleSearch: googleSearchTool,
      },
      stopWhen: stepCountIs(5),
    });

    history.push(...result.response.messages);

    return {
      text: result.text,
      images: generatedImages,
    };
  } catch (error) {
    log.error("ai.new_chat.error", { error });
    throw error;
  }
}

export async function compactChat({
  chatId,
  keepTurns = DEFAULT_COMPACT_KEEP_TURNS,
}: {
  chatId: string;
  keepTurns?: number;
}): Promise<CompactChatResult> {
  const log = logger.child({ chatId, keepTurns });
  const history = getOrCreateChat(chatId);
  const existingSummary = getChatSummary(chatId)?.trim();
  const originalMessages = history.length;

  if (originalMessages === 0) {
    if (existingSummary) {
      return {
        summary: existingSummary,
        keepTurns,
        originalMessages,
        compactedMessages: 0,
      };
    }

    throw new Error("No conversation history to compact");
  }

  const chatModel = resolveChatModel(chatId);

  try {
    const summaryResult = await generateText({
      model: chatModel,
      system: compactSystemPrompt,
      messages: buildCompactMessages({ history, existingSummary }),
      stopWhen: stepCountIs(1),
    });

    const summary = summaryResult.text.trim();
    if (!summary) {
      throw new Error("Model returned empty summary");
    }

    setChatSummary(chatId, summary);
    const compactedMessages = compactChatHistory(chatId, keepTurns).length;

    return {
      summary,
      keepTurns,
      originalMessages,
      compactedMessages,
    };
  } catch (error) {
    log.error("ai.compact_chat.error", { error });
    throw error;
  }
}
