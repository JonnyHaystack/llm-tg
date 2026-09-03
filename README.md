# gemini-tg

A Telegram bot for chat conversations with an LLM. It supports normal text prompts, photo-backed prompts, per-chat history, model switching, and a built-in web search tool for accessing current events. It answers to `/g`, to `@mentions`, to replies, and - in Guest Mode - to mentions from chats it isn't even a member of.

## Commands

- `/start` or `/ping` - check that the bot is running
- `/chatinfo` - show this chat's ID, so it can be added to the allowlist
- `/g <message>` - send a message to the LLM
- `/newchat` - clear the current chat history and start a new conversation
- `/compact` - summarize the conversation so far and drop the raw history
- `/switchmodel <groq-model-id>` - set the active model for the current chat
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

To enable it: BotFather -> your bot -> *Bot Settings* (the MiniApp) -> **Guest Mode**. Confirm with `getMe`, which should then return `supports_guest_queries: true`. Restrict who can summon it under *Access* in the same panel - see [Authorization](#authorization).

Because the answer has to go out before the (short-lived) guest query id expires, the bot posts a `Thinking…` placeholder immediately and edits the real answer into it once the model is done.

Guest Mode has limits that come from Telegram, not from this bot:

- one reply per mention, and no follow-up updates unless the bot is mentioned again
- no access to the chat's message history or member list
- no image output: guest replies are inline query results, which can only carry images by public URL, and the bot generates raw bytes

## Authorization

Two gates, at two different layers:

- **`ALLOWED_CHAT_IDS`** (this repo) gates chats the bot is a member of. `/start`, `/ping`, and `/chatinfo` stay available everywhere; every other command, mention, or reply is silently ignored in chats that are not allowlisted. To authorize a chat: add the bot to it, run `/chatinfo`, copy the chat ID into `ALLOWED_CHAT_IDS`, and restart. The list is read at startup, so changes need a restart.
- **BotFather** gates *who* may talk to the bot at all, which is what covers Guest Mode: *Bot Settings* -> *Access* -> **Restrict bot usage**, then pick the allowed users. Guest mentions arrive from chats you never added the bot to, so a chat-ID allowlist can't gate them - Telegram filters by caller before the update ever reaches us. No restart needed to change it.

## Auto-compaction

Chat history is replayed to the model on every turn, so a long conversation gets steadily more expensive. When `AUTO_COMPACT_TOKEN_THRESHOLD` is set and a chat's context crosses it, the bot summarizes the conversation, drops the raw history, and carries the summary forward in the system prompt. It compacts right after replying, so the answer is never delayed, and posts a short notice in the chat when it happens.

`/compact` does the same thing on demand. `/newchat` still clears everything, summary included, and `/debug` shows the current context size and whether a summary is in play.

## Environment variables

- `TELEGRAM_API_KEY` - Telegram bot token
- `GROQ_API_KEY` - API key for the main chat model
- `GEMINI_API_KEY` - API key for the web search tool
- `GROQ_DEFAULT_MODEL_ID` - default Groq chat model, for example `qwen/qwen3-32b`
- `WEB_SEARCH_MODEL_ID` - Gemini model used for search, for example `gemini-2.5-flash-lite`
- `ALLOWED_CHAT_IDS` - comma separated chat IDs allowed to use the bot, for example `123456789,-1001234567890`
- `AUTO_COMPACT_TOKEN_THRESHOLD` - context size in tokens at which a chat is compacted automatically, for example `60000`. Leave unset to disable auto-compaction
