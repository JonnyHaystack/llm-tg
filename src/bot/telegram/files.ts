import type { Context } from "grammy";
import { env } from "bun";
import type { ImageData } from "../../ai/chat";
import { logger } from "../../utils/logger";

/**
 * Download a Telegram file by ID and encode it as base64 with MIME type.
 * Returns null if download fails.
 */
export async function downloadAndEncodeImage(
  ctx: Context,
  fileId: string,
): Promise<ImageData | null> {
  try {
    const file = await ctx.api.getFile(fileId);

    if (!file.file_path) {
      logger.error("telegram.image_download.missing_path", { fileId });
      return null;
    }

    const url = `https://api.telegram.org/file/bot${env.TELEGRAM_API_KEY}/${file.file_path}`;

    const response = await fetch(url);
    if (!response.ok) {
      logger.error("telegram.image_download.fetch_failed", {
        fileId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Determine mime type based on file extension
    const extension = file.file_path.split(".").pop()?.toLowerCase();
    let mimeType = "image/jpeg";
    if (extension === "png") mimeType = "image/png";
    else if (extension === "gif") mimeType = "image/gif";
    else if (extension === "webp") mimeType = "image/webp";

    return { mimeType, data: base64 };
  } catch (e) {
    logger.error("telegram.image_download.error", e);
    return null;
  }
}

/**
 * Extract images from the current message and (optionally) the replied-to message.
 * Returns an array of ImageData (base64-encoded).
 */
export async function extractImagesFromCtx(ctx: Context): Promise<ImageData[]> {
  const images: ImageData[] = [];

  // Check if current message has photos
  if (ctx.message?.photo && ctx.message.photo.length > 0) {
    const largestPhoto = ctx.message.photo[ctx.message.photo.length - 1];
    const imageData = await downloadAndEncodeImage(ctx, largestPhoto.file_id);
    if (imageData) images.push(imageData);
  }

  // Check if replying to a message with photos
  const repliedMessage = ctx.message?.reply_to_message;
  if (repliedMessage?.photo && repliedMessage.photo.length > 0) {
    const largestPhoto = repliedMessage.photo[repliedMessage.photo.length - 1];
    const imageData = await downloadAndEncodeImage(ctx, largestPhoto.file_id);
    if (imageData) images.push(imageData);
  }

  return images;
}
