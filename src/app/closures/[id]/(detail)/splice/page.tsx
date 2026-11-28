import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { closureEditorData } from "@/lib/editor-data";
import { SpliceEditor } from "./splice-editor";

export const dynamic = "force-dynamic";

export default async function SplicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();
  const { cables, cassettes, splices } = closureEditorData(closure);

  return (
    <SpliceEditor
      closureId={closure.id}
      cables={cables}
      cassettes={cassettes}
      splices={splices}
    />
  );
}
