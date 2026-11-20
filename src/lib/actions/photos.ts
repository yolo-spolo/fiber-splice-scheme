"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { removeImage, saveImage } from "@/lib/storage";

const MAX_BYTES = 12 * 1024 * 1024;

export async function uploadPhoto(formData: FormData) {
  const closureId = String(formData.get("closureId") ?? "");
  const cassetteId = String(formData.get("cassetteId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("file");

  if (!closureId) return { error: "Не указана муфта" };
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите фото" };
  if (!file.type.startsWith("image/")) return { error: "Файл не является изображением" };
  if (file.size > MAX_BYTES) return { error: "Фото больше 12 МБ" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveImage(closureId, buffer);

  const last = await prisma.photo.aggregate({ where: { closureId }, _max: { order: true } });

  await prisma.photo.create({
    data: {
      closureId,
      cassetteId: cassetteId || null,
      file: saved.file,
      thumb: saved.thumb,
      width: 0,
      height: 0,
      caption: caption || null,
      order: (last._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/closures/${closureId}`);
  return { ok: true };
}

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.delete({ where: { id } });
  await removeImage(photo.file);
  await removeImage(photo.thumb);
  revalidatePath(`/closures/${photo.closureId}`);
  return { ok: true };
}

export type Pin = {
  x: number;
  y: number;
  refType: "cassette" | "splice" | "cable";
  refId: string;
  label: string;
};

export async function savePhotoPins(id: string, pins: Pin[], caption?: string) {
  const photo = await prisma.photo.update({
    where: { id },
    data: {
      pins,
      ...(caption !== undefined ? { caption: caption.trim() || null } : {}),
    },
  });
  revalidatePath(`/closures/${photo.closureId}`);
  return { ok: true };
}
