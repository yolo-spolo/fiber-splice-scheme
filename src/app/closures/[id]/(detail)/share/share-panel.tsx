"use client";

import { useState, useTransition } from "react";
import { createShareLink, revokeShareLink } from "@/lib/actions/shares";

type LinkItem = {
  id: string;
  token: string;
  expiresAt: string | null;
  revokedAt: string | null;
  views: number;
  createdAt: string;
};

export function SharePanel({
  closureId,
  baseUrl,
  links,
}: {
  closureId: string;
  baseUrl: string;
  links: LinkItem[];
}) {
  const [pending, start] = useTransition();
  const [days, setDays] = useState<string>("30");
  const [copied, setCopied] = useState<string | null>(null);

  const url = (token: string) => `${baseUrl}/s/${token}`;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-[15px]">Ссылка для заказчика</h2>
        <p className="mt-0.5 mb-3 text-[12.5px] text-[var(--color-ink-500)]">
          Открывается без пароля, только чтение: схема сварок, кабели и фото. Ссылку можно отозвать.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Срок действия</span>
            <select className="field !w-auto" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="">Бессрочно</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await createShareLink({
                  closureId,
                  days: days ? Number(days) : null,
                });
              })
            }
          >
            {pending ? "Создаю…" : "Создать ссылку"}
          </button>
        </div>
      </div>

      {links.length > 0 && (
        <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {links.map((link) => {
            const expired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
            const dead = Boolean(link.revokedAt) || expired;
            return (
              <li key={link.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-mono text-[12.5px] ${dead ? "text-[var(--color-ink-400)] line-through" : ""}`}>
                    {url(link.token)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[var(--color-ink-400)]">
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
                  onClick={async () => {
                    await navigator.clipboard.writeText(url(link.token));
                    setCopied(link.id);
                    setTimeout(() => setCopied(null), 1800);
                  }}
                >
                  {copied === link.id ? "Скопировано" : "Копировать"}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
