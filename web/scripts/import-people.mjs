/**
 * Importa pessoas a partir de data/import.csv
 * Opcional: nomes de ficheiro em data/fotos/ para ajudar a preencher IDs
 *
 * Uso: node scripts/import-people.mjs
 */
import { readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "data", "import.csv");
const fotosDir = path.join(root, "data", "fotos");
const peoplePath = path.join(root, "data", "people.json");

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function toPhotoUrl(value) {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http")) {
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

const csv = await readFile(csvPath, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());

let fotoFiles = [];
try {
  fotoFiles = await readdir(fotosDir);
} catch {
  console.log("Pasta data/fotos/ não encontrada — usa coluna foto no CSV.");
}

const store = JSON.parse(await readFile(peoplePath, "utf8"));
let created = 0;
let updated = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  const row = Object.fromEntries(header.map((h, idx) => [h, cols[idx] || ""]));

  const name = row.nome || row.name;
  const title = row.cargo || row.title;
  const email = (row.email || "").toLowerCase();
  let photo = row.foto || row.photo || row.photo_id || "";

  if (!photo && email && fotoFiles.length) {
    const match = fotoFiles.find((f) => {
      const base = f.replace(/\.[^.]+$/, "").toLowerCase();
      return base === email || base === email.split("@")[0];
    });
    if (match) {
      console.warn(
        `⚠ ${name}: encontrada ${match} localmente — precisas do ID/URL do Drive no CSV para o email funcionar.`,
      );
    }
  }

  const photoUrl = toPhotoUrl(photo);
  if (!name || !title || !photoUrl) {
    console.warn(`Ignorado (falta dados): ${name || lines[i]}`);
    continue;
  }

  const idx = email
    ? store.people.findIndex((p) => (p.email || "").toLowerCase() === email)
    : store.people.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());

  const now = new Date().toISOString();
  if (idx >= 0) {
    store.people[idx] = {
      ...store.people[idx],
      name,
      title,
      email,
      photoUrl,
      updatedAt: now,
    };
    updated++;
  } else {
    const base = slugify(name);
    let slug = base;
    let n = 2;
    while (store.people.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
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

await writeFile(peoplePath, JSON.stringify(store, null, 2), "utf8");
console.log(`Feito: ${created} criados, ${updated} atualizados`);
