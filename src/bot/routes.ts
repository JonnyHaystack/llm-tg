import type { Bot } from "grammy";
import { handleStartCommand } from "./commands/start";
import { handleChatInfoCommand } from "./commands/chatinfo";
import { handleNewChatCommand } from "./commands/new-chat";
import { handleCompactCommand } from "./commands/compact";
import { handleChatCommand } from "./commands/chat";
import { handleDebugStatsCommand } from "./commands/debug-stats";
import { handleSwitchModelCommand } from "./commands/switch-model";
import { handleWhichModelCommand } from "./commands/which-model";
import { requireAuthorizedChat } from "./auth";

import { handleMessage, handlePhoto } from "./handlers/message";
import { handleGuestMessage } from "./handlers/guest";

/**
 * Register all bot commands and message handlers.
 */
export function registerRoutes(bot: Bot) {
  // Unauthed Commands
  bot.command(["start", "ping"], handleStartCommand);
  bot.command("chatinfo", handleChatInfoCommand);

  // Guest mode: @mentions from chats the bot is not a member of. Registered
  // above requireAuthorizedChat, which gates on ctx.chat.id - never in
  // ALLOWED_CHAT_IDS for a guest chat. Who may summon the bot as a guest is
  // set in BotFather (Bot Settings -> Access -> Restrict bot usage).
  bot.on("guest_message", handleGuestMessage);

  // Authed Commands
  bot.use(requireAuthorizedChat);

  // Chat management
  bot.command("newchat", handleNewChatCommand);
  bot.command("compact", handleCompactCommand);
  bot.command("debug", handleDebugStatsCommand);
  bot.command("switchmodel", handleSwitchModelCommand);
  bot.command("whichmodel", handleWhichModelCommand);

  // Chat commands
  // Wrapped: grammY passes `next` as the second argument, which would be
  // mistaken for the replier.
  bot.command("g", (ctx) => handleChatCommand(ctx));

  // Handle @mentions of and replies to the bot (text)
  bot.on("message:text", handleMessage);

  // Handle photo messages with a /g caption, an @mention, or as reply to bot
  bot.on("message:photo", handlePhoto);
}
