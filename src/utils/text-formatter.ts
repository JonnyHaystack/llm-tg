export function renderTelegramHTML(input: string): string {
  // 1) Normalize newlines
  let text = input.replace(/\r\n?/g, "\n");

  // 2) Escape everything first
  text = escapeHTML(text);

  // 3) Code blocks (must come before inline formatting)
  text = text.replace(
    /```([\s\S]*?)```/g,
    (_, code) => `<pre><code>${code.trim()}</code></pre>`,
  );

  // 4) Inline code
  text = text.replace(/`([^`\n]+)`/g, `<code>$1</code>`);

  // 5) Bold / Italic
  text = text.replace(/\*\*(.+?)\*\*/g, `<b>$1</b>`);
  text = text.replace(/_(.+?)_/g, `<i>$1</i>`);

  // 6) Lists
  text = renderLists(text);

  // 7) Paragraphs
  text = text
    .split(/\n{2,}/)
    .map((block) => {
      if (
        block.startsWith("<pre>") ||
        block.startsWith("<ul>") ||
        block.startsWith("<ol>")
      ) {
        return block;
      }
      return block;
    })
    .join("\n\n");

  return text.trim();
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
