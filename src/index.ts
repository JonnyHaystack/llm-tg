import { run } from "@grammyjs/runner";
import { Bot } from "grammy";
import {
  handleChatInfo,
  handleCompact,
  handleDebug,
  handleNewChat,
  handleStart,
  handleSwitchModel,
  handleWhichModel,
} from "./bot/commands";
import {
  handleGuestMessage,
  handleMessage,
  inChatOrder,
} from "./bot/conversation";
import { config } from "./config";
import { logger } from "./logger";

const bot = new Bot(config.TELEGRAM_API_KEY);

bot.on("guest_message", handleGuestMessage);

const messages = bot.on("message");
messages.use(inChatOrder);
messages.command(["start", "ping"], handleStart);
messages.command("chatinfo", handleChatInfo);
messages.command("newchat", handleNewChat);
messages.command("compact", handleCompact);
messages.command("debug", handleDebug);
messages.command("switchmodel", handleSwitchModel);
messages.command("whichmodel", handleWhichModel);
messages.on(["message:text", "message:photo"], handleMessage);

bot.catch(({ error, ctx }) => {
  logger.error("bot.unhandled_error", error, { update: ctx.update });
});

await bot.init();
const runner = run(bot, {
  runner: { fetch: { allowed_updates: ["message", "guest_message"] } },
});
logger.info("bot.started", { username: bot.botInfo.username });

const stop = () => runner.isRunning() && runner.stop();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
