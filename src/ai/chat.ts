import { generateText, stepCountIs, type UserContent } from "ai";
import { logger } from "../utils/logger";
import { getChatModelId, getOrCreateChat, resetChat } from "./session";
import { groq } from "./providers/groq";
import { googleSearchTool } from "./tools/web-search";
import type { InputFile } from "grammy";

export type MessageContext = {
  firstname: string | undefined;
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

export const systemPrompt = [
  "You are a helpful chat bot in a group chat setting. You should comply to user requests wherever possible.",
  "You must only respond in a small subset of valid markdown: for example **bold**, *italic*, `code`, ~~strike~~, ```<language>\\ncode\\n```",
  "Don't worry about formalities, but respond in a pleasant manner.",
  "Be concise while still conveying substantially all information relevant to any question.",
].join("\n");

export const DEFAULT_MODEL_ID = "moonshotai/kimi-k2-instruct-0905";

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

export async function sendMessage({
  chatId,
  messageContext,
  message,
  images,
}: SendMessageParams): Promise<SendMessageResult> {
  const log = logger.child({ chatId });

  const history = getOrCreateChat(chatId);
  const chatModel = resolveChatModel(chatId);

  // Add to history
  history.push({
    role: "user",
    content: buildMessageContent(message, messageContext, images),
  });

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: systemPrompt,
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
      system: systemPrompt,
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
