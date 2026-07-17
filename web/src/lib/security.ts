import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isProductionRuntime } from "@/lib/runtime";

export { isProductionRuntime };

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

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((n) => n > 255)) return true;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  // IPv6 link-local / unique-local
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }
  return false;
}

/**
 * URLs de foto/logo: path relativo interno ou https público.
 * Bloqueia javascript:, data:, http, e hosts privados/loopback.
 */
export function safeImageUrl(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("blob:")
  ) {
    return "";
  }
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    if (raw.includes("://")) return "";
    // Fotos Workspace servidas de /public/workspace-photos
    if (raw.startsWith("/workspace-photos/")) return raw;
    if (raw.startsWith("/api/photo/")) return raw;
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return "";
    if (isPrivateOrLocalHost(parsed.hostname)) return "";
    if (parsed.username || parsed.password) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

/** Respostas privadas: não cachear em CDN/browser partilhado. */
export const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

export function jsonPrivate(
  data: unknown,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(data, { status: init?.status, headers });
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
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
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
