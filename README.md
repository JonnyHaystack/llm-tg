# gemini-tg

A Telegram bot for chat conversations with an LLM. It supports normal text prompts, photo-backed prompts, per-chat history, model switching, and a built-in web search tool for accessing current events.

## Commands

- `/start` or `/ping` - check that the bot is running
- `/chatinfo` - show this chat's ID, so it can be added to the allowlist
- `/g <message>` - send a message to the LLM
- `/newchat` - clear the current chat history and start a new conversation
- `/compact` - summarize the conversation so far and drop the raw history
- `/switchmodel <groq-model-id>` - set the active model for the current chat
- `/whichmodel` - show the active model for the current chat
- `/debug` - show history and token usage stats for the current chat

## Authorization

Only chats listed in `ALLOWED_CHAT_IDS` can use the bot. `/start`, `/ping`, and `/chatinfo` stay available everywhere; every other command and any reply to the bot is silently ignored in chats that are not allowlisted.

To authorize a chat: add the bot to it, run `/chatinfo`, copy the chat ID into `ALLOWED_CHAT_IDS`, and restart the bot. The allowlist is read at startup, so changes need a restart to take effect.

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
