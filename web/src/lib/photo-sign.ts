import { createHmac } from "crypto";
import { isProductionRuntime, safeEqualString } from "@/lib/security";

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
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

/** Path relativo assinado (TTL longo para Gmail). base64url já é URL-safe. */
export function signedPhotoPath(
  id: string,
  ttlSec = 60 * 60 * 24 * 365,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const s = signPhotoToken(id, exp);
  return `/api/photo/${id}?e=${exp}&s=${s}`;
}
