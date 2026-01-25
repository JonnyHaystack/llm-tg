import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { registerRoutes } from "./routes";

/**
 * Create and configure the Telegram bot.
 */
function createBot(): Bot {
  const token = process.env.TELEGRAM_API_KEY;
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
  registerRoutes(bot);

  await bot.start();
  logger.info("app.started");
}
