"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  showSubmit?: boolean;
  className?: string;
  compact?: boolean;
};

export function PasswordLoginForm({
  showSubmit = true,
  className = "",
  compact = false,
}: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no login");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${compact ? "space-y-2.5" : "space-y-4"} ${className}`}>
      <label className={`block ${compact ? "text-xs" : "text-sm"}`}>
        <span
          className={`mb-1 block font-semibold text-[#243B5C] ${compact ? "mb-1" : "mb-1.5"}`}
        >
          Password de acesso
        </span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoFocus
            className={`w-full border border-[#D5DEE8] bg-white text-[#152033] outline-none transition focus:border-[#45668E] focus:shadow-[0_0_0_3px_rgba(69,102,142,0.16)] ${
              compact
                ? "rounded-lg px-3 py-2 pr-10 text-sm"
                : "rounded-lg px-3 py-2.5 pr-10 text-sm"
            }`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#6B7C8F] hover:text-[#243B5C]"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 3l18 18M10.6 10.7a2.5 2.5 0 003.5 3.5M9.9 5.2A9.8 9.8 0 0112 5c5 0 8.8 3.4 10 7-.3 1-1 2.3-2 3.4M6.1 6.2C4.3 7.5 3 9.2 2 12c1.2 3.6 5 7 10 7 1.5 0 2.9-.3 4.1-.8"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            )}
          </button>
        </span>
      </label>
      {error && (
        <p className="rounded-lg border border-[#f0c7c7] bg-[#fceeee] px-2.5 py-2 text-xs text-[#a33b3b]">
          {error}
        </p>
      )}
      {showSubmit && (
        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center rounded-lg bg-[#2F4A6E] px-3 text-sm font-semibold text-white transition hover:bg-[#243B5C] disabled:opacity-60 ${
            compact ? "h-9" : "h-10"
          }`}
        >
          {busy ? "A entrar…" : "Entrar"}
        </button>
      )}
    </form>
  );
}
