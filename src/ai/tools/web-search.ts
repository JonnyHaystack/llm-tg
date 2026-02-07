import { tool, zodSchema, generateText } from "ai";
import { z } from "zod";
import { google } from "../providers/gemini";
import { logger } from "../../utils/logger";

const systemPrompt = [
  "You are a web search assistant. Find relevant information based on the user's query.",
  "When provided a URL, fetch it and complete the requested task or provide a summary if no task is provided.",
  "Provide concise and accurate responses conveying only the necessary information.",
].join("\n");

const searchModel = google("gemini-2.5-flash-lite");

export const googleSearchTool = tool({
  description:
    "A web search tool for use when you want to find information about current events or information about a URL or Image. The input to this tool should be a concise search query.",
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe("The search query."),
    }),
  ),
  execute: async ({ query }: { query: string }) => {
    logger.info("tool.web_search.requested", { query });

    try {
      const result = await generateText({
        model: searchModel,
        prompt: query,
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        system: systemPrompt,
      });
      logger.info("tool.web_search.completed");
      return result.text;
    } catch (error) {
      logger.error("tool.web_search.error", error);
      throw error;
    }
  },
});
