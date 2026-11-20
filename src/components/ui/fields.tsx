"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingText ?? "Сохраняю…") : children}
    </button>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
  hint,
  inputMode,
  autoFocus,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  inputMode?: "text" | "numeric" | "decimal";
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="text-[var(--color-danger)]"> *</span>}
      </span>
      <input
        className="field"
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoFocus={autoFocus}
      />
      {hint && <span className="mt-1 block text-[11.5px] text-[var(--color-ink-400)]">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  className = "",
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <select className="field" name={name} defaultValue={defaultValue ?? undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-[11.5px] text-[var(--color-ink-400)]">{hint}</span>}
    </label>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <textarea
        className="field resize-y"
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: "default" | "primary";
}) {
  return (
    <details className="card overflow-hidden" open={defaultOpen}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold select-none ${
          tone === "primary" ? "text-[var(--color-accent)]" : ""
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 transition-transform [details[open]>summary>&]:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {title}
      </summary>
      <div className="border-t border-[var(--color-line)] px-4 py-4">{children}</div>
    </details>
  );
}
