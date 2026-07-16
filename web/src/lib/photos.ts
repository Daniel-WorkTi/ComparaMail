import { extractDriveFileId } from "@/lib/import";
import { signedPhotoPath } from "@/lib/photo-sign";
import { safeImageUrl } from "@/lib/security";

/**
 * URL para a UI (proxy local).
 * Sem assinatura: o route /api/photo exige sessão autenticada.
 */
export function uiPhotoSrc(photoUrl: string): string {
  const id = extractDriveFileId(photoUrl);
  if (id) return `/api/photo/${id}`;
  return safeImageUrl(photoUrl) || "";
}

/**
 * URL absoluta para HTML da assinatura (Gmail).
 * Inclui assinatura HMAC para funcionar sem cookie de sessão.
 */
export function emailPhotoSrc(photoUrl: string, origin?: string): string {
  const id = extractDriveFileId(photoUrl);
  const base = (origin || "").replace(/\/$/, "");
  if (id) {
    const path = signedPhotoPath(id);
    if (base) return `${base}${path}`;
    return path;
  }
  return safeImageUrl(photoUrl) || "";
}

/** Origem pública da app a partir de env. */
export function appOriginFromEnv(): string {
  const raw =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "";
  return raw.replace(/\/$/, "");
}
