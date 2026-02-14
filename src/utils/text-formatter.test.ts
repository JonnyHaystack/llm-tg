import { describe, test, expect } from "bun:test";
import { createFormatter } from "./text-formatter";

const format = createFormatter();

describe("text-formatter", () => {
  test("format matrix", async () => {
    const cases = [
      {
        name: "plain text reserved chars",
        input: "Hi! (test) #1",
        expected: "Hi! (test) #1",
      },
      {
        name: "bold markdown",
        input: "**bold**",
        expected: "<b>bold</b>",
      },
      {
        name: "italic markdown (asterisk)",
        input: "*italic*",
        expected: "<i>italic</i>",
      },
      {
        name: "italic markdown (underscore)",
        input: "_italic_",
        expected: "<i>italic</i>",
      },
      {
        name: "inline code preserved",
        input: "Use `code()` now",
        expected: "Use <code>code()</code> now",
      },
      {
        name: "code block preserved",
        input: "```\nconst x = 1;\n```",
        expected: "<pre><code>const x = 1;\n</code></pre>",
      },
      {
        name: "code block language tag stripped",
        input: "```cpp\nfor (int i = 0; i < 10; ++i) {\n  // do something with i\n}\n```",
        expected:
          "<pre><code>for (int i = 0; i &lt; 10; ++i) {\n  // do something with i\n}\n</code></pre>",
      },
      {
        name: "code block csharp language tag stripped",
        input: "```c#\nif (x < 10) {\n  Console.WriteLine(x);\n}\n```",
        expected:
          "<pre><code>if (x &lt; 10) {\n  Console.WriteLine(x);\n}\n</code></pre>",
      },
      {
        name: "code block info string stripped",
        input: "```typescript title=main.ts\nconst n = values[i];\n```",
        expected: "<pre><code>const n = values[i];\n</code></pre>",
      },
      {
        name: "unclosed bold escaped",
        input: "**bold",
        expected: "**bold",
      },
      {
        name: "unclosed italic escaped",
        input: "*italic",
        expected: "*italic",
      },
      {
        name: "underscore in word escaped",
        input: "file_name",
        expected: "file_name",
      },
      {
        name: "link syntax preserved",
        input: "See [text](url)",
        expected: 'See <a href="url">text</a>',
      },
      {
        name: "link text and url escaping",
        input: "See [a+b](https://ex.com/a(b))",
        expected: 'See <a href="https://ex.com/a(b)">a+b</a>',
      },
      {
        name: "mixed formatting",
        input: "**Bold** and *italic* with `code`",
        expected: "<b>Bold</b> and <i>italic</i> with <code>code</code>",
      },
      {
        name: "strikethrough markdown",
        input: "~~deprecated~~",
        expected: "<s>deprecated</s>",
      },
      {
        name: "blockquote markdown",
        input: "> quoted",
        expected: "<blockquote>quoted</blockquote>",
      },
      {
        name: "nested formatting",
        input: "**This is *nested* formatting**",
        expected: "<b>This is <i>nested</i> formatting</b>",
      },
      {
        name: "overlapping markers",
        input: "**bold *italic***",
        expected: "<b>bold <i>italic</i></b>",
      },
      {
        name: "backslashes preserved",
        input: "Path: C:\\Users\\Name",
        expected: "Path: C:\\Users\\Name",
      },
    ];

    for (const testCase of cases) {
      const result = await format(testCase.input);
      expect(result, testCase.name).toBe(testCase.expected);
    }
  });
  test("escapes reserved characters in plain text", async () => {
    const input = "Hello-World! This costs $5.99";
    const result = await format(input);
    expect(result).toBe("Hello-World! This costs $5.99");
  });

  test("preserves bold formatting", async () => {
    const input = "This is **bold** text";
    const result = await format(input);
    expect(result).toBe("This is <b>bold</b> text");
  });

  test("preserves italic formatting", async () => {
    const input = "This is *italic* text";
    const result = await format(input);
    expect(result).toBe("This is <i>italic</i> text");
  });

  test("preserves inline code formatting", async () => {
    const input = "Use `console.log()` to debug";
    const result = await format(input);
    expect(result).toBe("Use <code>console.log()</code> to debug");
  });

  test("preserves code block formatting", async () => {
    const input = "Example:\n```\nfunction test() {\n  return true;\n}\n```";
    const result = await format(input);
    expect(result).toBe(
      "Example:\n<pre><code>function test() {\n  return true;\n}\n</code></pre>",
    );
  });

  test("escapes reserved characters outside of markdown syntax", async () => {
    const input = "Price: $10-$20 (sale!)";
    const result = await format(input);
    expect(result).toBe("Price: $10-$20 (sale!)");
  });

  test("handles mixed formatting", async () => {
    const input = "**Bold** and *italic* with `code` here";
    const result = await format(input);
    expect(result).toBe(
      "<b>Bold</b> and <i>italic</i> with <code>code</code> here",
    );
  });

  test("renders bullet list markers", async () => {
    const input =
      "Ingredients:\n* 2 cups blueberries\n* 1 cup sugar\n* 1 tsp salt";
    const result = await format(input);
    expect(result).toBe(
      "Ingredients:\n• 2 cups blueberries\n• 1 cup sugar\n• 1 tsp salt",
    );
  });

  test("escapes reserved characters inside bold text", async () => {
    const input = "**Error: Failed!**";
    const result = await format(input);
    expect(result).toBe("<b>Error: Failed!</b>");
  });

  test("escapes reserved characters inside italic text", async () => {
    const input = "*Note: Read this!*";
    const result = await format(input);
    expect(result).toBe("<i>Note: Read this!</i>");
  });

  test("handles backslashes", async () => {
    const input = "Path: C:\\Users\\Name";
    const result = await format(input);
    expect(result).toBe("Path: C:\\Users\\Name");
  });

  test("handles underscores in text", async () => {
    const input = "variable_name and another_variable";
    const result = await format(input);
    expect(result).toBe("variable_name and another_variable");
  });

  test("handles asterisks in text", async () => {
    const input = "2 * 3 = 6";
    const result = await format(input);
    expect(result).toBe("2 * 3 = 6");
  });

  test("handles square brackets", async () => {
    const input = "Array[0] = value";
    const result = await format(input);
    expect(result).toBe("Array[0] = value");
  });

  test("handles parentheses", async () => {
    const input = "Call function(arg1, arg2)";
    const result = await format(input);
    expect(result).toBe("Call function(arg1, arg2)");
  });

  test("handles multiple reserved characters", async () => {
    const input = "Test: #1 + #2 = #3 | Result!";
    const result = await format(input);
    expect(result).toBe("Test: #1 + #2 = #3 | Result!");
  });

  test("handles dots and hyphens", async () => {
    const input = "Version 1.0.0-beta";
    const result = await format(input);
    expect(result).toBe("Version 1.0.0-beta");
  });

  test("handles curly braces", async () => {
    const input = "Object: {key: value}";
    const result = await format(input);
    expect(result).toBe("Object: {key: value}");
  });

  test("handles greater than and backticks", async () => {
    const input = "Quote: > some text";
    const result = await format(input);
    expect(result).toBe("Quote: &gt; some text");
  });

  test("handles tilde", async () => {
    const input = "Home: ~/directory";
    const result = await format(input);
    expect(result).toBe("Home: ~/directory");
  });

  test("handles empty string", async () => {
    const input = "";
    const result = await format(input);
    expect(result).toBe("");
  });

  test("handles text with only markdown", async () => {
    const input = "**Bold** *Italic* `Code`";
    const result = await format(input);
    expect(result).toBe("<b>Bold</b> <i>Italic</i> <code>Code</code>");
  });

  test("handles nested formatting (should process outermost)", async () => {
    const input = "**This is *nested* formatting**";
    const result = await format(input);
    // Both bold and italic are processed (nested formatting is supported)
    expect(result).toBe("<b>This is <i>nested</i> formatting</b>");
  });

  test("handles code with reserved characters", async () => {
    const input = "Use `array[0]` to access";
    const result = await format(input);
    expect(result).toBe("Use <code>array[0]</code> to access");
  });

  test("handles code block with reserved characters", async () => {
    const input = "```\nif (x > 0) {\n  console.log('yes!');\n}\n```";
    const result = await format(input);
    expect(result).toBe(
      "<pre><code>if (x &gt; 0) {\n  console.log('yes!');\n}\n</code></pre>",
    );
  });

  test("handles code block language tags", async () => {
    const input = "```ts\nconst v = arr[i] < 10;\n```";
    const result = await format(input);
    expect(result).toBe("<pre><code>const v = arr[i] &lt; 10;\n</code></pre>");
  });

  test("handles csharp code block language tags", async () => {
    const input = "```c#\nconst v = arr[i] < 10;\n```";
    const result = await format(input);
    expect(result).toBe("<pre><code>const v = arr[i] &lt; 10;\n</code></pre>");
  });

  test("handles code fence info strings", async () => {
    const input = "```ts title=snippet.ts\nconst v = arr[i] < 10;\n```";
    const result = await format(input);
    expect(result).toBe("<pre><code>const v = arr[i] &lt; 10;\n</code></pre>");
  });

  test("handles real-world AI response", async () => {
    const input =
      "Here's the solution:\n\n**Steps:**\n1. Install package\n2. Run `npm install`\n3. Done!\n\nNote: This costs $10-20.";
    const result = await format(input);
    expect(result).toContain("<b>Steps:</b>");
    expect(result).toContain("$10-20.");
    expect(result).toContain("<code>npm install</code>");
  });

  test("renders markdown heading as bold line", async () => {
    const input = "### 1) Per-User Facts";
    const result = await format(input);
    expect(result).toBe("<b>1) Per-User Facts</b>");
  });

  test("renders multiple heading levels as bold lines", async () => {
    const input = "# Title\n## Subtitle\n#### Details";
    const result = await format(input);
    expect(result).toBe("<b>Title</b>\n<b>Subtitle</b>\n<b>Details</b>");
  });

  test("renders blockquote lines into blockquote tag", async () => {
    const input = "> first line\n> second line";
    const result = await format(input);
    expect(result).toBe("<blockquote>first line\nsecond line</blockquote>");
  });

  test("renders strikethrough markdown", async () => {
    const input = "This is ~~old~~ now";
    const result = await format(input);
    expect(result).toBe("This is <s>old</s> now");
  });

  test("escapes unclosed bold marker", async () => {
    const input = "**bold";
    const result = await format(input);
    expect(result).toBe("**bold");
  });

  test("escapes unclosed italic marker", async () => {
    const input = "*italic";
    const result = await format(input);
    expect(result).toBe("*italic");
  });

  test("handles overlapping bold and italic markers", async () => {
    const input = "**bold *italic***";
    const result = await format(input);
    expect(result).toBe("<b>bold <i>italic</i></b>");
  });

  test("preserves underscore-based italics", async () => {
    const input = "_italic_";
    const result = await format(input);
    expect(result).toBe("<i>italic</i>");
  });

  test("preserves inline code with backticks via double backticks", async () => {
    const input = "Use ``code `tick`` here";
    const result = await format(input);
    expect(result).toBe("Use <code>code `tick</code> here");
  });

  test("escapes html entities in plain text", async () => {
    const input = "Fish & Chips <3";
    const result = await format(input);
    expect(result).toBe("Fish &amp; Chips &lt;3");
  });

  test("escapes html inside code block", async () => {
    const input = "```\nif (x < 1 && y > 2) {\n  return '<tag>';\n}\n```";
    const result = await format(input);
    expect(result).toBe(
      "<pre><code>if (x &lt; 1 &amp;&amp; y &gt; 2) {\n  return '&lt;tag&gt;';\n}\n</code></pre>",
    );
  });

  test("escapes html inside inline code", async () => {
    const input = "Use `a < b && c > d`";
    const result = await format(input);
    expect(result).toBe("Use <code>a &lt; b &amp;&amp; c &gt; d</code>");
  });
});
