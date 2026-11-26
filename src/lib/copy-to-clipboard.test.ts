import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./copy-to-clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyToClipboard", () => {
  it("на защищённом адресе пишет через Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyToClipboard("http://x/s/abc")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("http://x/s/abc");
  });

  it("без Clipboard API (обычный HTTP) не падает и не бросает", async () => {
    // jsdom нет — проверяем именно ветку «нет navigator.clipboard».
    vi.stubGlobal("navigator", {});
    const result = await copyToClipboard("http://fiber.quota.ovh:4325/s/abc");
    expect(["copied", "selected"]).toContain(result);
  });

  it("если Clipboard API запрещён, пробует другой путь вместо исключения", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const result = await copyToClipboard("текст");
    expect(writeText).toHaveBeenCalled();
    expect(["copied", "selected"]).toContain(result);
  });
});
