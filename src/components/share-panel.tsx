"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createShareLink, revokeShareLink } from "@/lib/actions/shares";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

export type ShareLinkItem = {
  id: string;
  token: string;
  scope: "closure" | "project";
  /** Что именно открывает ссылка: «весь объект» или адрес муфты. */
  targetLabel?: string;
  mode: "READ" | "EDIT";
  expiresAt: string | null;
  revokedAt: string | null;
  views: number;
  createdAt: string;
};

type ClosureOption = { id: string; label: string };

/**
 * Ссылки для заказчика. Живёт и на муфте, и на объекте: с объекта можно
 * выдать ссылку на весь объект или на одну из его муфт, с муфты — только
 * на неё. Права (чтение или правка) задаются при создании и не меняются.
 */
export function SharePanel({
  baseUrl,
  projectId,
  closureId,
  closures = [],
  links,
}: {
  baseUrl: string;
  /** Объект, к которому относится панель: нужен для ссылок на объект. */
  projectId: string;
  /** Муфта, если панель открыта с неё. */
  closureId?: string;
  /** Муфты объекта — для выбора «на какую муфту» на странице объекта. */
  closures?: ClosureOption[];
  links: ShareLinkItem[];
}) {
  const [pending, start] = useTransition();
  const [days, setDays] = useState<string>("30");
  const [mode, setMode] = useState<"READ" | "EDIT">("READ");
  const [target, setTarget] = useState<string>(closureId ?? "project");
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlFields = useRef(new Map<string, HTMLInputElement>());

  // APP_URL может быть не задан — тогда сервер отдал localhost, и скопированная
  // ссылка вела бы не туда. На живом сайте подставляем адрес из браузера.
  const [origin, setOrigin] = useState(baseUrl);
  useEffect(() => {
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) return;
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
    setOrigin(window.location.origin);
  }, [baseUrl]);

  const url = (token: string) => `${origin}/s/${token}`;
  const targetIsProject = target === "project";

  function create() {
    setError(null);
    start(async () => {
      const result = await createShareLink({
        projectId: targetIsProject ? projectId : undefined,
        closureId: targetIsProject ? undefined : target,
        mode,
        days: days ? Number(days) : null,
      });
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-[15px]">Ссылка для заказчика</h2>
        <p className="mt-0.5 mb-3 text-[12.5px] text-[var(--color-ink-500)]">
          Открывается без пароля. «Только чтение» — схема, кабели и фото; «С правом правки» —
          гость вносит изменения от своего имени, и они попадают в историю муфты. Ссылку можно
          отозвать в любой момент.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Что открывает</span>
            <select
              className="field !w-auto"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {/* С муфты ссылку на объект не выдаём: это решение принимают на объекте. */}
              {!closureId && <option value="project">Весь объект</option>}
              {closureId && <option value={closureId}>Эта муфта</option>}
              {!closureId &&
                closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    Муфта: {closure.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Права</span>
            <select
              className="field !w-auto"
              value={mode}
              onChange={(e) => setMode(e.target.value === "EDIT" ? "EDIT" : "READ")}
            >
              <option value="READ">Только чтение</option>
              <option value="EDIT">С правом правки</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Срок действия</span>
            <select className="field !w-auto" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="">Бессрочно</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={create}>
            {pending ? "Создаю…" : "Создать ссылку"}
          </button>
        </div>
        {mode === "EDIT" && (
          <p className="mt-2 rounded-lg bg-[var(--color-warn-soft)] px-3 py-2 text-[11.5px] text-[var(--color-warn)]">
            Ссылка с правкой даёт гостю менять кабели, сварки и параметры. Перед первым изменением
            он обязан указать имя — оно попадёт в историю муфты.
          </p>
        )}
        {error && <p className="mt-2 text-[12px] text-[var(--color-danger)]">{error}</p>}
      </div>

      {links.length > 0 && (
        <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {links.map((link) => {
            const expired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
            const dead = Boolean(link.revokedAt) || expired;
            return (
              <li key={link.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {/* Ссылка — поле только для чтения: её можно выделить пальцем
                      или мышью и скопировать вручную, если буфер недоступен. */}
                  <input
                    ref={(node) => {
                      if (node) urlFields.current.set(link.id, node);
                      else urlFields.current.delete(link.id);
                    }}
                    readOnly
                    value={url(link.token)}
                    aria-label="Ссылка для заказчика"
                    onClick={(e) => e.currentTarget.select()}
                    className={`w-full truncate bg-transparent font-mono text-[12.5px] outline-none ${dead ? "text-[var(--color-ink-400)] line-through" : "text-[var(--color-ink-700)]"}`}
                  />
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--color-ink-400)]">
                    <span className="font-semibold text-[var(--color-ink-500)]">
                      {link.targetLabel ?? (link.scope === "project" ? "весь объект" : "муфта")}
                    </span>
                    <span
                      className={`chip !px-1.5 !py-0 !text-[10px] uppercase ${
                        link.mode === "EDIT"
                          ? "!border-[var(--color-warn)] !text-[var(--color-warn)]"
                          : ""
                      }`}
                    >
                      {link.mode === "EDIT" ? "правка" : "чтение"}
                    </span>
                    <span>{new Date(link.createdAt).toLocaleDateString("ru-RU")}</span>
                    {link.expiresAt && <span>до {new Date(link.expiresAt).toLocaleDateString("ru-RU")}</span>}
                    {!link.expiresAt && <span>бессрочно</span>}
                    <span>{link.views} просм.</span>
                    {link.revokedAt && <span className="font-semibold text-[var(--color-danger)]">отозвана</span>}
                    {!link.revokedAt && expired && <span className="font-semibold text-[var(--color-warn)]">истекла</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost px-2.5 py-1 text-[12px]"
                  onClick={() => {
                    void copyToClipboard(url(link.token)).then((result) => {
                      setCopyFailed(result === "selected" ? link.id : null);
                      setCopied(link.id);
                      if (result === "selected") {
                        // Ни системный буфер, ни execCommand не сработали:
                        // выделяем саму ссылку, чтобы осталось нажать Ctrl+C
                        // или «Копировать» в меню долгого нажатия.
                        const field = urlFields.current.get(link.id);
                        field?.focus();
                        field?.select();
                      }
                      window.setTimeout(() => {
                        setCopied((current) => (current === link.id ? null : current));
                        setCopyFailed((current) => (current === link.id ? null : current));
                      }, 3500);
                    });
                  }}
                >
                  {copied === link.id ? (copyFailed === link.id ? "Выделено" : "Скопировано") : "Копировать"}
                </button>
                {!link.revokedAt && (
                  <button
                    type="button"
                    className="btn btn-danger px-2.5 py-1 text-[12px]"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await revokeShareLink(link.id);
                      })
                    }
                  >
                    Отозвать
                  </button>
                )}
                {copyFailed === link.id && (
                  <p className="w-full text-[11.5px] text-[var(--color-warn)]">
                    Браузер не дал доступ к буферу — ссылка выделена, скопируйте её вручную.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
