import type { CommandContext, Context } from "grammy";
import { logger } from "../../utils/logger";
import { createFormatter } from "../../utils/text-formatter";
import { isChatAuthorized } from "../auth";

/**
 * Handle /chatinfo to report the identifiers needed to allowlist this chat.
 * Stays available to unauthorized chats so a group ID can be discovered after
 * adding the bot.
 */
export async function handleChatInfoCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const formatText = createFormatter();

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.chatinfo",
    messageId: ctx.message.message_id,
  });

  const authorized = isChatAuthorized(chatId);
  const name =
    "title" in ctx.chat
      ? ctx.chat.title
      : ctx.chat.username || ctx.from.username;

  const lines = [
    "## Chat Info",
    `- Chat ID: \`${chatId}\``,
    `- Type: \`${ctx.chat.type}\``,
  ];

  if (name) {
    lines.push(`- Name: ${name}`);
  }

  lines.push(
    `- Your user ID: \`${ctx.from.id}\``,
    `- Authorized: ${authorized ? "yes" : "no"}`,
  );

  const reply = await formatText(lines.join("\n"));

  log.info("command.chatinfo.success", { authorized });

  await ctx.reply(reply, {
    parse_mode: "HTML",
    reply_parameters: { message_id: ctx.message.message_id },
  });
}
