import { readFile, writeFile } from "fs/promises";

function splitCsvLine(line) {
  const out = [];
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

function toPhotoUrl(value, fallback) {
  const v = (value || "").trim();
  if (!v) return fallback;
  if (v.startsWith("http://") || v.startsWith("https://")) {
    const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/) || v.match(/id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=s400`;
    return v;
  }
  return `https://lh3.googleusercontent.com/d/${v}=s400`;
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const csv = await readFile("data/import.csv", "utf8");
const store = JSON.parse(await readFile("data/people.json", "utf8"));
const fallback = store.settings.logoUrl;

const lines = csv
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
const idx = {
  email: header.indexOf("email"),
  name: header.indexOf("nome") >= 0 ? header.indexOf("nome") : header.indexOf("name"),
  title: header.indexOf("cargo") >= 0 ? header.indexOf("cargo") : header.indexOf("title"),
  photo: header.indexOf("foto") >= 0 ? header.indexOf("foto") : header.indexOf("photo"),
};

let created = 0;
let updated = 0;
const now = new Date().toISOString();

for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  const email = (cols[idx.email] || "").toLowerCase();
  const name = cols[idx.name] || "";
  const title = cols[idx.title] || "";
  const photoUrl = toPhotoUrl(cols[idx.photo] || "", fallback);
  if (!name || !title) continue;

  const existingIdx = email
    ? store.people.findIndex((p) => (p.email || "").toLowerCase() === email)
    : store.people.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());

  if (existingIdx >= 0) {
    store.people[existingIdx] = {
      ...store.people[existingIdx],
      name,
      title,
      email,
      photoUrl,
      active: true,
      updatedAt: now,
    };
    updated++;
  } else {
    const base = slugify(name) || "pessoa";
    let slug = base;
    let n = 2;
    while (store.people.some((p) => p.slug === slug)) {
      slug = `${base}-${n++}`;
    }
    store.people.push({
      id: `p_${Date.now().toString(36)}_${i}`,
      slug,
      name,
      title,
      email,
      photoUrl,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
}

await writeFile("data/people.json", JSON.stringify(store, null, 2), "utf8");
console.log(`Criados: ${created}`);
console.log(`Atualizados: ${updated}`);
console.log(`Total no sistema: ${store.people.length}`);

// Manter só quem está no CSV (lista oficial)
const emailsInCsv = new Set();
for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  const email = (cols[idx.email] || "").toLowerCase();
  if (email) emailsInCsv.add(email);
}
const before = store.people.length;
store.people = store.people.filter((p) => emailsInCsv.has((p.email || "").toLowerCase()));
const removed = before - store.people.length;
await writeFile("data/people.json", JSON.stringify(store, null, 2), "utf8");
console.log(`Removidos (fora da lista): ${removed}`);
console.log(`Total final: ${store.people.length}`);
