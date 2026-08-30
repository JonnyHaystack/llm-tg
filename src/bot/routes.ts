import type { Bot } from "grammy";
import { handleStartCommand } from "./commands/start";
import { handleNewChatCommand } from "./commands/new-chat";
import { handleChatCommand } from "./commands/chat";
import { handleDebugStatsCommand } from "./commands/debug-stats";
import { handleSwitchModelCommand } from "./commands/switch-model";
import { handleWhichModelCommand } from "./commands/which-model";

import { handleMessage, handlePhoto } from "./handlers/message";

/**
 * Register all bot commands and message handlers.
 */
export function registerRoutes(bot: Bot) {
  // Status commands
  bot.command(["start", "ping"], handleStartCommand);

  // Chat management
  bot.command("newchat", handleNewChatCommand);
  bot.command("debug", handleDebugStatsCommand);
  bot.command("switchmodel", handleSwitchModelCommand);
  bot.command("whichmodel", handleWhichModelCommand);

  // Chat commands
  bot.command("g", handleChatCommand);

  // Handle replies to the bot (text)
  bot.on("message:text", handleMessage);

  // Handle photo messages with /g command or as reply to bot
  bot.on("message:photo", handlePhoto);
}
