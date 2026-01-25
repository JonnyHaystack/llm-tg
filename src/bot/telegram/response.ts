import type { Context } from "grammy";
import { createFormatter } from "../../utils/text-formatter";
import type { sendMessage } from "../../ai/chat";

const formatText = createFormatter();

/**
 * Send a response from the chat service to Telegram.
 * Handles images + text, images-only, or text-only responses.
 * Images are sent as reply; text follows separately.
 */
export async function sendResponse(
  ctx: Context,
  response: Awaited<ReturnType<typeof sendMessage>>,
) {
  if (!ctx.message) return;

  const hasImages = response.images.length > 0;
  const hasText = response.text.trim().length > 0;

  if (hasImages && hasText) {
    // Send images as reply, then text separately
    await ctx.replyWithChatAction("upload_photo");

    if (response.images.length === 1) {
      // Single image
      await ctx.replyWithPhoto(response.images[0], {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } else {
      // Multiple images - send as media group
      await ctx.replyWithMediaGroup(
        response.images.map((img) => ({
          type: "photo" as const,
          media: img,
        })),
        {
          reply_parameters: { message_id: ctx.message.message_id },
        },
      );
    }

    // Send text as separate message (not as reply)
    const formattedText = await formatText(response.text);
    await ctx.reply(formattedText, {
      parse_mode: "MarkdownV2",
    });
  } else if (hasImages) {
    // Only images, no text
    await ctx.replyWithChatAction("upload_photo");

    if (response.images.length === 1) {
      // Single image without caption
      await ctx.replyWithPhoto(response.images[0], {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } else {
      // Multiple images - send as media group
      await ctx.replyWithMediaGroup(
        response.images.map((img) => ({
          type: "photo" as const,
          media: img,
        })),
        {
          reply_parameters: { message_id: ctx.message.message_id },
        },
      );
    }
  } else if (hasText) {
    // Only text, no images
    const text = await formatText(response.text);
    await ctx.reply(text, {
      parse_mode: "MarkdownV2",
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }
}
