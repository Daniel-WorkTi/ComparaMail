/**
 * Lista fotos numa pasta pública do Google Drive (recursivo) e
 * cruza com import.csv para preencher a coluna foto com o file ID.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = process.argv[2] || "1fuYM2vWTOOVWynUSgHWZdk8CLK5c84Wo";
const DATA = path.join(__dirname, "..", "web", "data");
const OUT_PHOTOS = path.join(DATA, "drive-photos.json");
const OUT_CSV = path.join(DATA, "import.csv");
const OUT_MATCH = path.join(DATA, "foto-matches.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": UA, Accept: "text/html" }, timeout: 60000 },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(res.headers.location).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeName(s) {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&");
}

function parseEntries(page) {
  const re =
    /"([a-zA-Z0-9_-]{20,})"],null,null,null,"(application\/vnd\.google-apps\.[a-z]+|image\/[^"]+|application\/[^"]+|video\/[^"]+|text\/[^"]+)"[\s\S]{0,900}?\[\[\["([^"]+)"/g;
  const entries = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(page))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, mime: m[2], name: decodeName(m[3]) });
  }
  return entries;
}

async function listFolder(folderId) {
  const page = await fetch(`https://drive.google.com/drive/folders/${folderId}`);
  return parseEntries(page);
}

async function walk(folderId, folderPath = "") {
  const files = [];
  let entries;
  try {
    entries = await listFolder(folderId);
  } catch (err) {
    console.error(`ERROR ${folderPath || "/"}:`, err.message);
    return files;
  }
  console.log(`[${folderPath || "/"}] ${entries.length} entries`);

  for (const e of entries) {
    if (e.mime === "application/vnd.google-apps.folder") {
      await sleep(400);
      const next = folderPath ? `${folderPath}/${e.name}` : e.name;
      files.push(...(await walk(e.id, next)));
      continue;
    }
    if (e.mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(e.name)) {
      files.push({ id: e.id, name: e.name, path: folderPath, mime: e.mime });
    }
  }
  return files;
}

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stem(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  const header = lines[0];
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      email: (cols[0] || "").trim(),
      nome: (cols[1] || "").trim(),
      cargo: (cols[2] || "").trim(),
      foto: (cols[3] || "").trim(),
      raw: line,
    };
  });
  return { header, rows };
}

function scoreMatch(person, file) {
  const emailLocal = person.email.split("@")[0] || "";
  const nameN = normalize(person.nome);
  const fileN = normalize(stem(file.name));
  const emailN = normalize(emailLocal.replace(/\./g, " "));

  if (!fileN) return 0;
  if (fileN === nameN) return 100;
  if (fileN === emailN) return 95;
  if (normalize(stem(file.name).replace(/[_.-]/g, " ")) === nameN) return 90;

  // file contains first+last
  const parts = nameN.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (fileN.includes(first) && fileN.includes(last)) return 80;
    // first.last style
    if (fileN === `${first} ${last}`) return 85;
  }

  // email local parts in filename
  const emailParts = emailLocal.split(".").filter(Boolean);
  if (emailParts.length >= 2 && emailParts.every((p) => fileN.includes(normalize(p)))) {
    return 75;
  }

  // partial: all name tokens in file
  if (parts.length >= 2 && parts.every((p) => fileN.includes(p))) return 70;

  return 0;
}

function matchPhotos(rows, files) {
  const used = new Set();
  const matches = [];
  const unmatchedPeople = [];
  const unmatchedFiles = [];

  // greedy best match
  const candidates = [];
  for (const row of rows) {
    for (const file of files) {
      const score = scoreMatch(row, file);
      if (score > 0) candidates.push({ row, file, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const assignedPeople = new Set();
  for (const c of candidates) {
    const key = c.row.email || c.row.nome;
    if (assignedPeople.has(key) || used.has(c.file.id)) continue;
    if (c.score < 70) continue;
    assignedPeople.add(key);
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

  for (const row of rows) {
    const key = row.email || row.nome;
    if (!assignedPeople.has(key)) unmatchedPeople.push(row);
  }
  for (const f of files) {
    if (!used.has(f.id)) unmatchedFiles.push(f);
  }

  return { matches, unmatchedPeople, unmatchedFiles };
}

async function main() {
  console.log("Listing Drive folder", ROOT);
  const all = await walk(ROOT);
  const byId = new Map();
  for (const f of all) byId.set(f.id, f);
  const files = [...byId.values()].sort((a, b) =>
    `${a.path}/${a.name}`.localeCompare(`${b.path}/${b.name}`, "pt"),
  );

  fs.writeFileSync(OUT_PHOTOS, JSON.stringify(files, null, 2), "utf8");
  console.log(`\nTotal photos: ${files.length}`);
  console.log(`Wrote ${OUT_PHOTOS}`);

  const csvText = fs.readFileSync(OUT_CSV, "utf8");
  const { header, rows } = parseCsv(csvText);
  console.log(`CSV people: ${rows.length}`);

  const { matches, unmatchedPeople, unmatchedFiles } = matchPhotos(rows, files);
  console.log(`Matched: ${matches.length}`);
  console.log(`Unmatched people: ${unmatchedPeople.length}`);
  console.log(`Unmatched photos: ${unmatchedFiles.length}`);

  fs.writeFileSync(
    OUT_MATCH,
    JSON.stringify({ matches, unmatchedPeople, unmatchedFiles }, null, 2),
    "utf8",
  );

  // Update CSV foto column
  const byEmail = new Map(matches.map((m) => [m.email.toLowerCase(), m.fotoId]));
  const byName = new Map(matches.map((m) => [normalize(m.nome), m.fotoId]));
  const outLines = [header.includes("foto") ? header : "email,nome,cargo,foto"];
  for (const row of rows) {
    const id =
      byEmail.get(row.email.toLowerCase()) ||
      byName.get(normalize(row.nome)) ||
      row.foto ||
      "";
    outLines.push(`${row.email},${row.nome},${row.cargo},${id}`);
  }
  fs.writeFileSync(OUT_CSV, outLines.join("\n") + "\n", "utf8");
  console.log(`Updated ${OUT_CSV}`);

  if (unmatchedPeople.length) {
    console.log("\nSem foto:");
    for (const p of unmatchedPeople) console.log(`  - ${p.nome} <${p.email}>`);
  }
  if (unmatchedFiles.length) {
    console.log("\nFotos sem pessoa:");
    for (const f of unmatchedFiles.slice(0, 40)) {
      console.log(`  - ${f.path}/${f.name} (${f.id})`);
    }
    if (unmatchedFiles.length > 40) {
      console.log(`  ... +${unmatchedFiles.length - 40}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
