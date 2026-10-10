import type { CommandContext, Context, Filter } from "grammy";
import { getModelId } from "../ai/chat";
import { getChat, resetChat, updateChat } from "../ai/chat-store";
import { type CompactionResult, compactChat } from "../ai/compaction";
import { config } from "../config";
import { logger } from "../logger";
import { formatCompactionNotice } from "./conversation";
import { chatReplier } from "./replier";

type CommandCtx = CommandContext<Filter<Context, "message">>;

function reply(ctx: CommandCtx, markdown: string) {
  return chatReplier(ctx).send(markdown);
}

export function handleStart(ctx: CommandCtx) {
  return reply(ctx, "Up and running! 🫡");
}

export function handleChatInfo(ctx: CommandCtx) {
  const { chat, from } = ctx;
  const name = "title" in chat ? chat.title : chat.username;

  return reply(
    ctx,
    [
      "## Chat Info",
      `- Chat ID: \`${chat.id}\``,
      `- Type: \`${chat.type}\``,
      `- Name: ${name ?? "none"}`,
      `- Your user ID: \`${from.id}\``,
    ].join("\n"),
  );
}

export function handleNewChat(ctx: CommandCtx) {
  resetChat(ctx.chat.id);
  return reply(ctx, "Chat history cleared.");
}

export async function handleCompact(ctx: CommandCtx) {
  let result: CompactionResult | undefined;
  try {
    result = await chatReplier(ctx).whileTyping(() => compactChat(ctx.chat.id));
  } catch (error) {
    logger.error("compaction.failed", error, { chatId: ctx.chat.id });
    return reply(ctx, "Couldn't compact the conversation.");
  }

  return reply(
    ctx,
    result ? formatCompactionNotice(result) : "Nothing to compact.",
  );
}

export function handleDebug(ctx: CommandCtx) {
  const chatId = ctx.chat.id;
  const { history, summary, tokenUsage, lastContextTokens } = getChat(chatId);
  const { totalInputTokens, totalOutputTokens } = tokenUsage;
  const threshold = config.AUTO_COMPACT_TOKEN_THRESHOLD;
  const count = (role: string) =>
    history.filter((message) => message.role === role).length;

  const context =
    lastContextTokens === undefined
      ? "not measured yet"
      : `\`${lastContextTokens}\` tokens`;
  const autoCompaction = threshold
    ? `auto at \`${threshold}\` tokens`
    : "auto-compaction off";

  return reply(
    ctx,
    [
      "## Debug Stats",
      `- Chat: \`${chatId}\``,
      `- Model: \`${getModelId(chatId)}\``,
      `- History: \`${history.length}\` msgs (user \`${count("user")}\`, assistant \`${count("assistant")}\`, tool \`${count("tool")}\`)`,
      `- Context: ${context} (${autoCompaction})`,
      `- Summary: ${summary ? `\`${summary.length}\` chars` : "none"}`,
      `- Usage: \`${totalInputTokens + totalOutputTokens}\` tokens (in \`${totalInputTokens}\`, out \`${totalOutputTokens}\`)`,
    ].join("\n"),
  );
}

export function handleSwitchModel(ctx: CommandCtx) {
  const modelId = ctx.match.trim();
  if (!modelId) {
    return reply(
      ctx,
      "Usage: /switchmodel <groq-model-id>\nExample: /switchmodel moonshotai/kimi-k2-instruct-0905",
    );
  }

  updateChat(ctx.chat.id, (chat) => {
    chat.modelId = modelId;
  });
  logger.info("model.switched", { chatId: ctx.chat.id, modelId });
  return reply(ctx, `Model set to \`${modelId}\``);
}

export function handleWhichModel(ctx: CommandCtx) {
  return reply(ctx, `\`${getModelId(ctx.chat.id)}\``);
}
