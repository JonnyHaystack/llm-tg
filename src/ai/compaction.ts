import { generateText, type ModelMessage } from "ai";
import { env } from "bun";
import { logger } from "../utils/logger";
import { recordTurnUsage, resolveChatModel } from "./chat";
import {
  clearChatHistory,
  getChatSummary,
  getLastContextTokens,
  getOrCreateChat,
  isCompacting,
  setChatSummary,
  setCompacting,
  setLastContextTokens,
} from "./session";

function parseThreshold(raw: string | undefined): number {
  const parsed = Number(raw?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Context size, in tokens, at which a chat is compacted automatically.
 *
 * Unset, zero, negative or unparseable disables auto-compaction entirely.
 * `/compact` still works.
 */
export const AUTO_COMPACT_TOKEN_THRESHOLD = parseThreshold(
  env.AUTO_COMPACT_TOKEN_THRESHOLD,
);

/**
 * Ceiling on the transcript handed to the summariser, as a safety valve for a
 * threshold set above the context limit of the model itself. The tail is kept,
 * since anything older is most likely already covered by the previous summary.
 */
const MAX_TRANSCRIPT_CHARS = 80_000;

/** Ceiling on a single rendered tool call or result, which can be very large. */
const MAX_TOOL_CHARS = 2_000;

export type CompactionResult = {
  tokensBefore?: number;
  tokensAfter?: number;
  summaryChars: number;
};

export function isAutoCompactEnabled(): boolean {
  return AUTO_COMPACT_TOKEN_THRESHOLD > 0;
}

const summarySystemPrompt = [
  "You compress chat conversations so a chat bot can keep talking without the full history.",
  "Write a dense, factual summary of the conversation below, as context for the bot that will continue it - not as prose for a human reader.",
  "Preserve, in this order and only where present:",
  "- who is taking part, and anything they stated about themselves or their preferences",
  "- what they are trying to do, and any question left open or unanswered",
  "- decisions, conclusions and commitments reached",
  "- concrete facts, figures, names, URLs and code that were established, including anything found by the web search tool",
  "- anything the bot promised to do or remember",
  "Drop pleasantries, repetition and abandoned tangents. Do not speculate, and do not invent anything that is not in the transcript.",
  "Output only the summary itself: plain prose and short bullets, no preamble, no sign-off, no markdown headings.",
].join("\n");

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars
    ? value
    : `${value.slice(0, maxChars)}... [truncated]`;
}

/** A message content part, read loosely so provider shapes cannot break this. */
type UnknownPart = { type?: string } & Record<string, unknown>;

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Unwrap a `ToolResultOutput`, which wraps the actual result as
 * `{ type: "text" | "json" | ..., value }`, so the transcript carries the
 * result rather than the envelope around it.
 */
function unwrapToolOutput(output: unknown): unknown {
  return output && typeof output === "object" && "value" in output
    ? (output as { value: unknown }).value
    : output;
}

function renderPart(part: UnknownPart): string | undefined {
  switch (part.type) {
    case "text":
      return typeof part.text === "string" ? part.text : undefined;
    case "image":
      return "[image]";
    case "file":
      return typeof part.mediaType === "string" &&
        !part.mediaType.startsWith("image/")
        ? `[file: ${part.mediaType}]`
        : "[image]";
    case "tool-call": {
      const input = truncate(
        stringify(part.input ?? part.args),
        MAX_TOOL_CHARS,
      );
      return `[tool call: ${String(part.toolName)}(${input})]`;
    }
    case "tool-result": {
      const output = truncate(
        stringify(unwrapToolOutput(part.output ?? part.result)),
        MAX_TOOL_CHARS,
      );
      return `[tool result: ${String(part.toolName)} -> ${output}]`;
    }
    default:
      // Reasoning parts and anything a provider adds later are dropped.
      return undefined;
  }
}

function renderContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return (content as UnknownPart[])
    .map(renderPart)
    .filter((rendered): rendered is string => Boolean(rendered))
    .join("\n");
}

