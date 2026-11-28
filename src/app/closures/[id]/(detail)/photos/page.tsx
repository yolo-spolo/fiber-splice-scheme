import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { closureEditorData } from "@/lib/editor-data";
import { PhotoManager } from "./photo-manager";

export const dynamic = "force-dynamic";

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();
  const { cassettes, photos } = closureEditorData(closure);

  return (
    <PhotoManager
      closureId={closure.id}
      cassettes={cassettes}
      photos={photos}
    />
  );
}
