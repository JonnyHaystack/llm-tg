import type { CommandContext, Context } from "grammy";
import { generateImage } from "../../ai/tools/text-to-img";
import { logger } from "../../utils/logger";

/**
 * Handle /gen command for text-to-image generation.
 */
export async function handleImageGenCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const log = logger.child({
    chatId: ctx.chat.id.toString(),
    handler: "command.imagegen",
    messageId: ctx.message.message_id,
  });

  log.info("command.gen.start");

  const prompt =
    ctx.match?.toString() || ctx.message.text?.replace("/gen", "").trim() || "";
  if (!prompt) {
    await ctx.reply("Please provide a prompt for image generation.");
    return;
  }

  try {
    await ctx.replyWithChatAction("upload_photo");

    const inputFile = await generateImage(prompt);
    if (!inputFile) {
      await ctx.reply("Couldn't generate an image");
      return;
    }

    await ctx.replyWithPhoto(inputFile, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    log.info("command.gen.success");
  } catch (e) {
    await ctx.reply("Couldn't generate an image");
    log.error("command.gen.error", e, { prompt });
  }
}
