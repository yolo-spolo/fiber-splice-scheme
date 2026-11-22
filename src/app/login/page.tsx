import { redirect } from "next/navigation";
import { getPasswordState } from "@/lib/password";
import { authErrorMessage } from "@/lib/auth-errors";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Пароля ещё нет — сначала мастер первого запуска.
  if ((await getPasswordState()) === "missing") redirect("/setup");

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-on-accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h5l3 5-3 5H3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 7h-5l-3 5 3 5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1 className="text-[21px]">Схема сварок</h1>
            <p className="mt-1 text-[13.5px] text-[var(--color-ink-500)]">
              Учёт оптических муфт и схема для заказчика
            </p>
          </div>
        </div>
        <div className="card p-5">
          <LoginForm next={next ?? "/"} error={authErrorMessage(error)} />
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <ThemeToggle />
          <p className="max-w-[320px] text-center text-[11.5px] leading-relaxed text-[var(--color-ink-400)]">
            Забыли пароль? Сбросьте его на сервере:{" "}
            <code className="rounded bg-[var(--color-sunken)] px-1.5 py-0.5 font-mono text-[11px]">
              npm run auth:reset
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
