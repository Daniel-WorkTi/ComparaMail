import { readFile, writeFile } from "fs/promises";

const PARTICLES = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os"]);

/** Correções pontuais por email (fonte de verdade). */
const OVERRIDES = new Map([
  ["farid.mia@comparaja.pt", "Farid Mia"],
  ["martin@comparaja.pt", "Martin Fjordvald"],
  ["joao.rodrigues@comparaja.pt", "João Miguel Rodrigues"],
  ["joao.silva@comparaja.pt", "João Pedro Silva"],
]);

/** Palavras PT com acento (sem acentos → forma correta). */
const ACCENTS = {
  agata: "Ágata",
  "agua-mel": "Água-Mel",
  alcantara: "Alcântara",
  andre: "André",
  antonio: "António",
  assuncao: "Assunção",
  barao: "Barão",
  barbara: "Bárbara",
  catia: "Cátia",
  claudia: "Cláudia",
  conceicao: "Conceição",
  cristovao: "Cristóvão",
  daire: "Dairé",
  goncalo: "Gonçalo",
  goncalves: "Gonçalves",
  helio: "Hélio",
  ines: "Inês",
  jessica: "Jéssica",
  joao: "João",
  jose: "José",
  lourenco: "Lourenço",
  luis: "Luís",
  marcio: "Márcio",
  melanie: "Mélanie",
  monica: "Mónica",
  natalia: "Natália",
  novoa: "Nóvoa",
  patricia: "Patrícia",
  simoes: "Simões",
  tania: "Tânia",
  valeria: "Valéria",
  vania: "Vânia",
  varzea: "Várzea",
  virgilio: "Virgílio",
};

function strip(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function fixWord(word, index) {
  if (!word) return word;
  if (word.includes("-")) {
    return word
      .split("-")
      .map((w, i) => fixWord(w, index + i))
      .join("-");
  }
  const key = strip(word);
  if (PARTICLES.has(key) && index > 0) return key;
  if (ACCENTS[key]) return ACCENTS[key];
  const lower = word.toLocaleLowerCase("pt-PT");
  return lower.charAt(0).toLocaleUpperCase("pt-PT") + lower.slice(1);
}

function formatName(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => fixWord(w, i))
    .join(" ");
}

function splitCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      cur += ch;
      continue;
    }
    if (ch === "," && !inQ) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

const store = JSON.parse(await readFile("data/people.json", "utf8"));
const changes = [];

for (const p of store.people) {
  const email = (p.email || "").toLowerCase();
  const before = p.name;
  const after = formatName(OVERRIDES.get(email) || before);
  if (after !== before) {
    changes.push({ email, before, after });
    p.name = after;
    p.updatedAt = new Date().toISOString();
  }
}

store.updatedAt = new Date().toISOString();
await writeFile("data/people.json", JSON.stringify(store, null, 2), "utf8");

const csv = await readFile("data/import.csv", "utf8");
const lines = csv.split(/\r?\n/);
const byEmail = new Map(
  store.people.map((p) => [(p.email || "").toLowerCase(), p.name]),
);
const out = [lines[0]];

for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const cols = splitCsvLine(line);
  const email = cols[0].toLowerCase();
  if (byEmail.has(email)) cols[1] = byEmail.get(email);
  out.push(cols.join(","));
}

await writeFile("data/import.csv", out.join("\n") + "\n", "utf8");

console.log("Alterações:", changes.length);
for (const c of changes) console.log(`${c.before} => ${c.after}`);
