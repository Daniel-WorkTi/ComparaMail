import { extractDriveFileId } from "@/lib/import";
import {
  emailFromWorkspacePath,
  isFragilePhotoUrl,
  normalizePhotoStorageUrl,
} from "@/lib/photos";
import {
  signedPhotoPath,
  workspacePhotoPath,
  workspacePhotoToken,
} from "@/lib/photo-sign";
import { safeImageUrl } from "@/lib/security";

/**
 * Origem pública para Gmail — nunca localhost.
 * Passar `""` para URLs relativas (preview na app).
 */
export function publicAppOrigin(origin?: string): string {
  if (origin === "") return "";
  const candidates = [
    origin,
    process.env.PRODUCTION_AUTH_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    "https://comparamailpt.vercel.app",
  ];
  for (const raw of candidates) {
    const o = (raw || "").trim().replace(/\/$/, "");
    if (!o) continue;
    if (/localhost|127\.0\.0\.1/i.test(o)) continue;
    if (o.startsWith("http://") || o.startsWith("https://")) return o;
    return `https://${o}`;
  }
  return "https://comparamailpt.vercel.app";
}

/** URL lh3 directa — o mesmo padrão do logo ComparaJá (funciona no Gmail). */
export function drivePhotoPublicUrl(photoUrl: string): string | null {
  const id = extractDriveFileId(normalizePhotoStorageUrl(photoUrl));
  if (!id) return null;
  return `https://lh3.googleusercontent.com/d/${id}=s400`;
}

/**
 * URL para HTML da assinatura (Gmail).
 * Ordem: Drive lh3 (como o logo) → Blob HTTPS → /api/photo assinado → /api/wphoto.
 */
export function emailPhotoSrc(
  photoUrl: string,
  origin?: string,
  personEmail?: string,
): string {
  const base = publicAppOrigin(origin);
  const url = normalizePhotoStorageUrl(photoUrl);

  // 1) Google Drive — HTTPS público (igual ao logo)
  const driveDirect = drivePhotoPublicUrl(url);
  if (driveDirect) return driveDirect;

  // 2) HTTPS estável (Vercel Blob / CDN), não thumbs privadas Google
  if (url.startsWith("https://")) {
    const fragileGoogle =
      url.includes("google.com/s2/photos") ||
      url.includes("googleusercontent.com/a/");
    if (!fragileGoogle) {
      const safe = safeImageUrl(url);
      if (safe) return safe;
    }
  }

  // 3) Proxy Drive assinado (legado /api/photo/…)
  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `${base}${signedPhotoPath(driveId)}`;
  }
  if (url.startsWith("/api/photo/")) {
    return url.startsWith("http") ? url : `${base}${url}`;
  }

  // 4) Último recurso: foto Directory Workspace
  const email = (personEmail || emailFromWorkspacePath(url) || "")
    .toLowerCase()
    .trim();
  if (email) {
    return `${base}${workspacePhotoPath(email)}`;
  }

  if (url.startsWith("/api/")) {
    return `${base}${url}`;
  }

  if (url.startsWith("/") && !isFragilePhotoUrl(url)) {
    return `${base}${url}`;
  }

  return "";
}

/** Path para avatares na listagem (servidor). */
export function signedUiPhotoSrc(
  photoUrl: string,
  personEmail?: string,
): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  const id = extractDriveFileId(url);
  if (id) return signedPhotoPath(id);

  if (url.startsWith("https://") && !isFragilePhotoUrl(url)) {
    return safeImageUrl(url) || "";
  }

  const email = (personEmail || emailFromWorkspacePath(url) || "").trim();
  if (email) {
    return workspacePhotoPath(email);
  }
  if (url.startsWith("/workspace-photos/")) return url;
  return safeImageUrl(url) || "";
}

export { workspacePhotoToken };
