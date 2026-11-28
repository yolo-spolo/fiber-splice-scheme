"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Кабели", short: "Кабели" },
  { slug: "splice", label: "Схема сварок", short: "Схема" },
  { slug: "trace", label: "Трасса", short: "Трасса" },
  { slug: "photos", label: "Фото", short: "Фото" },
  { slug: "check", label: "Проверка", short: "Проверка" },
  { slug: "share", label: "Ссылка", short: "Ссылка" },
  { slug: "history", label: "История", short: "История" },
];

export function ClosureTabs({ closureId }: { closureId: string }) {
  const pathname = usePathname();
  const base = `/closures/${closureId}`;

  return (
    <div className="no-print -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-sunken)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug ? pathname === href : pathname === base;
        return (
          <Link
            key={tab.slug}
            href={href}
            className="tab shrink-0 px-1.5 text-[12px] sm:px-3 sm:text-[14px]"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
