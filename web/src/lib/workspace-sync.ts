import {
  listWorkspaceEmailsAndTitles,
  resolveWorkspacePhotoUrl,
} from "@/lib/google-workspace";
import { isDrivePhotoUrl } from "@/lib/photos";
import { getStore, saveStore } from "@/lib/storage";

export type WorkspaceSyncResult = {
  matched: number;
  updatedTitle: number;
  updatedEmail: number;
  updatedPhone: number;
  updatedPhoto: number;
  unchanged: number;
  googleUsers: number;
  unmatchedLocal: number;
};

/**
 * Atualiza email + cargo + telemóvel + foto a partir do Workspace.
 * Nomes e slugs ficam intactos. Match só por email.
 * Telefone/foto: só atualiza se o Google tiver valor (não apaga o local se vier vazio).
 */
export async function syncEmailsAndTitlesFromWorkspace(): Promise<WorkspaceSyncResult> {
  const remote = await listWorkspaceEmailsAndTitles();
  const byEmail = new Map(remote.map((u) => [u.email, u]));

  const store = await getStore();
  let matched = 0;
  let updatedTitle = 0;
  let updatedEmail = 0;
  let updatedPhone = 0;
  let updatedPhoto = 0;
  let unchanged = 0;

  for (const person of store.people) {
    const localEmail = (person.email || "").toLowerCase().trim();
    if (!localEmail) {
      unchanged += 1;
      continue;
    }

    const remoteUser = byEmail.get(localEmail);
    if (!remoteUser) {
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

    // Foto Workspace: substitui Drive/local quando o Directory tiver foto
    try {
      const photoUrl = await resolveWorkspacePhotoUrl(
        remoteUser.email,
        remoteUser.thumbnailPhotoUrl,
      );
      const shouldUpdatePhoto =
        photoUrl &&
        (person.photoUrl !== photoUrl || isDrivePhotoUrl(person.photoUrl));
      if (shouldUpdatePhoto) {
        person.photoUrl = photoUrl;
        updatedPhoto += 1;
        changed = true;
      }
    } catch {
      // mantém foto local se falhar
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
    unchanged,
    googleUsers: remote.length,
    unmatchedLocal: store.people.length - matchedEmails.size,
  };
}
