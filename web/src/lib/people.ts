import type { CompanySettings, Person, PersonInput } from "./types";
import { getStore, saveStore } from "./storage";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(base: string, people: Person[], ignoreId?: string): string {
  let slug = base || "pessoa";
  let i = 2;
  while (people.some((p) => p.slug === slug && p.id !== ignoreId)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

export async function listPeople(includeInactive = false): Promise<Person[]> {
  const store = await getStore();
  const people = store.people.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return includeInactive ? people : people.filter((p) => p.active);
}

export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const store = await getStore();
  return store.people.find((p) => p.slug === slug && p.active) || null;
}

export async function getPersonByEmail(email: string): Promise<Person | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;
  const store = await getStore();
  return (
    store.people.find((p) => p.active && (p.email || "").toLowerCase() === normalized) ||
    null
  );
}

export async function getSettings(): Promise<CompanySettings> {
  const store = await getStore();
  return store.settings;
}

export async function updateSettings( partial: Partial<CompanySettings>): Promise<CompanySettings> {
  const store = await getStore();
  store.settings = { ...store.settings, ...partial };
  await saveStore(store);
  return store.settings;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const store = await getStore();
  const now = new Date().toISOString();
  const base = slugify(input.slug || input.name);
  const person: Person = {
    id: `p_${Date.now().toString(36)}`,
    slug: uniqueSlug(base, store.people),
    name: input.name.trim(),
    title: input.title.trim(),
    email: input.email?.trim() || "",
    photoUrl: input.photoUrl.trim(),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  store.people.push(person);
  await saveStore(store);
  return person;
}

export async function updatePerson(id: string, input: Partial<PersonInput>): Promise<Person> {
  const store = await getStore();
  const idx = store.people.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Pessoa não encontrada");

  const current = store.people[idx];
  const nextName = input.name?.trim() ?? current.name;
  const nextSlugBase = slugify(input.slug || nextName);

  const updated: Person = {
    ...current,
    name: nextName,
    title: input.title?.trim() ?? current.title,
    email: input.email !== undefined ? input.email.trim() : current.email,
    photoUrl: input.photoUrl?.trim() ?? current.photoUrl,
    slug:
      input.slug !== undefined || input.name !== undefined
        ? uniqueSlug(nextSlugBase, store.people, id)
        : current.slug,
    active: input.active ?? current.active,
    updatedAt: new Date().toISOString(),
  };

  store.people[idx] = updated;
  await saveStore(store);
  return updated;
}

export async function deletePerson(id: string): Promise<void> {
  const store = await getStore();
  store.people = store.people.filter((p) => p.id !== id);
  await saveStore(store);
}
