/**
 * Aplica IDs de foto do import.csv ao people.json (update mode).
 */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "web", "data");
const csv = fs.readFileSync(path.join(DATA, "import.csv"), "utf8");
const store = JSON.parse(fs.readFileSync(path.join(DATA, "people.json"), "utf8"));

function toPhotoUrl(id) {
  const v = (id || "").trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return `https://lh3.googleusercontent.com/d/${v}=s400`;
}

const lines = csv.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
const byEmail = new Map();
for (const line of lines.slice(1)) {
  const last = line.lastIndexOf(",");
  const first = line.indexOf(",");
  const second = line.indexOf(",", first + 1);
  const email = line.slice(0, first).trim().toLowerCase();
  const nome = line.slice(first + 1, second).trim();
  const cargo = line.slice(second + 1, last).trim();
  const foto = line.slice(last + 1).trim();
  byEmail.set(email, { nome, cargo, foto });
}

let updated = 0;
let withPhoto = 0;
let withoutPhoto = 0;
const now = new Date().toISOString();

for (const p of store.people) {
  const row = byEmail.get((p.email || "").toLowerCase());
  if (!row) continue;
  const url = toPhotoUrl(row.foto);
  if (url) {
    if (p.photoUrl !== url) {
      p.photoUrl = url;
      p.updatedAt = now;
      updated++;
    }
    withPhoto++;
  } else {
    withoutPhoto++;
  }
}

fs.writeFileSync(path.join(DATA, "people.json"), JSON.stringify(store, null, 2) + "\n", "utf8");
console.log(`people.json: ${store.people.length} pessoas`);
console.log(`Com foto no CSV: ${withPhoto}`);
console.log(`Sem foto no CSV: ${withoutPhoto}`);
console.log(`photoUrl atualizados: ${updated}`);
