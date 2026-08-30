# gemini-tg

A Telegram bot for chat conversations with an LLM. It supports normal text prompts, photo-backed prompts, per-chat history, model switching, and a built-in web search tool for accessing current events.

## Commands

- `/start` or `/ping` - check that the bot is running
- `/g <message>` - send a message to the LLM
- `/newchat` - clear the current chat history and start a new conversation
- `/switchmodel <groq-model-id>` - set the active model for the current chat
- `/whichmodel` - show the active model for the current chat

## Environment variables

- `TELEGRAM_API_KEY` - Telegram bot token
- `GROQ_API_KEY` - API key for the main chat model
- `GEMINI_API_KEY` - API key for the web search tool
- `GROQ_DEFAULT_MODEL_ID` - default Groq chat model, for example `qwen/qwen3-32b`
- `WEB_SEARCH_MODEL_ID` - Gemini model used for search, for example `gemini-2.5-flash-lite`
