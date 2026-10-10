import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import { config } from "../config";
import { logger } from "../logger";

const google = createGoogleGenerativeAI({ apiKey: config.GEMINI_API_KEY });

const SYSTEM_PROMPT = [
  "You are a web search assistant. Find relevant information based on the user's query.",
  "When provided a URL, fetch it and complete the requested task or provide a summary if no task is provided.",
  "Provide concise and accurate responses conveying only the necessary information.",
].join("\n");

const searchModel = google(config.WEB_SEARCH_MODEL_ID);

export const webSearchTool = tool({
  description:
    "A web search tool for use when you want to find information about current events or what a web page says. The input to this tool should be a concise search query, or a URL with what to look for on it.",
  inputSchema: z.object({
    query: z.string().describe("The search query or URL."),
  }),
  execute: async ({ query }) => {
    logger.info("web_search", { query });

    try {
      const { text } = await generateText({
        model: searchModel,
        system: SYSTEM_PROMPT,
        prompt: query,
        tools: {
          google_search: google.tools.googleSearch({}),
          url_context: google.tools.urlContext({}),
        },
      });
      return text;
    } catch (error) {
      // The SDK hands a thrown error to the model as the tool result, so it
      // would otherwise never reach the logs.
      logger.error("web_search.failed", error, { query });
      throw error;
    }
  },
});
