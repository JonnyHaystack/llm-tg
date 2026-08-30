# gemini-tg

A Telegram bot for chat conversations with an LLM. It supports normal text prompts, photo-backed prompts, per-chat history, model switching, and a built-in web search tool for accessing current events.

## Commands

- `/start` or `/ping` - check that the bot is running
- `/chatinfo` - show this chat's ID, so it can be added to the allowlist
- `/g <message>` - send a message to the LLM
- `/newchat` - clear the current chat history and start a new conversation
- `/switchmodel <groq-model-id>` - set the active model for the current chat
- `/whichmodel` - show the active model for the current chat
- `/debug` - show history and token usage stats for the current chat

## Authorization

Only chats listed in `ALLOWED_CHAT_IDS` can use the bot. `/start`, `/ping`, and `/chatinfo` stay available everywhere; every other command and any reply to the bot is silently ignored in chats that are not allowlisted.

To authorize a chat: add the bot to it, run `/chatinfo`, copy the chat ID into `ALLOWED_CHAT_IDS`, and restart the bot. The allowlist is read at startup, so changes need a restart to take effect.

## Environment variables

- `TELEGRAM_API_KEY` - Telegram bot token
- `GROQ_API_KEY` - API key for the main chat model
- `GEMINI_API_KEY` - API key for the web search tool
- `GROQ_DEFAULT_MODEL_ID` - default Groq chat model, for example `qwen/qwen3-32b`
- `WEB_SEARCH_MODEL_ID` - Gemini model used for search, for example `gemini-2.5-flash-lite`
- `ALLOWED_CHAT_IDS` - comma separated chat IDs allowed to use the bot, for example `123456789,-1001234567890`
