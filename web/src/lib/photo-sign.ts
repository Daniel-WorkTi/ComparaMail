import { createHmac } from "crypto";
import { isProductionRuntime } from "@/lib/runtime";
import { safeEqualString } from "@/lib/security";

function signingSecret(): string {
  // PHOTO_SIGNING_SECRET permite alinhar local + Vercel sem partilhar AUTH_SECRET
  const secret =
    process.env.PHOTO_SIGNING_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;
  if (isProductionRuntime()) {
    throw new Error("AUTH_SECRET é obrigatório em produção");
  }
  return "comparaja-dev-secret-change-me";
}

/** Assina acesso a /api/photo/[id] para clientes de email (sem cookie). */
export function signPhotoToken(id: string, expUnix: number): string {
  return createHmac("sha256", signingSecret())
    .update(`photo:${id}:${expUnix}`)
    .digest("base64url");
}

export function verifyPhotoToken(
  id: string,
  expUnix: number,
  sig: string | null | undefined,
): boolean {
  if (!sig || !Number.isFinite(expUnix)) return false;
  if (expUnix < Math.floor(Date.now() / 1000)) return false;
  if (expUnix > Math.floor(Date.now() / 1000) + 63072000) return false;
  const expected = signPhotoToken(id, expUnix);
  return safeEqualString(expected, sig);
}

/** Path relativo assinado (TTL longo para Gmail). */
export function signedPhotoPath(
  id: string,
  ttlSec = 60 * 60 * 24 * 365,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const s = signPhotoToken(id, exp);
  return `/api/photo/${id}?e=${exp}&s=${s}`;
}

/** Token estável para email (base64url). */
export function workspacePhotoToken(email: string): string {
  return Buffer.from(email.toLowerCase().trim(), "utf8").toString("base64url");
}

export function emailFromWorkspacePhotoToken(token: string): string | null {
  try {
    const email = Buffer.from(token, "base64url")
      .toString("utf8")
      .toLowerCase()
      .trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
  } catch {
    return null;
  }
}

/**
 * Path público para foto Workspace (Gmail).
 * Sem HMAC — o /api/wphoto valida domínio @comparaja.pt + rate limit.
 * Assim local e Vercel não precisam do mesmo AUTH_SECRET.
 */
export function workspacePhotoPath(email: string): string {
  return `/api/wphoto/${workspacePhotoToken(email)}`;
}

/** @deprecated use workspacePhotoPath — mantido por compat. */
export function signedWorkspacePhotoPath(email: string): string {
  return workspacePhotoPath(email);
}

export function verifyWorkspacePhotoToken(
  id: string,
  expUnix: number,
  sig: string | null | undefined,
): boolean {
  if (!sig || !Number.isFinite(expUnix)) return false;
  if (expUnix < Math.floor(Date.now() / 1000)) return false;
  if (expUnix > Math.floor(Date.now() / 1000) + 63072000) return false;
  const expected = signPhotoToken(`wphoto:${id}`, expUnix);
  return safeEqualString(expected, sig);
}
