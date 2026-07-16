/**
 * Rematch drive-photos.json -> import.csv with stricter name matching.
 * Prefer exact / email / first+last tokens; ignore "Copy of" and numbered duplicates when better exists.
 */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "web", "data");
const PHOTOS = JSON.parse(fs.readFileSync(path.join(DATA, "drive-photos.json"), "utf8"));
const CSV_PATH = path.join(DATA, "import.csv");
const OUT_MATCH = path.join(DATA, "foto-matches.json");

/** Manual overrides: email -> drive file id (or filename fragment) */
const MANUAL = {
  // typo no Drive: anna-loyla
  "anna.loyola@comparaja.pt": "anna-loyla",
  // já conhecido
  "daniel.maia@comparaja.pt": "1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ",
  "bernardo.aguamel@comparaja.pt": "bernardo-mel",
  // SEGUROS/mafalda.png (nome só)
  "mafalda.amaral@comparaja.pt": "mafalda.png",
  // Ana Mafalda Soares → mafalda-soares.png
  "ana.soares@comparaja.pt": "mafalda-soares.png",
};

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(s) {
  return normalize(s).split(" ").filter((t) => t.length > 1);
}

function stem(filename) {
  let s = filename.replace(/\.[^.]+$/, "");
  s = s.replace(/^copy of\s+/i, "");
  s = s.replace(/\s*\(\d+\)\s*$/, "");
  s = s.replace(/[-_]\d+$/, ""); // ana-sofia-silva-2
  return s;
}

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());
  const header = lines[0];
  const rows = lines.slice(1).map((line) => {
    // simple CSV: email,nome,cargo,foto — cargo may have commas? rare
    const first = line.indexOf(",");
    const second = line.indexOf(",", first + 1);
    const last = line.lastIndexOf(",");
    if (first < 0 || second < 0 || last <= second) {
      const cols = line.split(",");
      return {
        email: (cols[0] || "").trim(),
        nome: (cols[1] || "").trim(),
        cargo: (cols[2] || "").trim(),
        foto: (cols[3] || "").trim(),
      };
    }
    return {
      email: line.slice(0, first).trim(),
      nome: line.slice(first + 1, second).trim(),
      cargo: line.slice(second + 1, last).trim(),
      foto: line.slice(last + 1).trim(),
    };
  });
  return { header, rows };
}

function fileQuality(file) {
  let q = 0;
  if (/^copy of /i.test(file.name)) q -= 20;
  if (/-\d+\.(png|jpe?g|webp)$/i.test(file.name)) q -= 5;
  if (/^\d+\.(png|jpe?g)$/i.test(file.name)) q -= 50;
  return q;
}

function scoreMatch(person, file) {
  const emailLocal = (person.email.split("@")[0] || "").toLowerCase();
  const nameToks = tokens(person.nome);
  const fileToks = tokens(stem(file.name));
  const emailToks = tokens(emailLocal.replace(/\./g, " "));
  const fileSet = new Set(fileToks);
  const fileJoined = fileToks.join(" ");
  const nameJoined = nameToks.join(" ");
  const emailJoined = emailToks.join(" ");

  let score = 0;

  // exact name
  if (fileJoined === nameJoined) score = 100;
  else if (fileJoined === emailJoined) score = 98;
  else if (
    nameToks.length >= 2 &&
    nameToks.every((t) => fileSet.has(t)) &&
    fileToks.every((t) => nameToks.includes(t) || /^\d+$/.test(t))
  ) {
    score = 96; // same tokens (ignore numeric suffixes already stripped)
  } else if (nameToks.length >= 2) {
    const first = nameToks[0];
    const last = nameToks[nameToks.length - 1];
    // Require token equality for first and last (not substring!)
    const hasFirst = fileSet.has(first);
    const hasLast = fileSet.has(last);
    if (hasFirst && hasLast) {
      // penalize if file has an extra distinct given name not in person
      const extra = fileToks.filter(
        (t) => !nameToks.includes(t) && !/^\d+$/.test(t) && t.length > 2,
      );
      score = extra.length ? 72 : 90;
    } else if (emailToks.length >= 2 && emailToks.every((t) => fileSet.has(t))) {
      score = 88;
    } else if (hasLast && nameToks.filter((t) => fileSet.has(t)).length >= 2) {
      score = 78;
    }
  } else if (nameToks.length === 1 && fileSet.has(nameToks[0])) {
    score = 60;
  }

  // email local as hyphenated in file
  if (score < 95) {
    const emailAsFile = normalize(emailLocal.replace(/\./g, "-"));
    if (normalize(stem(file.name).replace(/[_.]/g, "-")) === emailAsFile) {
      score = Math.max(score, 97);
    }
  }

  if (score > 0) score += fileQuality(file);
  return score;
}

