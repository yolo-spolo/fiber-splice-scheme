"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { removeImage, saveImage } from "@/lib/storage";
import { resolveEditor } from "@/lib/edit-access";
import { logHistory } from "@/lib/history";
import { editClosureRecord } from "./guard";

const MAX_BYTES = 12 * 1024 * 1024;

export async function uploadPhoto(formData: FormData) {
  const closureId = String(formData.get("closureId") ?? "");
  const cassetteId = String(formData.get("cassetteId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const shareToken = String(formData.get("shareToken") ?? "") || null;
  const file = formData.get("file");

  if (!closureId) return { error: "Не указана муфта" };
  const auth = await resolveEditor(shareToken, closureId);
  if ("error" in auth) return { error: auth.error };
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите фото" };
  if (!file.type.startsWith("image/")) return { error: "Файл не является изображением" };
  if (file.size > MAX_BYTES) return { error: "Фото больше 12 МБ" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveImage(closureId, buffer);

  const last = await prisma.photo.aggregate({ where: { closureId }, _max: { order: true } });

  await prisma.$transaction(async (tx) => {
    const photo = await tx.photo.create({
      data: {
        closureId,
        cassetteId: cassetteId || null,
        file: saved.file,
        thumb: saved.thumb,
        width: saved.width,
        height: saved.height,
        caption: caption || null,
        order: (last._max.order ?? -1) + 1,
      },
      select: { id: true },
    });
    await logHistory(tx, auth.actor, closureId, {
      action: "photoUpload",
      summary: caption || "фото муфты",
      targetId: photo.id,
    });
  });

  revalidatePath(`/closures/${closureId}`);
  return { ok: true };
}

export async function deletePhoto(id: string, shareToken?: string | null) {
  const removedFiles: { file: string; thumb: string }[] = [];
  const result = await editClosureRecord({
    shareToken,
    notFound: "Фото не найдено",
    scope: async () => {
      const row = await prisma.photo.findUnique({ where: { id } });
      return row ? { closureId: row.closureId, row } : null;
    },
    write: async (tx) => {
      const removed = await tx.photo.delete({ where: { id } });
      removedFiles.push({ file: removed.file, thumb: removed.thumb });
      return {
        action: "photoDelete",
        summary: removed.caption ?? "фото муфты",
        targetId: id,
      };
    },
  });
  // Файлы удаляем только после успешной транзакции: если она упала,
  // запись в базе осталась бы со ссылкой на несуществующий файл.
  if ("ok" in result) {
    for (const files of removedFiles) {
      await removeImage(files.file);
      await removeImage(files.thumb);
    }
  }
  return result;
}

export type Pin = {
  x: number;
  y: number;
  refType: "cassette" | "splice" | "cable";
  refId: string;
  label: string;
};

export async function savePhotoPins(
  id: string,
  pins: Pin[],
  caption?: string,
  shareToken?: string | null,
) {
  const nextCaption = caption !== undefined ? caption.trim() || null : undefined;
  return editClosureRecord({
    shareToken,
    notFound: "Фото не найдено",
    scope: async () => {
      const row = await prisma.photo.findUnique({
        where: { id },
        select: { closureId: true, caption: true, pins: true },
      });
      return row ? { closureId: row.closureId, row } : null;
    },
    write: async (tx, current) => {
      await tx.photo.update({
        where: { id },
        data: {
          pins,
          ...(nextCaption !== undefined ? { caption: nextCaption } : {}),
        },
      });
      return {
        action: "photoPins",
        summary: `меток: ${(current.pins as unknown[]).length} → ${pins.length}${nextCaption !== undefined && nextCaption !== current.caption ? ", подпись изменена" : ""}`,
        before: { pins: (current.pins as object) ?? [], caption: current.caption },
        after: { pins: pins as unknown as object, caption: nextCaption ?? current.caption },
        targetId: id,
      };
    },
  });
}
