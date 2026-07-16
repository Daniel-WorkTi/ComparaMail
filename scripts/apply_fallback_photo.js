/**
 * Atribui imagem fallback aos funcionários sem foto.
 */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "web", "data");
const CSV_PATH = path.join(DATA, "import.csv");
const PEOPLE_PATH = path.join(DATA, "people.json");
const FALLBACK_ID = "1vFq9Q6cFyl78OPvFlxK7tTjn-82aJnck";
const FALLBACK_URL = `https://lh3.googleusercontent.com/d/${FALLBACK_ID}=s400`;

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const first = line.indexOf(",");
    const second = line.indexOf(",", first + 1);
    const last = line.lastIndexOf(",");
    rows.push({
      email: line.slice(0, first).trim(),
      nome: line.slice(first + 1, second).trim(),
      cargo: line.slice(second + 1, last).trim(),
      foto: line.slice(last + 1).trim(),
    });
  }
  return rows;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const filled = [];
  for (const row of rows) {
    if (!row.foto) {
      row.foto = FALLBACK_ID;
      filled.push(row.nome);
    }
  }

  const out = ["email,nome,cargo,foto"];
  for (const r of rows) {
    const cargo =
      r.cargo.includes(",") || r.cargo.includes('"')
        ? `"${r.cargo.replace(/"/g, '""')}"`
        : r.cargo;
    out.push(`${r.email},${r.nome},${cargo},${r.foto}`);
  }
  fs.writeFileSync(CSV_PATH, out.join("\n") + "\n", "utf8");

  const store = JSON.parse(fs.readFileSync(PEOPLE_PATH, "utf8"));
  const now = new Date().toISOString();
  const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));
  let peopleUpdated = 0;

  for (const p of store.people) {
    const row = byEmail.get((p.email || "").toLowerCase());
    if (!row) continue;
    const url = `https://lh3.googleusercontent.com/d/${row.foto}=s400`;
    if (p.photoUrl !== url) {
      p.photoUrl = url;
      p.updatedAt = now;
      peopleUpdated++;
    }
  }

  fs.writeFileSync(PEOPLE_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");

  console.log(`Fallback ID: ${FALLBACK_ID}`);
  console.log(`Pessoas preenchidas: ${filled.length}`);
  for (const n of filled) console.log(`  - ${n}`);
  console.log(`people.json atualizados: ${peopleUpdated}`);
  console.log(`Total com foto: ${rows.filter((r) => r.foto).length}/${rows.length}`);
}

main();
