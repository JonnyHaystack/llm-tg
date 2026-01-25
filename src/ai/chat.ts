import { generateText, stepCountIs, type ModelMessage } from "ai";
import { logger } from "../utils/logger";
import { getOrCreateChat, resetChat } from "./session";
import { google } from "./gemini";
import { googleSearchTool } from "./tools/web-search";
import { createGenerateImageTool } from "./tools/text-to-img";
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
  "You must only respond in a Telegram MarkdownV2 compatible response: for example **bold**, *italic*, `code`, ~~strike~~, ```<language>\\ncode\\n```",
  "Don't worry about formalities.",
  "Be concise while still conveying substantially all information relevant to any question.",
].join("\n");

const chatModel = google("gemini-2.5-flash");

export async function sendMessage({
  chatId,
  messageContext,
  message,
  images,
}: SendMessageParams): Promise<SendMessageResult> {
  const history: ModelMessage[] = getOrCreateChat(chatId);
  const log = logger.child({ chatId });

  // Build context string
  const contextString = `Context: ${JSON.stringify(messageContext)}`;

  // Construct user message content parts
  const content: (
    | { type: "text"; text: string }
    | { type: "file"; data: string; mediaType: string }
  )[] = [{ type: "text", text: `${contextString}\nMessage: ${message}` }];

  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: "file",
        data: img.data,
        mediaType: img.mimeType,
      });
    }
  }

  // Add to history
  history.push({ role: "user", content });

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: systemPrompt,
      messages: history,
      tools: {
        googleSearch: googleSearchTool,
        generateImage: createGenerateImageTool(generatedImages),
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
  const history: ModelMessage[] = resetChat(chatId);
  const log = logger.child({ chatId });
  const context = JSON.stringify(messageContext);

  const initialMessage = `Context: ${context}\nMessage: Hey, let's start a new conversation.`;

  history.push({ role: "user", content: initialMessage });

  const generatedImages: InputFile[] = [];

  try {
    const result = await generateText({
      model: chatModel,
      system: systemPrompt,
      messages: history,
      tools: {
        googleSearch: googleSearchTool,
        generateImage: createGenerateImageTool(generatedImages),
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
