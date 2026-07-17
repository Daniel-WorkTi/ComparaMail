import { readFile } from "fs/promises";
import path from "path";
import {
  listWorkspaceEmailsAndTitles,
  resolveWorkspacePhotoUrl,
} from "@/lib/google-workspace";
import { parseCsv, toPhotoUrl, extractDriveFileId } from "@/lib/import";
import { isFragilePhotoUrl } from "@/lib/photos";
import { getStore, saveStore } from "@/lib/storage";

export type WorkspaceSyncResult = {
  matched: number;
  updatedTitle: number;
  updatedEmail: number;
  updatedPhone: number;
  updatedPhoto: number;
  restoredDrivePhoto: number;
  unchanged: number;
  googleUsers: number;
  unmatchedLocal: number;
};

function isDurableHttpsPhoto(photoUrl: string): boolean {
  const u = (photoUrl || "").trim();
  if (!u.startsWith("https://")) return false;
  return !isFragilePhotoUrl(u);
}

/** IDs/URLs Drive do import.csv (fallback fiável para o Gmail). */
async function drivePhotosFromImportCsv(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const csvPath = path.join(process.cwd(), "data", "import.csv");
    const text = await readFile(csvPath, "utf8");
    for (const row of parseCsv(text)) {
      const email = (row.email || "").toLowerCase().trim();
      const url = toPhotoUrl(row.photo || "");
      if (!email || !extractDriveFileId(url)) continue;
      map.set(email, url);
    }
  } catch {
    // CSV opcional
  }
  return map;
}

/**
 * Atualiza email + cargo + telemóvel + foto a partir do Workspace.
 * Nomes e slugs ficam intactos. Match só por email.
 * Fotos: restaura Drive se a local for frágil; só sobe Workspace se for HTTPS Blob.
 */
export async function syncEmailsAndTitlesFromWorkspace(): Promise<WorkspaceSyncResult> {
  const remote = await listWorkspaceEmailsAndTitles();
  const byEmail = new Map(remote.map((u) => [u.email, u]));
  const driveByEmail = await drivePhotosFromImportCsv();

  const store = await getStore();
  let matched = 0;
  let updatedTitle = 0;
  let updatedEmail = 0;
  let updatedPhone = 0;
  let updatedPhoto = 0;
  let restoredDrivePhoto = 0;
  let unchanged = 0;

  for (const person of store.people) {
    const localEmail = (person.email || "").toLowerCase().trim();
    if (!localEmail) {
      unchanged += 1;
      continue;
    }

    const remoteUser = byEmail.get(localEmail);
    if (!remoteUser) {
      // Mesmo sem user no Directory, restaurar Drive se a foto estiver partida
      if (isFragilePhotoUrl(person.photoUrl)) {
        const driveUrl = driveByEmail.get(localEmail);
        if (driveUrl) {
          person.photoUrl = driveUrl;
          person.updatedAt = new Date().toISOString();
          restoredDrivePhoto += 1;
          updatedPhoto += 1;
          continue;
        }
      }
      unchanged += 1;
      continue;
    }

    matched += 1;
    let changed = false;

    if ((person.email || "") !== remoteUser.email) {
      person.email = remoteUser.email;
      updatedEmail += 1;
      changed = true;
    }

    if (remoteUser.title && person.title !== remoteUser.title) {
      person.title = remoteUser.title;
      updatedTitle += 1;
      changed = true;
    }

    if (remoteUser.phone && (person.phone || "") !== remoteUser.phone) {
      person.phone = remoteUser.phone;
      updatedPhone += 1;
      changed = true;
    }

    // 1) Restaurar Drive do CSV se a foto actual quebra no Gmail
    if (isFragilePhotoUrl(person.photoUrl)) {
      const driveUrl = driveByEmail.get(localEmail);
      if (driveUrl) {
        person.photoUrl = driveUrl;
        restoredDrivePhoto += 1;
        updatedPhoto += 1;
        changed = true;
      }
    }

    // 2) Só substituir por Workspace se for HTTPS durável (Blob)
    try {
      const photoUrl = await resolveWorkspacePhotoUrl(
        remoteUser.email,
        remoteUser.thumbnailPhotoUrl,
      );
      if (
        photoUrl &&
        isDurableHttpsPhoto(photoUrl) &&
        person.photoUrl !== photoUrl
      ) {
        person.photoUrl = photoUrl;
        updatedPhoto += 1;
        changed = true;
      }
    } catch {
      // mantém foto local (Drive)
    }

    if (changed) {
      person.updatedAt = new Date().toISOString();
    } else {
      unchanged += 1;
    }
  }

  await saveStore(store);

  const matchedEmails = new Set(
    store.people
      .map((p) => (p.email || "").toLowerCase().trim())
      .filter(Boolean)
      .filter((e) => byEmail.has(e)),
  );

  return {
    matched,
    updatedTitle,
    updatedEmail,
    updatedPhone,
    updatedPhoto,
    restoredDrivePhoto,
    unchanged,
    googleUsers: remote.length,
    unmatchedLocal: store.people.length - matchedEmails.size,
  };
}
