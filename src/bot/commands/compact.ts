import type { CommandContext, Context } from "grammy";
import { logger } from "../../utils/logger";
import { compactChat, formatCompactionNotice } from "../../ai/compaction";

/**
 * Handle /compact command to summarize the conversation so far and drop the
 * raw history, on demand rather than at the auto-compaction threshold.
 */
export async function handleCompactCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.compact",
    messageId: ctx.message.message_id,
  });

  log.info("command.compact.start");
  try {
    await ctx.replyWithChatAction("typing");

    const result = await compactChat({ chatId });

    await ctx.reply(
      result ? formatCompactionNotice(result) : "Nothing to compact.",
      { reply_parameters: { message_id: ctx.message.message_id } },
    );

    log.info("command.compact.success", { compacted: Boolean(result) });
  } catch (e) {
    log.error("command.compact.error", e);
    await ctx.reply("Couldn't compact the conversation");
  }
}
