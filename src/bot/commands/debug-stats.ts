import type { CommandContext, Context } from "grammy";
import { getChatDebugStats, type ChatDebugStats } from "../../ai/chat";
import { logger } from "../../utils/logger";
import { createFormatter } from "../../utils/text-formatter";

function buildDebugStatsReply(stats: ChatDebugStats) {
  const modelLabel =
    stats.selectedModelId && stats.selectedModelId !== stats.effectiveModelId
      ? `${stats.effectiveModelId} (selected: ${stats.selectedModelId})`
      : stats.effectiveModelId;

  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  return [
    "## Debug Stats",
    `- Chat: \`${stats.chatId}\``,
    `- Model: \`${modelLabel}\``,
    `- History: \`${stats.historyMessages}\` msgs (user \`${stats.userMessages}\`, assistant \`${stats.assistantMessages}\`, other \`${stats.otherMessages}\`)`,
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
  });

  await ctx.reply(reply, {
    parse_mode: "HTML",
    reply_parameters: { message_id: ctx.message.message_id },
  });
}
