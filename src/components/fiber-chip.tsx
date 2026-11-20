import { colorByCode } from "@/lib/colors";

export function FiberChip({
  colorCode,
  moduleIndex,
  position,
  size = "sm",
}: {
  colorCode: number;
  moduleIndex: number;
  position: number;
  size?: "sm" | "md";
}) {
  const color = colorByCode(colorCode);
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span
        className={`swatch ${size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}`}
        style={{ background: color.hex }}
        title={color.name}
      />
      <span className="font-mono text-[12px] text-[var(--color-ink-700)]">
        {moduleIndex}:{position}
      </span>
      <span className="hidden text-[11.5px] text-[var(--color-ink-400)] sm:inline">{color.name.toLowerCase()}</span>
    </span>
  );
}

export function ColorStrip({ colorCodes }: { colorCodes: number[] }) {
  return (
    <span className="flex overflow-hidden rounded-[3px] ring-1 ring-black/10">
      {colorCodes.map((c, i) => (
        <span key={i} className="h-2.5 w-2" style={{ background: colorByCode(c).hex }} />
      ))}
    </span>
  );
}
