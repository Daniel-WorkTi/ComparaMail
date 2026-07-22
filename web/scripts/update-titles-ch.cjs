const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "people.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const TITLE_MALE = "Gestor Especializado de Crédito Habitação";
const TITLE_FEMALE = "Gestora Especializada de Crédito Habitação";

/** email → cargo singular (masculino / feminino) */
const byEmail = {
  "claudia.fonseca@comparaja.pt": TITLE_FEMALE,
  "daire.goncalves@comparaja.pt": TITLE_MALE,
  "filipa.lobo@comparaja.pt": TITLE_FEMALE,
  "joao.bastos@comparaja.pt": TITLE_MALE,
  "jorge.luis@comparaja.pt": TITLE_MALE,
  "mariana.morais@comparaja.pt": TITLE_FEMALE,
  "noelma.mendes@comparaja.pt": TITLE_FEMALE,
  "pedro.rodrigues@comparaja.pt": TITLE_MALE,
  "pedro.neto@comparaja.pt": TITLE_MALE,
};

const found = [];
const missing = new Set(Object.keys(byEmail));

function norm(email) {
  return (email || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

for (const person of data.people) {
  const e = norm(person.email);
  const title = byEmail[e];
  if (!title) continue;
  found.push({
    email: person.email,
    name: person.name,
    before: person.title,
    after: title,
  });
  person.title = title;
  person.updatedAt = new Date().toISOString();
  missing.delete(e);
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  JSON.stringify({ updated: found.length, found, missing: [...missing] }, null, 2),
);