/**
 * Flatten a history into a plain-text transcript.
 *
 * History holds base64 image parts and tool-call/tool-result pairs. Replaying
 * those into the summariser would be needlessly expensive, and text-only models
 * reject file parts outright, so everything becomes text here.
 */
export function renderHistoryTranscript(history: ModelMessage[]): string {
  const transcript = history
    .map((message) => {
      const body = renderContent(message.content).trim();
      return body ? `${message.role}: ${body}` : undefined;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript;
  }

  const tail = transcript.slice(transcript.length - MAX_TRANSCRIPT_CHARS);
  return `[earlier messages omitted]\n\n${tail}`;
}

function buildSummaryPrompt(transcript: string, previousSummary?: string) {
  if (!previousSummary) {
    return `<transcript>\n${transcript}\n</transcript>`;
  }

  // Feed the previous summary back in, or a second compaction would silently
  // drop everything from before the first one.
  return [
    "This conversation was compacted once before. Here is the summary produced then, covering everything that came before the transcript:",
    "",
    "<previous_summary>",
    previousSummary,
    "</previous_summary>",
    "",
    "And here is what has been said since. Produce a single summary covering both.",
    "",
    "<transcript>",
    transcript,
    "</transcript>",
  ].join("\n");
}

/**
 * Summarise a chat's history into its running summary and drop the raw
 * messages.
 *
 * Returns `null` when there was nothing to do or the summary call failed - a
 * failed compaction must never break the turn that triggered it.
 */
export async function compactChat({
  chatId,
}: {
  chatId: string;
}): Promise<CompactionResult | null> {
  const log = logger.child({ chatId });
  const history = getOrCreateChat(chatId);

  if (history.length === 0 || isCompacting(chatId)) {
    return null;
  }

  const transcript = renderHistoryTranscript(history);
  if (!transcript.trim()) {
    return null;
  }

  const messagesCompacted = history.length;
  const tokensBefore = getLastContextTokens(chatId);
  setCompacting(chatId, true);

  try {
    const result = await generateText({
      model: resolveChatModel(chatId),
      system: summarySystemPrompt,
      prompt: buildSummaryPrompt(transcript, getChatSummary(chatId)),
    });

    const summary = result.text.trim();
    if (!summary) {
      log.warn("ai.compaction.empty");
      return null;
    }

    setChatSummary(chatId, summary);
    clearChatHistory(chatId);
    recordTurnUsage({ chatId, result });

    // Let the next real turn measure the new context, so a compaction can never
    // re-trigger itself off a stale reading.
    setLastContextTokens(chatId, undefined);

    // The summary is virtually all of the new context, so what it cost to
    // generate is a good stand-in for how big that context now is.
    const tokensAfter = result.usage?.outputTokens;

    log.info("ai.compaction.success", {
      tokensBefore,
      tokensAfter,
      messagesCompacted,
      summaryChars: summary.length,
    });

    return { tokensBefore, tokensAfter, summaryChars: summary.length };
  } catch (error) {
    log.error("ai.compaction.error", { error });
    return null;
  } finally {
    setCompacting(chatId, false);
  }
}

/**
 * Compact the chat if auto-compaction is enabled and the last measured context
 * has crossed the threshold.
 */
export async function maybeAutoCompact({
  chatId,
}: {
  chatId: string;
}): Promise<CompactionResult | null> {
  if (!isAutoCompactEnabled()) {
    return null;
  }

  const contextTokens = getLastContextTokens(chatId);
  if (
    contextTokens === undefined ||
    contextTokens < AUTO_COMPACT_TOKEN_THRESHOLD
  ) {
    return null;
  }

  logger.child({ chatId }).info("ai.compaction.triggered", {
    contextTokens,
    threshold: AUTO_COMPACT_TOKEN_THRESHOLD,
  });

  return compactChat({ chatId });
}

/** The one-line notice posted to the chat after a compaction. */
export function formatCompactionNotice(result: CompactionResult): string {
  const before =
    result.tokensBefore === undefined ? "?" : `~${result.tokensBefore}`;
  const after =
    result.tokensAfter === undefined ? "?" : `~${result.tokensAfter}`;

  return `Compacted conversation history (${before} → ${after} tokens). Earlier messages are now a summary.`;
}
