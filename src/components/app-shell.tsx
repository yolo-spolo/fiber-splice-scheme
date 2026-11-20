import Link from "next/link";
import { logout } from "@/lib/actions/auth";

export function AppShell({
  children,
  breadcrumbs,
  actions,
}: {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-[var(--color-line)] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--color-accent)] text-white">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7h5l3 5-3 5H3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 7h-5l-3 5 3 5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden sm:inline">Схема сварок</span>
          </Link>

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="hidden min-w-0 items-center gap-1.5 text-[13.5px] text-[var(--color-ink-500)] md:flex">
              <span className="text-[var(--color-line)]">/</span>
              {breadcrumbs.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  {c.href ? (
                    <Link href={c.href} className="truncate hover:text-[var(--color-ink-900)]">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate font-medium text-[var(--color-ink-900)]">{c.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <span className="text-[var(--color-line)]">/</span>}
                </span>
              ))}
            </nav>
          )}

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {actions}
            <form action={logout}>
              <button type="submit" className="btn btn-ghost px-2.5 py-1.5 text-[13px]" title="Выйти">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>
      {breadcrumbs && breadcrumbs.length > 1 && (
        <div className="no-print border-b border-[var(--color-line)] bg-white/60 md:hidden">
          <div className="mx-auto flex max-w-[1240px] items-center gap-1.5 overflow-x-auto px-4 py-1.5 text-[12.5px] text-[var(--color-ink-500)] sm:px-6">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1.5">
                {i > 0 && <span className="text-[var(--color-line)]">/</span>}
                {c.href && i < breadcrumbs.length - 1 ? (
                  <Link href={c.href} className="hover:text-[var(--color-ink-900)]">
                    {c.label}
                  </Link>
                ) : (
                  <span className="max-w-[60vw] truncate font-medium text-[var(--color-ink-900)]">{c.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">{children}</main>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight sm:text-[26px]">{title}</h1>
        {subtitle && <div className="mt-1 text-[13.5px] text-[var(--color-ink-500)]">{subtitle}</div>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-[15px] font-semibold">{title}</div>
      {hint && <p className="max-w-md text-[13.5px] text-[var(--color-ink-500)]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
