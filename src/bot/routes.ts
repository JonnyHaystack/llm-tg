import type { Bot, Context } from "grammy";
import { handleStartCommand } from "./commands/start";
import { handleNewChatCommand } from "./commands/new-chat";
import { handleChatCommand } from "./commands/chat";
import { handleImageGenCommand } from "./commands/imagegen";

import { handleMessage, handlePhoto } from "./handlers/message";

/**
 * Register all bot commands and message handlers.
 */
export function registerRoutes(bot: Bot) {
  // Status commands
  bot.command(["start", "ping"], handleStartCommand);

  // Chat management
  bot.command("newchat", handleNewChatCommand);

  // Chat commands
  bot.command("g", handleChatCommand);

  // Image generation
  bot.command("gen", handleImageGenCommand);

  // Handle replies to the bot (text)
  bot.on("message:text", handleMessage);

  // Handle photo messages with /g command or as reply to bot
  bot.on("message:photo", handlePhoto);
}
