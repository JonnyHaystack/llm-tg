import type { FilePart } from "ai";
import type { Context } from "grammy";
import type { PhotoSize } from "grammy/types";

async function downloadPhoto(
  ctx: Context,
  sizes: PhotoSize[],
): Promise<FilePart> {
  const largest = sizes[sizes.length - 1];
  const file = await ctx.api.getFile(largest.file_id);
  if (!file.file_path) {
    throw new Error(`Telegram returned no download path for ${file.file_id}`);
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`,
  );
  if (!response.ok) {
    throw new Error(`Photo download failed with status ${response.status}`);
  }

  return {
    type: "file",
    // Telegram re-encodes every photo it receives as JPEG.
    mediaType: "image/jpeg",
    data: Buffer.from(await response.arrayBuffer()).toString("base64"),
  };
}

/** Photos on the message, and on the message it replies to. */
export function downloadPhotos(ctx: Context): Promise<FilePart[]> {
  const photos = [ctx.msg?.photo, ctx.msg?.reply_to_message?.photo].filter(
    (sizes) => sizes !== undefined,
  );
  return Promise.all(photos.map((sizes) => downloadPhoto(ctx, sizes)));
}
