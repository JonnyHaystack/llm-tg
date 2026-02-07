import type { CommandContext, Context } from "grammy";
import { setChatModelId } from "../../ai/session";
import { logger } from "../../utils/logger";

const USAGE_MESSAGE =
  "Usage: /switchmodel <groq-model-id>\n" +
  "Example: /switchmodel moonshotai/kimi-k2-instruct-0905";

/**
 * Handle /switchmodel command to change the model used for this chat.
 */
export async function handleSwitchModelCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const chatId = ctx.chat.id.toString();
  const modelInput = ctx.match?.toString().trim();

  const log = logger.child({
    chatId,
    handler: "command.switchmodel",
    messageId: ctx.message.message_id,
  });

  if (!modelInput) {
    await ctx.reply(USAGE_MESSAGE);
    return;
  }

  setChatModelId(chatId, modelInput);
  log.info("command.switchmodel.success", { modelId: modelInput });

  await ctx.reply(`Model set to: ${modelInput}`);
}
