import { extractDriveFileId } from "@/lib/import";
import { signedPhotoPath } from "@/lib/photo-sign";
import { safeImageUrl } from "@/lib/security";

/** Foto ainda aponta para Google Drive (lh3…/d/ID ou ID cru). */
export function isDrivePhotoUrl(photoUrl: string): boolean {
  return Boolean(extractDriveFileId(photoUrl));
}

/** Converte URLs absolutas de dev (localhost/workspace-photos) em path relativo. */
export function normalizePhotoStorageUrl(photoUrl: string): string {
  const raw = (photoUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/workspace-photos/")) return raw;
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const u = new URL(raw);
      if (u.pathname.startsWith("/workspace-photos/")) {
        return decodeURIComponent(u.pathname);
      }
    }
  } catch {
    // mantém raw
  }
  return raw;
}

/**
 * URL para a UI (proxy local).
 * Preferir passar já um path `/api/photo/...` assinado a partir do servidor.
 * Se receber URL Drive, devolve path sem assinatura (exige sessão).
 */
export function uiPhotoSrc(photoUrl: string): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  if (url.startsWith("/api/photo/")) return url;
  if (url.startsWith("/workspace-photos/")) return url;
  const id = extractDriveFileId(url);
  if (id) return `/api/photo/${id}`;
  return safeImageUrl(url) || "";
}

/**
 * URL para HTML da assinatura.
 * - preview (sem origin): path relativo assinado → funciona no browser
 * - email (com origin): URL absoluta assinada → funciona no Gmail
 */
export function emailPhotoSrc(photoUrl: string, origin?: string): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  const id = extractDriveFileId(url);
  if (id) {
    const path = signedPhotoPath(id);
    const base = (origin || "").replace(/\/$/, "");
    return base ? `${base}${path}` : path;
  }
  if (url.startsWith("/")) {
    const base = (origin || "").replace(/\/$/, "");
    return base ? `${base}${url}` : url;
  }
  return safeImageUrl(url) || "";
}

/** Path assinado para avatares na listagem (gerar só no servidor). */
export function signedUiPhotoSrc(photoUrl: string): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  const id = extractDriveFileId(url);
  if (id) return signedPhotoPath(id);
  if (url.startsWith("/workspace-photos/")) return url;
  return safeImageUrl(url) || "";
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
