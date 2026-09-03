import type { Context } from "grammy";
import type { MessageEntity } from "grammy/types";

/**
 * Entities of the current message, whether it carries `text` or a `caption`.
 */
function messageEntities(ctx: Context): MessageEntity[] {
  return ctx.msg?.entities ?? ctx.msg?.caption_entities ?? [];
}

function messageBody(ctx: Context): string {
  return ctx.msg?.text ?? ctx.msg?.caption ?? "";
}

/**
 * Does an entity point at this bot? Matches both a plain `@username` mention
 * and a `text_mention` linking to the bot's user object.
 */
function isBotMention(
  entity: MessageEntity,
  text: string,
  ctx: Context,
): boolean {
  if (entity.type === "text_mention") {
    return entity.user.id === ctx.me.id;
  }

  if (entity.type !== "mention") {
    return false;
  }

  const mentioned = text.substring(
    entity.offset,
    entity.offset + entity.length,
  );
  return mentioned.toLowerCase() === `@${ctx.me.username.toLowerCase()}`;
}

/**
 * Check whether the message mentions this bot by username.
 */
export function isMentioningBot(ctx: Context): boolean {
  const text = messageBody(ctx);
  return messageEntities(ctx).some((e) => isBotMention(e, text, ctx));
}

/**
 * Remove every mention of this bot from the message text, so the model gets
 * the question rather than "@mybot what is X".
 *
 * Entity offsets are UTF-16 code units, so we splice by offset instead of
 * string matching - a `.replace()` would cut in the wrong place once emoji or
 * other astral characters appear earlier in the message.
 */
export function stripBotMention(ctx: Context): string {
  const text = messageBody(ctx);
  const mentions = messageEntities(ctx)
    .filter((e) => isBotMention(e, text, ctx))
    .sort((a, b) => b.offset - a.offset);

  let stripped = text;
  for (const mention of mentions) {
    stripped =
      stripped.slice(0, mention.offset) +
      stripped.slice(mention.offset + mention.length);
  }

  return stripped.trim();
}
