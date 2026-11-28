import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
}

export function closureDir(closureId: string): string {
  return path.join(uploadRoot(), closureId);
}

/** Возвращает относительный путь, который кладём в БД (без корня). */
export async function saveImage(
  closureId: string,
  buffer: Buffer,
  ext = "jpg",
): Promise<{ file: string; thumb: string; width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const dir = closureDir(closureId);
  await mkdir(dir, { recursive: true });

  const base = randomUUID();
  const fileName = `${base}.${ext}`;
  const thumbName = `${base}-thumb.jpg`;

  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const normalized = await image
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84 })
    .toBuffer();

  const thumb = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 420, height: 420, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();

  await writeFile(path.join(dir, fileName), normalized);
  await writeFile(path.join(dir, thumbName), thumb);

  return {
    file: path.posix.join(closureId, fileName),
    thumb: path.posix.join(closureId, thumbName),
    // Размеры исходника: раньше они вычислялись и выбрасывались, а в базу
    // писались нули — по ним нельзя было ни посчитать место, ни показать фото
    // без загрузки файла.
    width,
    height,
  };
}

export async function removeImage(relativePath: string) {
  try {
    await unlink(path.join(uploadRoot(), relativePath));
  } catch {
    // файла уже нет — не мешает
  }
}

/** Защита от выхода за пределы каталога загрузок. */
export function safeUploadPath(relativePath: string): string | null {
  const root = uploadRoot();
  const full = path.resolve(root, relativePath);
  if (!full.startsWith(root + path.sep)) return null;
  return full;
}
