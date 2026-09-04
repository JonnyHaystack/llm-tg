import { Bot } from "grammy";
import { env } from "bun";
import { logger } from "../utils/logger";
import { initSession } from "../ai/session";
import { registerRoutes } from "./routes";
import { allowedChatIds } from "./auth";

/**
 * Create and configure the Telegram bot.
 */
function createBot(): Bot {
  const token = env.TELEGRAM_API_KEY;
  if (!token) {
    throw new Error("TELEGRAM_API_KEY environment variable is required");
  }

  const bot = new Bot(token);

  // Global error handler
  bot.catch((err) => {
    logger.error("bot.unhandled_error", err.error, {
      ctx: err.ctx.update,
    });
  });

  return bot;
}

/**
 * Start the bot with all routes registered.
 */
export async function startBot() {
  const bot = createBot();
  initSession();
  registerRoutes(bot);

  if (allowedChatIds.size === 0) {
    logger.warn("auth.allowlist_empty");
  }

  await bot.start({
    allowed_updates: ["message", "edited_message", "guest_message"],
  });
  logger.info("app.started", { allowedChats: allowedChatIds.size });
}
