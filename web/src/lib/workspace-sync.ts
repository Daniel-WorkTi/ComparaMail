import { readFile } from "fs/promises";
import path from "path";
import {
  listWorkspaceEmailsAndTitles,
  resolveWorkspacePhotoUrl,
  updateWorkspaceUserTitle,
  assertDirectoryWriteAccess,
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

export type WorkspacePushTitlesResult = {
  updated: number;
  skipped: number;
  failed: string[];
  googleUsers: number;
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
 * Atualiza email + telemóvel + foto a partir do Workspace.
 * Nomes, slugs e cargos locais ficam intactos (cargos sobem com pushTitlesToWorkspace).
 */
export async function syncEmailsAndTitlesFromWorkspace(): Promise<WorkspaceSyncResult> {
  const remote = await listWorkspaceEmailsAndTitles();
  const byEmail = new Map(remote.map((u) => [u.email, u]));
  const driveByEmail = await drivePhotosFromImportCsv();

  const store = await getStore();
  let matched = 0;
  const updatedTitle = 0;
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

    // Cargos: a app é a fonte de verdade (não sobrescrever no pull)

    if (remoteUser.phone && (person.phone || "") !== remoteUser.phone) {
      person.phone = remoteUser.phone;
      updatedPhone += 1;
      changed = true;
    }

    if (isFragilePhotoUrl(person.photoUrl)) {
      const driveUrl = driveByEmail.get(localEmail);
      if (driveUrl) {
        person.photoUrl = driveUrl;
        restoredDrivePhoto += 1;
        updatedPhoto += 1;
        changed = true;
      }
    }

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

/**
 * Envia os cargos da app para o Google Workspace Directory
 * (substitui organizations.title no perfil do user).
 */
export async function pushTitlesToWorkspace(): Promise<WorkspacePushTitlesResult> {
  // Falha cedo e com mensagem clara se faltar o scope de escrita
  await assertDirectoryWriteAccess();

  const remote = await listWorkspaceEmailsAndTitles();
  const byEmail = new Map(remote.map((u) => [u.email, u]));
  const store = await getStore();

  let updated = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const person of store.people) {
    const email = (person.email || "").toLowerCase().trim();
    const title = (person.title || "").trim();
    if (!email || !title) {
      skipped += 1;
      continue;
    }
    if (!byEmail.has(email)) {
      skipped += 1;
      continue;
    }
    const remoteTitle = (byEmail.get(email)?.title || "").trim();
    if (remoteTitle === title) {
      skipped += 1;
      continue;
    }
    try {
      await updateWorkspaceUserTitle(email, title);
      updated += 1;
    } catch (err) {
      failed.push(
        `${email}: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      );
    }
  }

  if (updated === 0 && failed.length > 0) {
    throw new Error(
      `Nenhum cargo actualizado. Exemplo: ${failed[0].slice(0, 220)}`,
    );
  }

  return {
    updated,
    skipped,
    failed: failed.slice(0, 15),
    googleUsers: remote.length,
  };
}
