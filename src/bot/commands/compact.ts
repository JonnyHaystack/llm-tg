import type { CommandContext, Context } from "grammy";
import { compactChat } from "../../ai/chat";
import { logger } from "../../utils/logger";

const TELEGRAM_TEXT_LIMIT = 4096;
const HEADER_BUFFER = 512;

function buildCompactReply(summary: string) {
  const header = ["Conversation compacted.", "", "Summary:"].join("\n");

  const maxSummaryLength = TELEGRAM_TEXT_LIMIT - header.length - HEADER_BUFFER;
  const trimmedSummary =
    summary.length > maxSummaryLength
      ? `${summary.slice(0, Math.max(0, maxSummaryLength)).trimEnd()}\n\n[summary truncated]`
      : summary;

  return `${header}\n${trimmedSummary}`;
}

/**
 * Handle /compact command to summarize and compact conversation history.
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

    const result = await compactChat({
      chatId,
    });

    await ctx.reply(buildCompactReply(result.summary), {
      reply_parameters: { message_id: ctx.message.message_id },
    });

    log.info("command.compact.success", {
      keptTurns: result.keepTurns,
      originalMessages: result.originalMessages,
      compactedMessages: result.compactedMessages,
    });
  } catch (error) {
    log.error("command.compact.error", { error });

    const message =
      error instanceof Error &&
      error.message === "No conversation history to compact"
        ? "No conversation history available to compact yet."
        : "Couldn't compact the conversation right now.";

    await ctx.reply(message, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }
}
