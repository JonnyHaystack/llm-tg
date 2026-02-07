import type { CommandContext, Context } from "grammy";
import { getChatModelId } from "../../ai/session";
import { DEFAULT_MODEL_ID } from "../../ai/chat";
import { logger } from "../../utils/logger";

/**
 * Handle /whichmodel command to report the current model for this chat.
 */
export async function handleWhichModelCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.whichmodel",
    messageId: ctx.message.message_id,
  });

  const modelId = getChatModelId(chatId)?.trim() || DEFAULT_MODEL_ID;
  log.info("command.whichmodel.success", { modelId });

  await ctx.reply(modelId);
}
