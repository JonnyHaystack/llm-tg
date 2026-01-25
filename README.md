# gemini-tg

A Telegram bot powered by Google's Gemini AI with multimodal support (text + images) and function calling capabilities for web search and image generation.

## Features

- **Multimodal Chat**: Send images along with text messages for vision-based queries
- **Web Search**: Automatic web search when the model needs current information
- **Image Generation**: Create images from text descriptions
- **Conversation History**: Maintains context across messages per chat

## Usage

### Text Commands

- `/g <message>` - Send a message to the AI
- `/newchat` - Start a fresh conversation (clears history)
- `/gen <prompt>` - Generate an image from a text prompt

### Multimodal (Image + Text)

You can include images in three ways:

1. **Send image with /g command**: Attach an image and use `/g your question` as the caption
2. **Reply to bot with image**: Send an image as a reply to any bot message
3. **Reply to image message**: Reply to any message containing an image with `/g your question`

The bot will analyze the image(s) along with your text and provide relevant responses.

## Architecture

The bot uses Gemini's function calling feature to provide enhanced capabilities:

### Function Calling Flow

1. **User sends message** → Telegram bot receives it
2. **Chat model processes message** → May request function calls (web search or image generation)
3. **Bot executes functions** → Performs the actual operations
4. **Results sent back to model** → Model uses results to formulate final response
5. **Response sent to user** → Text and/or images returned via Telegram

### Key Components

- **`gemini.ts`**: Creates the main chat model with function tool declarations
- **`chat.ts`**: Handles the function calling loop - when the model requests a function, executes it and feeds results back
- **`web-search.ts`**: Executes web searches using Gemini's Google Search grounding tool
- **`text-to-img.ts`**: Generates images using Gemini's image generation model
- **`index.ts`**: Telegram bot handlers that coordinate everything and send responses

### How It Works

The chat model declares two function tools:
- `googleSearch`: For finding current information via web search
- `generateImage`: For creating images from text prompts

When the model wants to use these tools, it returns a function call request. The bot:
1. Executes the requested function (search or image generation)
2. Sends the results back to the model using `createPartFromFunctionResponse`
3. The model uses those results to generate its final response
4. The bot sends the text and any images to the user

This architecture keeps the conversation context intact while allowing the model to access external tools when needed.

### Multimodal Support

The bot supports Gemini's vision capabilities by:
1. Detecting images in messages (photos attached to current message or replied message)
2. Downloading images from Telegram's API
3. Converting images to base64 format
4. Sending images as inline data along with text to Gemini
5. The model can then analyze images and respond based on visual content

Images are sent as `Part` objects with `inlineData` containing the base64-encoded image data and MIME type.

## Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
