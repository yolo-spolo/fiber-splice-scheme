import { redirect } from "next/navigation";
import { getPasswordState } from "@/lib/password";
import { authErrorMessage } from "@/lib/auth-errors";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Мастер нужен ровно один раз: дальше — обычный вход.
  if ((await getPasswordState()) !== "missing") redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-on-accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h5l3 5-3 5H3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 7h-5l-3 5 3 5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
              Первый запуск
            </div>
            <h1 className="mt-1 text-[21px]">Придумайте пароль</h1>
            <p className="mt-1 text-[13.5px] text-[var(--color-ink-500)]">
              Он защищает схему сварок. Хранится в базе в виде хеша, сменить можно в Справочниках.
            </p>
          </div>
        </div>

        <div className="card p-5">
          <SetupForm error={authErrorMessage(error)} />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-[12px] text-[var(--color-ink-400)]">Тема</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
