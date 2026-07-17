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

/**
 * URL para HTML da assinatura (Gmail).
 * Com email corporativo → sempre /api/wphoto (foto de perfil Workspace/Gmail).
 * Senão: Blob HTTPS → Drive proxy → paths públicos.
 */
export function emailPhotoSrc(
  photoUrl: string,
  origin?: string,
  personEmail?: string,
): string {
  const base = publicAppOrigin(origin);
  const url = normalizePhotoStorageUrl(photoUrl);
  const email = (personEmail || emailFromWorkspacePath(url) || "")
    .toLowerCase()
    .trim();

  // Foto de perfil Gmail/Workspace — estável no Gmail (sem cookies Google)
  if (email) {
    return `${base}${workspacePhotoPath(email)}`;
  }

  if (url.startsWith("https://")) {
    const safe = safeImageUrl(url);
    if (safe) return safe;
  }

  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `${base}${signedPhotoPath(driveId)}`;
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

  const email = (personEmail || emailFromWorkspacePath(url) || "").trim();
  if (email) {
    return workspacePhotoPath(email);
  }
  if (url.startsWith("/workspace-photos/")) return url;
  return safeImageUrl(url) || "";
}

export { workspacePhotoToken };
