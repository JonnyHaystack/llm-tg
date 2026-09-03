import type { Context } from "grammy";
import { sendMessage } from "../../ai/chat";
import { formatCompactionNotice, maybeAutoCompact } from "../../ai/compaction";
import { logger } from "../../utils/logger";
import { createChatReplier, type Replier } from "../telegram/replier";
import { extractImagesFromCtx } from "../telegram/files";

/**
 * Handle /g command, reply-to-bot chat messages, @mentions and guest queries.
 * Supports images from the current message or replied-to message.
 *
 * `replier` decides where the answer goes: by default back into the current
 * chat, or - for guest queries - into the single inline message the bot is
 * allowed to post.
 */
export async function handleChatCommand(
  ctx: Context,
  replier: Replier = createChatReplier(ctx),
  overrideText?: string,
) {
  if (!ctx.chat || !ctx.from || !ctx.msg) {
    return;
  }

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.chat",
    messageId: ctx.msg.message_id,
  });

  log.info("command.chat.start");
  try {
    await replier.typing();

    // Check if this message is a reply to another message
    const repliedMessage = ctx.msg.reply_to_message;

    // Collect images from the current message or replied message
    const images = await extractImagesFromCtx(ctx);

    const response = await sendMessage({
      chatId,
      messageContext: {
        firstname: ctx.from.first_name || ctx.from.username,
        userId: ctx.from.id.toString(),
        timestamp: new Date().toUTCString(),
        replyingTo: repliedMessage?.text,
      },
      message:
        overrideText ||
        ctx.match?.toString() ||
        ctx.msg.text ||
        ctx.msg.caption ||
        "",
      images: images.length > 0 ? images : undefined,
    });

    await replier.send(response);

    log.info("command.chat.success");
  } catch (e) {
    await replier.notice("Couldn't generate a response");
    log.error("command.chat.error", e);
    return;
  }

  try {
    const compaction = await maybeAutoCompact({ chatId });
    if (compaction) {
      await replier.notice(formatCompactionNotice(compaction));
    }
  } catch (e) {
    log.error("command.chat.autocompact.error", e);
  }
}
