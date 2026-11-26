/**
 * Копирует текст и на HTTP, где navigator.clipboard обычно недоступен.
 * Последний fallback оставляет текст выделенным в поле, чтобы пользователь
 * мог скопировать его штатной командой браузера.
 */
export async function copyToClipboard(text: string): Promise<"copied" | "selected"> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // Clipboard API может быть доступен, но запрещён permissions policy.
    }
  }

  if (typeof document === "undefined") return "selected";

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.setAttribute("aria-hidden", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, input.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  input.remove();
  return copied ? "copied" : "selected";
}
