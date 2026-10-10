# gemini-tg

A Telegram bot for chat conversations with an LLM. It supports normal text prompts, photo-backed prompts, per-chat history, model switching, and a built-in web search tool for accessing current events. It answers to `/g`, to `@mentions`, to replies, and - in Guest Mode - to mentions from chats it isn't even a member of.

## Commands

- `/start` or `/ping` - check that the bot is running
- `/chatinfo` - show this chat's ID, type and name, and your user ID
- `/g <message>` - send a message to the LLM
- `/newchat` - clear the current chat history and start a new conversation
- `/compact` - summarize the conversation so far and drop the raw history
- `/switchmodel <groq-model-id>` - set the active model for the current chat; `/switchmodel default` goes back to `GROQ_DEFAULT_MODEL_ID`
- `/whichmodel` - show the active model for the current chat
- `/debug` - show history and token usage stats for the current chat

## Triggers

In a chat the bot has been added to, it answers when you:

- run `/g <message>`, or send a photo captioned `/g <message>`
- `@mention` it, for example `@yourbot what is this?`
- reply to one of its own messages

Plain `@mentions` only reach the bot with **privacy mode disabled** (BotFather -> `/setprivacy` -> *Disable*). Telegram applies that setting when the bot joins a group, so remove and re-add the bot to any group it is already in.

## Guest Mode

With Guest Mode enabled, the bot can be `@mentioned` in chats it is *not* a member of. Telegram delivers a dedicated `guest_message` update and the bot gets exactly one reply, posted in place.

To enable it: BotFather -> your bot -> *Bot Settings* (the MiniApp) -> **Guest Mode**. Confirm with `getMe`, which should then return `supports_guest_queries: true`. Restrict who can summon it under *Access* in the same panel - see [Access control](#access-control).

Because the answer has to go out before the (short-lived) guest query id expires, the bot posts a `Thinking…` placeholder immediately and edits the real answer into it once the model is done.

Guest Mode has limits that come from Telegram, not from this bot:

- one reply per mention, and no follow-up updates unless the bot is mentioned again
- no access to the chat's message history or member list
- answers longer than one message are cut short, since there is only one message to edit

## Access control

Who may use the bot is set in BotFather: *Bot Settings* -> *Access* -> **Restrict bot usage**, then pick the allowed users. Telegram filters by caller before an update ever reaches the bot, so this covers group chats and Guest Mode alike, and changes take effect without a restart.

## Auto-compaction

Chat history is replayed to the model on every turn, so a long conversation gets steadily more expensive. When `AUTO_COMPACT_TOKEN_THRESHOLD` is set and a chat's context crosses it, the bot summarizes the conversation, drops the raw history, and carries the summary forward in the system prompt. It compacts right after replying, so the answer is never delayed, and posts a short notice in the chat when it happens.

`/compact` does the same thing on demand. `/newchat` still clears everything, summary included, and `/debug` shows the current context size and whether a summary is in play.

## Environment variables

- `TELEGRAM_API_KEY` - Telegram bot token
- `GROQ_API_KEY` - API key for the main chat model
- `GEMINI_API_KEY` - API key for the web search tool
- `GROQ_DEFAULT_MODEL_ID` - default Groq chat model, for example `qwen/qwen3-32b`
- `WEB_SEARCH_MODEL_ID` - Gemini model used for search, for example `gemini-2.5-flash-lite`
- `AUTO_COMPACT_TOKEN_THRESHOLD` - context size in tokens at which a chat is compacted automatically, for example `60000`. Leave unset to disable auto-compaction
- `CHAT_DATA_DIR` - directory chat history is saved to. Defaults to `./data/chats`

Blank values count as unset, and the bot refuses to start if a required variable is missing.

## Development

```sh
bun install
cp .env.sample .env   # then fill in the keys
bun run dev           # restarts on file changes
```

- `bun run start` - run the bot
- `bun test` - run the tests
- `bun run typecheck` - type-check with `tsc`
- `bun run lint` - lint and check formatting with Biome; `bun run format` fixes what it can
