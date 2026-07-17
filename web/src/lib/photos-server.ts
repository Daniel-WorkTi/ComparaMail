import { extractDriveFileId } from "@/lib/import";
import {
  emailFromWorkspacePath,
  isFragilePhotoUrl,
  normalizePhotoStorageUrl,
} from "@/lib/photos";
import {
  signedPhotoPath,
  signedWorkspacePhotoPath,
} from "@/lib/photo-sign";
import { safeImageUrl } from "@/lib/security";

/**
 * Origem pública para Gmail — nunca localhost.
 */
export function publicAppOrigin(origin?: string): string {
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

/**
 * URL para HTML da assinatura (Gmail).
 * Drive → /api/photo assinado; Workspace → /api/wphoto assinado;
 * HTTPS Blob/Google → direto. Nunca localhost.
 */
export function emailPhotoSrc(
  photoUrl: string,
  origin?: string,
  personEmail?: string,
): string {
  const base = publicAppOrigin(origin);
  const url = normalizePhotoStorageUrl(photoUrl);

  if (url.startsWith("https://")) {
    return safeImageUrl(url) || "";
  }

  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `${base}${signedPhotoPath(driveId)}`;
  }

  const email = (personEmail || emailFromWorkspacePath(url) || "")
    .toLowerCase()
    .trim();
  if (
    email &&
    (isFragilePhotoUrl(url) ||
      url.startsWith("/workspace-photos/") ||
      !url)
  ) {
    return `${base}${signedWorkspacePhotoPath(email)}`;
  }

  if (url.startsWith("/api/")) {
    return `${base}${url}`;
  }

  if (url.startsWith("/") && !isFragilePhotoUrl(url)) {
    return `${base}${url}`;
  }

  if (email) {
    return `${base}${signedWorkspacePhotoPath(email)}`;
  }

  return safeImageUrl(url) || "";
}

/** Path assinado para avatares na listagem (só servidor). */
export function signedUiPhotoSrc(
  photoUrl: string,
  personEmail?: string,
): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  const id = extractDriveFileId(url);
  if (id) return signedPhotoPath(id);
  if (url.startsWith("/workspace-photos/")) return url;
  const email = (personEmail || emailFromWorkspacePath(url) || "").trim();
  if (email && isFragilePhotoUrl(url)) {
    return signedWorkspacePhotoPath(email);
  }
  return safeImageUrl(url) || "";
}
