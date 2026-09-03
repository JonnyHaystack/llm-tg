import type { Context } from "grammy";
import { logger } from "../../utils/logger";
import { createFormatter } from "../../utils/text-formatter";
import type { Replier } from "./replier";

const formatText = createFormatter();

/** Telegram's hard limit for a single message. */
const MAX_MESSAGE_LENGTH = 4096;

const PLACEHOLDER = "Thinking…";

const NO_IMAGE_SUPPORT = "(I can't send images when I'm mentioned as a guest.)";

function truncate(text: string): string {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
}

/**
 * Replier for `guest_message` updates - chats the bot is not a member of.
 *
 * A guest query buys exactly one message, posted via `answerGuestQuery` with an
 * inline query result. Guest query ids expire quickly (inline and callback
 * queries die after roughly 10-15s) and a model turn routinely runs longer, so
 * we claim the slot immediately with a placeholder and edit it in place once
 * the answer is ready.
 */
export async function createGuestReplier(ctx: Context): Promise<Replier> {
  const log = logger.child({
    chatId: ctx.chat?.id.toString(),
    handler: "guest.reply",
  });

  const sent = await ctx.answerGuestQuery({
    type: "article",
    id: String(ctx.msg?.message_id ?? Date.now()),
    title: PLACEHOLDER,
    input_message_content: { message_text: PLACEHOLDER },
  });

  const inlineMessageId = sent.inline_message_id;
  let answered = false;

  async function edit(text: string, parseMode?: "HTML") {
    await ctx.api.editMessageTextInline(inlineMessageId, truncate(text), {
      parse_mode: parseMode,
      link_preview_options: { is_disabled: true },
    });
  }

  return {
    async typing() {
      // Chat actions require chat membership; there is nothing to send here.
    },

    async send(response) {
      const parts: string[] = [];

      if (response.text.trim().length > 0) {
        parts.push(await formatText(response.text));
      }
      // `answerGuestQuery` takes an InlineQueryResult, and the photo variant
      // needs a public URL - we only have raw bytes, so generated images can't
      // be delivered on this path.
      if (response.images.length > 0) {
        parts.push(NO_IMAGE_SUPPORT);
        log.info("guest.reply.images_dropped", {
          images: response.images.length,
        });
      }

      if (parts.length === 0) {
        return;
      }

      await edit(parts.join("\n\n"), "HTML");
      answered = true;
    },

    async notice(text) {
      // We only ever get one message. Before the answer lands the placeholder
      // is still free (the error path); after it, a notice would overwrite the
      // answer, so drop it.
      if (answered) {
        log.info("guest.reply.notice_dropped", { text });
        return;
      }

      await edit(text);
      answered = true;
    },
  };
}
