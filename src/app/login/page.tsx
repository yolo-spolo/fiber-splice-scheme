import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-accent)] text-white">
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
          <LoginForm next={next ?? "/"} />
        </div>
      </div>
    </div>
  );
}
