const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const store = JSON.parse(
  fs.readFileSync(path.join(root, "data", "people.json"), "utf8"),
);
const text = fs.readFileSync(path.join(root, "data", "import.csv"), "utf8");

/** Minimal CSV parser (same rules as import.ts). */
function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  function splitRow(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = splitRow(line);
    rows.push({
      email: (cols[0] || "").trim(),
      name: (cols[1] || "").trim(),
      title: (cols[2] || "").trim(),
      photo: (cols[3] || "").trim(),
    });
  }
  return rows;
}

function toUrl(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=s400`;
    return v;
  }
  if (/^[a-zA-Z0-9_-]{20,120}$/.test(v)) {
    return `https://lh3.googleusercontent.com/d/${v}=s400`;
  }
  return "";
}

function fragile(u) {
  u = (u || "").toLowerCase();
  return (
    !u ||
    u.includes("workspace-photos") ||
    u.startsWith("wphoto:") ||
    u.includes("localhost")
  );
}

const byEmail = {};
for (const row of parseCsv(text)) {
  const email = row.email.toLowerCase();
  const url = toUrl(row.photo);
  if (email && url) byEmail[email] = url;
}

let n = 0;
for (const p of store.people) {
  const e = (p.email || "").toLowerCase();
  if (!fragile(p.photoUrl)) continue;
  const url = byEmail[e];
  if (!url) continue;
  p.photoUrl = url;
  p.updatedAt = new Date().toISOString();
  n += 1;
}

fs.writeFileSync(
  path.join(root, "data", "people.json"),
  `${JSON.stringify(store, null, 2)}\n`,
);

const kinds = {};
for (const p of store.people) {
  const u = p.photoUrl || "";
  let k = "other";
  if (u.includes("lh3") || u.includes("drive")) k = "drive";
  else if (u.includes("workspace-photos")) k = "local";
  else if (u.startsWith("wphoto:")) k = "wphoto";
  else if (!u) k = "empty";
  kinds[k] = (kinds[k] || 0) + 1;
}

console.log("restored", n, "kinds", kinds, "csvDrive", Object.keys(byEmail).length);
