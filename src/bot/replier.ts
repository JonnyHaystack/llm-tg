import { type Context, type Filter, GrammyError } from "grammy";
import { logger } from "../logger";
import {
  MAX_MESSAGE_LENGTH,
  markdownToTelegramHtml,
  splitMarkdown,
} from "./markdown";

/** Where a conversation's output goes: back into the chat, or a guest reply. */
export type Replier = {
  typing(): Promise<unknown>;
  /** Deliver the model's answer, written in markdown. */
  send(markdown: string): Promise<unknown>;
  /** Plain text outside the answer, such as errors and compaction notices. */
  notice(text: string): Promise<unknown>;
};

type Deliver = (text: string, parseMode?: "HTML") => Promise<unknown>;

/**
 * Deliver markdown as Telegram HTML, falling back to the raw markdown when
 * Telegram rejects the conversion, such as tags crossed by overlapping markers.
 */
async function deliverMarkdown(markdown: string, deliver: Deliver) {
  try {
    await deliver(markdownToTelegramHtml(markdown), "HTML");
  } catch (error) {
    if (
      !(error instanceof GrammyError) ||
      !error.description.includes("can't parse entities")
    ) {
      throw error;
    }
    logger.info("reply.html_rejected", { description: error.description });
    await deliver(markdown);
  }
}

export function chatReplier(ctx: Filter<Context, "message">): Replier {
  return {
    typing: () => ctx.replyWithChatAction("typing"),

    async send(markdown) {
      const [first, ...rest] = splitMarkdown(markdown);
      await deliverMarkdown(first, (text, parse_mode) =>
        ctx.reply(text, {
          parse_mode,
          reply_parameters: {
            message_id: ctx.msg.message_id,
            allow_sending_without_reply: true,
          },
        }),
      );
      for (const chunk of rest) {
        await deliverMarkdown(chunk, (text, parse_mode) =>
          ctx.reply(text, { parse_mode }),
        );
      }
    },

    notice: (text) => ctx.reply(text),
  };
}

const PLACEHOLDER = "Thinking…";

/**
 * A guest query buys exactly one message, and its id expires within seconds -
 * well before a model turn finishes. So the message is claimed up front with a
 * placeholder, and the answer is edited into it later.
 */
export async function guestReplier(
  ctx: Filter<Context, "guest_message">,
): Promise<Replier> {
  const { inline_message_id } = await ctx.answerGuestQuery({
    type: "article",
    id: String(ctx.msg.message_id),
    title: PLACEHOLDER,
    input_message_content: { message_text: PLACEHOLDER },
  });

  let answered = false;
  async function edit(text: string, parseMode?: "HTML") {
    await ctx.api.editMessageTextInline(inline_message_id, text, {
      parse_mode: parseMode,
      link_preview_options: { is_disabled: true },
    });
    answered = true;
  }

  return {
    // Chat actions need chat membership, which a guest doesn't have.
    typing: async () => {},

    send(markdown) {
      const [first, ...rest] = splitMarkdown(markdown, MAX_MESSAGE_LENGTH - 2);
      return deliverMarkdown(rest.length > 0 ? `${first}\n…` : first, edit);
    },

    // Once the answer is in, a notice would overwrite it.
    notice: async (text) => {
      if (!answered) {
        await edit(text);
      }
    },
  };
}
