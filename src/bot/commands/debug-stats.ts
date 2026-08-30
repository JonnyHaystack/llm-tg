import type { CommandContext, Context } from "grammy";
import { getChatDebugStats, type ChatDebugStats } from "../../ai/chat";
import { AUTO_COMPACT_TOKEN_THRESHOLD } from "../../ai/compaction";
import { logger } from "../../utils/logger";
import { createFormatter } from "../../utils/text-formatter";

function buildDebugStatsReply(stats: ChatDebugStats) {
  const modelLabel =
    stats.selectedModelId && stats.selectedModelId !== stats.effectiveModelId
      ? `${stats.effectiveModelId} (selected: ${stats.selectedModelId})`
      : stats.effectiveModelId;

  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  const contextLabel =
    stats.contextTokens === undefined
      ? "not measured yet"
      : `\`${stats.contextTokens}\` tokens`;
  const compactLabel = AUTO_COMPACT_TOKEN_THRESHOLD
    ? `auto at \`${AUTO_COMPACT_TOKEN_THRESHOLD}\` tokens`
    : "auto-compaction off";
  const summaryLabel = stats.summaryChars
    ? `\`${stats.summaryChars}\` chars`
    : "none";

  return [
    "## Debug Stats",
    `- Chat: \`${stats.chatId}\``,
    `- Model: \`${modelLabel}\``,
    `- History: \`${stats.historyMessages}\` msgs (user \`${stats.userMessages}\`, assistant \`${stats.assistantMessages}\`, other \`${stats.otherMessages}\`)`,
    `- Context: ${contextLabel} (${compactLabel})`,
    `- Summary: ${summaryLabel}`,
    `- Usage: \`${totalTokens}\` tokens (in \`${stats.totalInputTokens}\`, out \`${stats.totalOutputTokens}\`)`,
  ].join("\n");
}

export async function handleDebugStatsCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const formatText = createFormatter();

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.debugstats",
    messageId: ctx.message.message_id,
  });

  const stats = getChatDebugStats(chatId);
  const reply = await formatText(buildDebugStatsReply(stats));

  log.info("command.debugstats.success", {
    totalInputTokens: stats.totalInputTokens,
    totalOutputTokens: stats.totalOutputTokens,
    contextTokens: stats.contextTokens,
  });

  await ctx.reply(reply, {
    parse_mode: "HTML",
    reply_parameters: { message_id: ctx.message.message_id },
  });
}
