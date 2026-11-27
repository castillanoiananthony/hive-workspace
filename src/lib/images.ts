import "server-only";
import sharp from "sharp";

const SIZES = { avatar: { width: 400, height: 400 }, banner: { width: 1600, height: 480 } } as const;
export const MAX_UPLOAD = 4 * 1024 * 1024;

/**
 * Decodes whatever was uploaded, then re-encodes a fresh WebP at a fixed size.
 * Anything that isn't a real image fails to decode; re-encoding also drops hidden metadata (like GPS location).
 */
export async function processImage(file: File, kind: keyof typeof SIZES): Promise<Buffer> {
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a picture to upload.");
  if (file.size > MAX_UPLOAD) throw new Error("That picture is too big. Try one under 4 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "gif", "avif", "heif"].includes(meta.format ?? "")) throw new Error();
    return await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // respect the phone's orientation, then forget it
      .resize({ ...SIZES[kind], fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("That file isn't a picture we can use. Try a JPG, PNG or WebP.");
  }
}
