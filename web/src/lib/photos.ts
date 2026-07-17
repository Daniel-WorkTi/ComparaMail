import { extractDriveFileId } from "@/lib/import";
import { safeImageUrl } from "@/lib/security";

/** Foto ainda aponta para Google Drive (lh3…/d/ID ou ID cru). */
export function isDrivePhotoUrl(photoUrl: string): boolean {
  return Boolean(extractDriveFileId(photoUrl));
}

/** Fotos que quebram no Gmail (localhost, ficheiros locais ou thumbs privadas Google). */
export function isFragilePhotoUrl(photoUrl: string): boolean {
  const u = (photoUrl || "").trim().toLowerCase();
  if (!u) return true;
  if (u.startsWith("wphoto:")) return true;
  if (u.includes("localhost") || u.includes("127.0.0.1")) return true;
  if (u.includes("/workspace-photos/")) return true;
  if (u.includes("google.com/s2/photos")) return true;
  if (u.includes("googleusercontent.com/a/")) return true;
  return false;
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

export function emailFromWorkspacePath(photoUrl: string): string | null {
  const raw = (photoUrl || "").trim();
  if (raw.toLowerCase().startsWith("wphoto:")) {
    return raw.slice("wphoto:".length).toLowerCase().trim() || null;
  }
  const url = normalizePhotoStorageUrl(photoUrl);
  const m = url.match(/\/workspace-photos\/([^/?#]+)\.(png|jpe?g|webp)$/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).toLowerCase().trim();
  } catch {
    return m[1].toLowerCase().trim();
  }
}

/**
 * URL para a UI (client-safe — sem crypto).
 * Drive → /api/photo/ID; Workspace → /api/wphoto/{base64email}
 */
export function uiPhotoSrc(photoUrl: string, personEmail?: string): string {
  const url = normalizePhotoStorageUrl(photoUrl);
  if (url.startsWith("/api/photo/") || url.startsWith("/api/wphoto/")) return url;

  const id = extractDriveFileId(url);
  if (id) return `/api/photo/${id}`;

  const email = (personEmail || emailFromWorkspacePath(url) || "")
    .toLowerCase()
    .trim();
  if (email) {
    // base64url sem Buffer (client)
    const token = btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `/api/wphoto/${token}`;
  }

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
