import { ForgetGuestName } from "./forget-guest-name";

/** Общая плашка для всех состояний, в которых ссылка не работает. */
export function ShareUnavailable({
  status,
  token,
}: {
  status: "notfound" | "revoked" | "expired" | "forbidden";
  /** Токен нужен, чтобы стереть имя гостя у мёртвой ссылки. */
  token?: string;
}) {
  const title =
    status === "notfound"
      ? "Ссылка не найдена"
      : status === "revoked"
        ? "Ссылка отозвана"
        : status === "expired"
          ? "Срок ссылки истёк"
          : "Эта ссылка не открывает выбранную муфту";

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      {/* «Нет доступа» к чужой муфте — не повод забывать имя: сама ссылка жива. */}
      {token && status !== "forbidden" && <ForgetGuestName token={token} />}
      <div className="card max-w-[420px] p-6 text-center">
        <h1 className="text-[19px]">{title}</h1>
        <p className="mt-2 text-[13px] text-[var(--color-ink-500)]">
          {status === "forbidden"
            ? "Ссылка выдана на одну муфту. Попросите исполнителя прислать ссылку на нужную."
            : "Попросите исполнителя прислать новую ссылку на схему."}
        </p>
      </div>
    </div>
  );
}
