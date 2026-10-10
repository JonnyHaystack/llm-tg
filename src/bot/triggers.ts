import type { Context } from "grammy";
import type { MessageEntity } from "grammy/types";

function messageText(ctx: Context): string {
  return ctx.msg?.text ?? ctx.msg?.caption ?? "";
}

function messageEntities(ctx: Context): MessageEntity[] {
  return ctx.msg?.entities ?? ctx.msg?.caption_entities ?? [];
}

function isBotMention(ctx: Context, entity: MessageEntity): boolean {
  if (entity.type === "text_mention") {
    return entity.user.id === ctx.me.id;
  }
  if (entity.type !== "mention") {
    return false;
  }

  const mention = messageText(ctx).slice(
    entity.offset,
    entity.offset + entity.length,
  );
  return mention.toLowerCase() === `@${ctx.me.username.toLowerCase()}`;
}

export function isMentioningBot(ctx: Context): boolean {
  return messageEntities(ctx).some((entity) => isBotMention(ctx, entity));
}

/**
 * The message text with every mention of the bot removed. Entity offsets count
 * UTF-16 code units, so this splices by offset rather than matching strings.
 */
export function stripBotMention(ctx: Context): string {
  const mentions = messageEntities(ctx)
    .filter((entity) => isBotMention(ctx, entity))
    .sort((a, b) => b.offset - a.offset);

  let text = messageText(ctx);
  for (const { offset, length } of mentions) {
    text = text.slice(0, offset) + text.slice(offset + length);
  }
  return text.trim();
}

/** The text after a leading `/g` or `/g@thisbot`, in a message or a caption. */
function gCommandArgument(ctx: Context): string | undefined {
  const command = messageEntities(ctx).find(
    (entity) => entity.type === "bot_command" && entity.offset === 0,
  );
  if (!command) {
    return undefined;
  }

  const text = messageText(ctx);
  const [name, username] = text.slice(0, command.length).split("@");
  const isForThisBot =
    username === undefined ||
    username.toLowerCase() === ctx.me.username.toLowerCase();

  return name === "/g" && isForThisBot
    ? text.slice(command.length).trim()
    : undefined;
}

function isReplyToBot(ctx: Context): boolean {
  return ctx.msg?.reply_to_message?.from?.id === ctx.me.id;
}

/**
 * The prompt in a message addressed to the bot by a `/g` command, an @mention
 * or a reply to one of its messages. `undefined` if it isn't addressed to us.
 */
export function extractPrompt(ctx: Context): string | undefined {
  const commandArgument = gCommandArgument(ctx);
  if (commandArgument !== undefined) {
    return commandArgument;
  }
  if (isMentioningBot(ctx)) {
    return stripBotMention(ctx);
  }
  if (isReplyToBot(ctx)) {
    return messageText(ctx);
  }
  return undefined;
}
