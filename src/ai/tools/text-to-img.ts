import {
  tool,
  zodSchema,
  experimental_generateImage as generateImageSdk,
} from "ai";
import { z } from "zod";
import { InputFile } from "grammy";
import { logger } from "../../utils/logger";
import { google } from "@ai-sdk/google";

export async function generateImage(
  prompt: string,
): Promise<InputFile | undefined> {
  logger.info("tool.image_gen.manual_requested", { prompt });
  try {
    const { image } = await generateImageSdk({
      model: google.image("imagen-3.0-generate-002"),
      prompt,
    });
    const buffer = Buffer.from(image.base64, "base64");
    return new InputFile(buffer, "image.png");
  } catch (error) {
    logger.error("tool.image_gen.manual_error", { error });
    return undefined;
  }
}

// We need a factory to inject a collector
export const createGenerateImageTool = (imageCollector: InputFile[]) =>
  tool({
    description:
      "A sub agent that can be prompted to generate an image based on a text description. Prompt it with 'Generate an image of ...' followed by a detailed description of the desired image.",
    inputSchema: zodSchema(
      z.object({
        prompt: z
          .string()
          .describe("A detailed description of the image to generate."),
      }),
    ),
    execute: async ({ prompt }: { prompt: string }) => {
      logger.info("tool.image_gen.requested", { prompt });

      try {
        const { image } = await generateImageSdk({
          model: google.image("imagen-3.0-generate-002"),
          prompt,
        });

        const buffer = Buffer.from(image.base64, "base64");
        const inputFile = new InputFile(buffer, "image.png");

        imageCollector.push(inputFile);

        return "Image generated and sent to user.";
      } catch (error) {
        logger.error("tool.image_gen.error", { error });
        return "Failed to generate image.";
      }
    },
  });
