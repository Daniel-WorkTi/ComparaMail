import { timingSafeEqual } from "crypto";

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/** Só paths relativos internos (anti open-redirect). */
export function safeRedirectPath(path?: string | null): string {
  if (!path) return "/";
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/";
  }
  if (trimmed.includes("://")) return "/";
  return trimmed;
}

/** Allowlist de protocolos para hrefs da assinatura. */
export function safeHref(
  value: string,
  allowed: ("https:" | "http:" | "mailto:" | "tel:")[] = ["https:", "http:"],
): string {
  const raw = (value || "").trim();
  if (!raw) return "#";
  try {
    const parsed = new URL(raw);
    if (!allowed.includes(parsed.protocol as (typeof allowed)[number])) return "#";
    return parsed.toString();
  } catch {
    return "#";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Comparação resistente a timing (após normalizar comprimento). */
export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Compara consigo mesmo para tempo semelhante, depois falha
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** Rate limit simples em memória (por instância). */
export function consumeLoginAttempt(
  key: string,
  limit = 8,
  windowMs = 15 * 60 * 1000,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** URLs de imagem: só http(s) ou path relativo interno. */
export function safeImageUrl(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    return raw;
  }
  const href = safeHref(raw, ["https:", "http:"]);
  return href === "#" ? "" : href;
}

export function assertMutatingOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Pedidos same-origin de forms/fetch no browser enviam Origin
  if (!origin) {
    // Server-to-server / same-site sem Origin: permitir só se houver cookie (SameSite=Lax)
    // Em mutações browser, Origin costuma existir. Fail closed em produção.
    return !isProductionRuntime();
  }
  try {
    const allowed = new Set<string>();
    const envOrigin =
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    if (envOrigin) allowed.add(new URL(envOrigin).origin);
    if (!isProductionRuntime()) {
      allowed.add("http://localhost:3000");
      allowed.add("http://127.0.0.1:3000");
    }
    const o = new URL(origin).origin;
    if (allowed.size === 0) return !isProductionRuntime();
    return allowed.has(o);
  } catch {
    return false;
  }
}
