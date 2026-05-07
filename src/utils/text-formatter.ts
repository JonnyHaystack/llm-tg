export function renderTelegramHTML(input: string): string {
  // 1) Normalize newlines
  let text = input.replace(/\r\n?/g, "\n");

  // 2) Escape everything first
  text = escapeHTML(text);

  // 3) Protect code blocks and inline code from later markdown transforms
  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];
  text = protectCodeBlocks(text, codeBlocks);
  text = protectInlineCode(text, inlineCodes);

  // 4) Links
  text = text.replace(
    /\[([^\]\n]+)\]\(([^()\n]*(?:\([^)\n]*\)[^()\n]*)*)\)/g,
    '<a href="$2">$1</a>',
  );

  // 5) Headings (Telegram has no heading tag, map to bold line)
  text = text.replace(/^(#{1,6})[ \t]+(.+)$/gm, (_, __, content) => {
    return `<b>${content.trim()}</b>`;
  });

  // 6) Blockquotes
  text = renderBlockquotes(text);

  // 7) Bold / Italic / Strikethrough
  text = text.replace(/~~(?=\S)(.+?\S)~~/g, `<s>$1</s>`);
  text = text.replace(/\*\*(?=\S)(.+?\S)\*\*(?!\*)/g, `<b>$1</b>`);
  text = text.replace(/(^|[^*])\*(?=\S)(.+?\S)\*(?!\*)/g, "$1<i>$2</i>");
  text = text.replace(/(^|[^\w])_(?=\S)(.+?\S)_(?!\w)/g, "$1<i>$2</i>");

  // 8) Lists
  text = renderLists(text);

  // 9) Restore protected code spans
  text = restoreInlineCode(text, inlineCodes);
  text = restoreCodeBlocks(text, codeBlocks);

  return text.trim();
}

const INLINE_CODE_TOKEN_PREFIX = "%%TGIC";
const CODE_BLOCK_TOKEN_PREFIX = "%%TGCB";

function protectCodeBlocks(input: string, store: string[]): string {
  return input.replace(/```(?:([^\n`]*)\n)?([\s\S]*?)```/g, (_, __: string | undefined, code: string) => {
    const normalized = code.replace(/^\n/, "");
    const token = `${CODE_BLOCK_TOKEN_PREFIX}${store.length}%%`;
    store.push(`<pre><code>${normalized}</code></pre>`);
    return token;
  });
}

function protectInlineCode(input: string, store: string[]): string {
  let text = input.replace(/``([\s\S]*?)``/g, (_, code: string) => {
    const token = `${INLINE_CODE_TOKEN_PREFIX}${store.length}%%`;
    store.push(`<code>${code}</code>`);
    return token;
  });

  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    const token = `${INLINE_CODE_TOKEN_PREFIX}${store.length}%%`;
    store.push(`<code>${code}</code>`);
    return token;
  });

  return text;
}

function restoreInlineCode(input: string, store: string[]): string {
  return input.replace(/%%TGIC(\d+)%%/g, (_, index: string) => {
    return store[Number(index)] ?? "";
  });
}

function restoreCodeBlocks(input: string, store: string[]): string {
  return input.replace(/%%TGCB(\d+)%%/g, (_, index: string) => {
    return store[Number(index)] ?? "";
  });
}

function renderBlockquotes(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let quoteBuffer: string[] = [];

  const flushQuote = () => {
    if (quoteBuffer.length === 0) {
      return;
    }

    out.push(`<blockquote>${quoteBuffer.join("\n")}</blockquote>`);
    quoteBuffer = [];
  };

  for (const line of lines) {
    const match = /^&gt;[ \t]?(.*)$/.exec(line);
    if (match) {
      quoteBuffer.push(match[1]);
      continue;
    }

    flushQuote();
    out.push(line);
  }

  flushQuote();
  return out.join("\n");
}

function renderLists(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);

    if (!m) {
      out.push(line);
      continue;
    }

    const [, indent, bullet, content] = m;
    const level = Math.floor(indent.length / 2);

    const isOrdered = bullet.endsWith(".");
    const prefix = isOrdered ? `${bullet} ` : level === 0 ? "• " : "◦ ";

    out.push(`${"  ".repeat(level)}${prefix}${content}`);
  }

  return out.join("\n");
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function createFormatter() {
  return async function format(raw: string) {
    return renderTelegramHTML(raw);
  };
}
