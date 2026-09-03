import type { Context } from "grammy";
import { handleChatCommand } from "../commands/chat";
import { createGuestReplier } from "../telegram/guest-reply";
import { stripBotMention } from "../telegram/mentions";
import { logger } from "../../utils/logger";

/**
 * Handle a `guest_message` update: an @mention of the bot in a chat it is not
 * a member of. Telegram gives us one reply, claimed up front by the guest
 * replier so the short-lived query id can't expire while the model works.
 */
export async function handleGuestMessage(ctx: Context) {
  const log = logger.child({
    chatId: ctx.chat?.id.toString(),
    handler: "handler.guest",
  });

  log.info("handler.guest.start", { username: ctx.from?.username });

  let replier: Awaited<ReturnType<typeof createGuestReplier>>;
  try {
    replier = await createGuestReplier(ctx);
  } catch (e) {
    // Nothing to reply into - the query id was rejected or already expired.
    log.error("handler.guest.answer_failed", e);
    return;
  }

  await handleChatCommand(ctx, replier, stripBotMention(ctx));
}
