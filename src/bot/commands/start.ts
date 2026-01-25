import type { CommandContext, Context } from "grammy";
import { logger } from "../../utils/logger";

/**
 * Handle /start and /ping commands to check bot status.
 */
export async function handleStartCommand(ctx: CommandContext<Context>) {
  logger.info("command.start", {
    chatId: ctx.chat?.id.toString(),
    userId: ctx.from?.id.toString(),
    messageId: ctx.message?.message_id,
  });

  const react = ctx.react("👻");
  const reply = ctx.reply("Up and running! 🫡");
  await Promise.allSettled([react, reply]);
}