function resolveManual(person, files) {
  const key = person.email.toLowerCase();
  const hint = MANUAL[key];
  if (!hint) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(hint) && !hint.includes(" ")) {
    // raw id
    const byId = files.find((f) => f.id === hint);
    if (byId) return { file: byId, score: 100, manual: true };
    return { file: { id: hint, name: "(manual id)", path: "" }, score: 100, manual: true };
  }
  const hintN = normalize(hint);
  const file = files.find((f) => normalize(f.name).includes(hintN) || normalize(stem(f.name)) === hintN);
  if (file) return { file, score: 99, manual: true };
  return null;
}

function matchAll(rows, files) {
  const used = new Set();
  const assigned = new Set();
  const matches = [];

  // 1) manuals first
  for (const row of rows) {
    const man = resolveManual(row, files);
    if (!man) continue;
    const key = row.email.toLowerCase();
    if (assigned.has(key)) continue;
    if (man.file.id && used.has(man.file.id) && man.file.name !== "(manual id)") continue;
    assigned.add(key);
    if (man.file.id) used.add(man.file.id);
    matches.push({
      email: row.email,
      nome: row.nome,
      fotoId: man.file.id,
      fileName: man.file.name,
      path: man.file.path || "",
      score: man.score,
      manual: true,
    });
  }

  const candidates = [];
  for (const row of rows) {
    if (assigned.has(row.email.toLowerCase())) continue;
    for (const file of files) {
      if (used.has(file.id)) continue;
      const score = scoreMatch(row, file);
      if (score >= 78) candidates.push({ row, file, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || fileQuality(b.file) - fileQuality(a.file));

  for (const c of candidates) {
    const key = c.row.email.toLowerCase();
    if (assigned.has(key) || used.has(c.file.id)) continue;
    assigned.add(key);
    used.add(c.file.id);
    matches.push({
      email: c.row.email,
      nome: c.row.nome,
      fotoId: c.file.id,
      fileName: c.file.name,
      path: c.file.path,
      score: c.score,
    });
  }

  const unmatchedPeople = rows.filter((r) => !assigned.has(r.email.toLowerCase()));
  const unmatchedFiles = files.filter((f) => !used.has(f.id));
  return { matches, unmatchedPeople, unmatchedFiles };
}

function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  // Re-read original people without relying on previous foto fills for matching,
  // but keep Daniel's known id via MANUAL.
  const { header, rows } = parseCsv(csvText);

  // Reset foto for rematch except known stable ones we want to keep if unmatched
  for (const r of rows) {
    if (r.email === "daniel.maia@comparaja.pt") continue;
    r.foto = "";
  }

  const { matches, unmatchedPeople, unmatchedFiles } = matchAll(rows, PHOTOS);

  console.log(`Photos: ${PHOTOS.length}`);
  console.log(`People: ${rows.length}`);
  console.log(`Matched: ${matches.length}`);
  console.log(`Unmatched people: ${unmatchedPeople.length}`);
  console.log(`Unmatched photos: ${unmatchedFiles.length}`);

  fs.writeFileSync(
    OUT_MATCH,
    JSON.stringify(
      {
        matches,
        unmatchedPeople: unmatchedPeople.map((p) => ({
          email: p.email,
          nome: p.nome,
          cargo: p.cargo,
        })),
        unmatchedFiles: unmatchedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          path: f.path,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  const byEmail = new Map(matches.map((m) => [m.email.toLowerCase(), m.fotoId]));
  const out = [header.startsWith("email") ? "email,nome,cargo,foto" : header];
  for (const row of rows) {
    const id = byEmail.get(row.email.toLowerCase()) || "";
    out.push(`${row.email},${row.nome},${row.cargo},${id}`);
  }
  fs.writeFileSync(CSV_PATH, out.join("\n") + "\n", "utf8");

  console.log("\nSem foto (" + unmatchedPeople.length + "):");
  for (const p of unmatchedPeople) console.log(`  - ${p.nome}`);

  console.log("\nFotos livres (amostra):");
  for (const f of unmatchedFiles.slice(0, 25)) {
    console.log(`  - ${f.path}/${f.name}`);
  }
  if (unmatchedFiles.length > 25) console.log(`  ... +${unmatchedFiles.length - 25}`);

  // suspicious low scores
  const weak = matches.filter((m) => m.score < 88 && !m.manual);
  if (weak.length) {
    console.log("\nMatches fracos (rever):");
    for (const m of weak) {
      console.log(`  ${m.nome} <- ${m.path}/${m.fileName} (score ${m.score})`);
    }
  }
}

main();
