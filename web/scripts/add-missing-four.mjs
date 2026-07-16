import { readFile, writeFile } from "fs/promises";

const extra = [
  ["filipa.lobo@comparaja.pt", "Filipa Lobo", "Gestora HL", ""],
  ["joao.martins@comparaja.pt", "João Martins", "Management Associate", ""],
  ["jose.freitas@comparaja.pt", "José Freitas", "Management Associate", ""],
  ["pedro.rodrigues@comparaja.pt", "Pedro Rodrigues", "Gestor de Cliente", ""],
];

function esc(s) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

let t = await readFile("data/import.csv", "utf8");
if (!t.endsWith("\n")) t += "\n";

for (const [email, nome, cargo, foto] of extra) {
  if (t.includes(email + ",")) continue;
  t += [email, esc(nome), esc(cargo), foto].join(",") + "\n";
}

await writeFile("data/import.csv", t, "utf8");
const n = t.trim().split(/\n/).length - 1;
console.log(`Total no CSV: ${n}`);
for (const [email, nome, cargo] of extra) {
  console.log(`${nome} | ${email} | ${cargo}`);
}
