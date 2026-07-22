const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "people.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const emails = new Set([
  "neuza.borges@comparaja.pt",
  "joao.silva@comparaja.pt",
  "tania.barata@comparaja.pt",
]);

const title = "Partnerships Manager";
const found = [];
const missing = new Set(emails);

function norm(email) {
  return (email || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

for (const person of data.people) {
  const e = norm(person.email);
  if (!emails.has(e)) continue;
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

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ updated: found.length, found, missing: [...missing] }, null, 2));
