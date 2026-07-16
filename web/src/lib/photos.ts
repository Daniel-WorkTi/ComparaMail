import { extractDriveFileId } from "@/lib/import";
import { signedPhotoPath } from "@/lib/photo-sign";
import { safeImageUrl } from "@/lib/security";

/**
 * URL para a UI (proxy local).
 * Preferir passar já um path `/api/photo/...` assinado a partir do servidor.
 * Se receber URL Drive, devolve path sem assinatura (exige sessão).
 */
export function uiPhotoSrc(photoUrl: string): string {
  if (photoUrl.startsWith("/api/photo/")) return photoUrl;
  const id = extractDriveFileId(photoUrl);
  if (id) return `/api/photo/${id}`;
  return safeImageUrl(photoUrl) || "";
}

/**
 * URL para HTML da assinatura.
 * - preview (sem origin): path relativo assinado → funciona no browser
 * - email (com origin): URL absoluta assinada → funciona no Gmail
 */
export function emailPhotoSrc(photoUrl: string, origin?: string): string {
  const id = extractDriveFileId(photoUrl);
  if (id) {
    const path = signedPhotoPath(id);
    const base = (origin || "").replace(/\/$/, "");
    return base ? `${base}${path}` : path;
  }
  return safeImageUrl(photoUrl) || "";
}

/** Path assinado para avatares na listagem (gerar só no servidor). */
export function signedUiPhotoSrc(photoUrl: string): string {
  const id = extractDriveFileId(photoUrl);
  if (id) return signedPhotoPath(id);
  return safeImageUrl(photoUrl) || "";
}

/** Origem pública estável (AUTH_URL). Evita VERCEL_URL efémero. */
export function appOriginFromEnv(): string {
  const raw =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  return raw.replace(/\/$/, "");
}
