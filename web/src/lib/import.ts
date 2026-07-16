import type { Person, PersonInput } from "./types";

export type ImportRow = {
  email: string;
  name: string;
  title: string;
  photo: string;
};

/** Converte URL do Drive, ID, ou URL direta para link usável na assinatura. */
export function toPhotoUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://")) {
    const idFromDrive = extractDriveFileId(v);
    if (idFromDrive) {
      return `https://lh3.googleusercontent.com/d/${idFromDrive}=s400`;
    }
    return v;
  }

  // Só o ID do ficheiro no Drive
  return `https://lh3.googleusercontent.com/d/${v}=s400`;
}

export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function parseCsv(text: string): ImportRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = {
    email: findCol(header, ["email", "e-mail", "correio"]),
    name: findCol(header, ["name", "nome"]),
    title: findCol(header, ["title", "cargo", "funcao", "função"]),
    photo: findCol(header, [
      "photo",
      "foto",
      "photo_url",
      "photourl",
      "photo_id",
      "photoid",
      "drive_id",
      "driveid",
      "imagem",
    ]),
  };

  if (idx.name < 0 || idx.title < 0) {
    throw new Error("CSV precisa das colunas: nome, cargo (e idealmente email, foto)");
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[idx.name]?.trim();
    const title = cols[idx.title]?.trim();
    if (!name || !title) continue;

    rows.push({
      email: idx.email >= 0 ? cols[idx.email]?.trim().toLowerCase() || "" : "",
      name,
      title,
      photo: idx.photo >= 0 ? cols[idx.photo]?.trim() || "" : "",
    });
  }
  return rows;
}

function findCol(header: string[], aliases: string[]): number {
  for (const a of aliases) {
    const i = header.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function rowToPersonInput(
  row: ImportRow,
  fallbackPhotoUrl = "",
): PersonInput | null {
  const photoUrl = toPhotoUrl(row.photo) || fallbackPhotoUrl;
  if (!row.name || !row.title) return null;
  return {
    name: row.name,
    title: row.title,
    email: row.email,
    photoUrl,
    active: true,
  };
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export function mergeImport(
  existing: Person[],
  inputs: PersonInput[],
  mode: "skip" | "update",
): { people: Person[]; result: ImportResult } {
  const people = [...existing];
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const now = new Date().toISOString();

  for (const input of inputs) {
    const emailKey = (input.email || "").toLowerCase();
    const existingIdx = emailKey
      ? people.findIndex((p) => (p.email || "").toLowerCase() === emailKey)
      : people.findIndex(
          (p) => p.name.toLowerCase() === input.name.toLowerCase(),
        );

    if (existingIdx >= 0) {
      if (mode === "skip") {
        result.skipped++;
        continue;
      }
      people[existingIdx] = {
        ...people[existingIdx],
        name: input.name,
        title: input.title,
        email: input.email || people[existingIdx].email,
        photoUrl: input.photoUrl,
        active: true,
        updatedAt: now,
      };
      result.updated++;
      continue;
    }

    const base = input.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = base || "pessoa";
    let n = 2;
    while (people.some((p) => p.slug === slug)) {
      slug = `${base}-${n}`;
      n++;
    }

    people.push({
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      slug,
      name: input.name,
      title: input.title,
      email: input.email || "",
      photoUrl: input.photoUrl,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    result.created++;
  }

  return { people, result };
}
