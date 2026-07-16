import { readFile, writeFile } from "fs/promises";

const wanted = `
Adryana Mayara
Ágata Mendes
Ana Isabel Ferreira
Ana Mafalda Soares
Ana Sofia Silva
André Assis
André Nunes
Aneta Rafajlovska
Anna Loyola
António Marques
António Rebelo
António Santos
Arthur Almeida
Bárbara Martins
Beatriz Barbosa
Beatriz Batista
Benedita Quintanilha
Bernardo Dias
Bernardo Silva
Bernardo Água-Mel
Bruna Passos
Bruno Siqueira
Carlos Ribeiro
Carolina Knotz
Carolina Matos
Caroline Moraes
Caroline Serafim
Catarina Amorim
Catarina Cardoso
Catarina Cota
Catarina Virgílio
Cláudia Fonseca
Cláudia Monteiro
Cristina Folgado
Cátia Gouveia
Cátia Lourenço
Dairé Gonçalves
Daniel Maia
Daniela Ferreira
David Pedro
Diogo Barão
Diogo Couto
Diogo Luís
Diogo Nunes
Dominykas Juodis
Farid Temporário
Filipa Lobo
Filipe Leite
Giovana Dantas
Gonçalo Cascais
Gonçalo Monjardino
Hélio Alhada
Inês Cristóvão
Inês Ferreira Várzea
Irene Silva
Jéssica Miranda
Joana Silva
Joana Soares
João André
João Bastos
João Borges
João Martins
João Rodrigues
João Silva
Jorge Luís
Jorge Rebelo
José Freitas
José Silva
Leandro Teixeira
Leonardo Amorim
Leonor Santos
Lourenço Parente
Luís Nunes
Madalena Alves
Madalena Amorim
Mafalda Amaral
Márcio Pinheiro
Maria Silva
Mariana Lapas
Mariana Morais
Mariana Moura
Martim Matos
Martin F
Mélanie Rodrigues
Mélanie Silva
Michely Assunção
Mónica Machado
Natália Fanzeres
Natália Oliveira
Neuza Borges
Noelma Mendes
Nuno Conceição
Patrícia Lopes
Paula Camocardi
Pedro Cruz
Pedro Mendes de Almeida
Pedro Neto
Pedro Rodrigues
Piera Borges
Rafaela Alcântara
Raquel Simões
Ricardo Feferbaum
Rita Silva
Rita Sogalho
Rodrigo Gameiro
Rui Ventura
Sara Correia
Sara Henriques
Sofia Croft
Sophia Nóvoa
Stefany Mendes
Susana Pedro
Tânia Arraiolos
Tânia Barata
Teresa Jorge
Valderene Almeida
Valéria Neta
Vanessa Sanches
Vânia Alexandre
Vera Luís
Vera Peixoto
Wendy Lima
`
  .trim()
  .split(/\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const csv = await readFile("data/import.csv", "utf8");
const existing = csv
  .trim()
  .split(/\n/)
  .slice(1)
  .map((line) => {
    const cols = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        cols.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    return {
      email: cols[0],
      name: cols[1],
      title: cols[2],
      photo: cols[3] || "",
    };
  });

function norm(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const aliases = {
  "farid temporario": ["farid mia"],
  "ines ferreira varzea": ["ines ferreira"],
  "joao rodrigues": ["joao miguel rodrigues"],
  "joao silva": ["joao pedro silva"],
  "martin f": ["martin fjordvald"],
  "pedro mendes de almeida": ["pedro mendes"],
};

const byName = new Map();
for (const p of existing) {
  byName.set(norm(p.name), p);
}

function esc(s) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const found = [];
const missing = [];
const usedEmails = new Set();

for (const name of wanted) {
  const n = norm(name);
  let match = byName.get(n);

  if (!match && aliases[n]) {
    for (const a of aliases[n]) {
      match = byName.get(a);
      if (match) break;
    }
  }

  if (!match) {
    const candidates = existing.filter((p) => {
      const pn = norm(p.name);
      return (
        pn === n ||
        pn.startsWith(n + " ") ||
        n.startsWith(pn + " ") ||
        (pn.includes(n) && n.length > 8) ||
        (n.includes(pn) && pn.length > 8)
      );
    });
    if (candidates.length === 1) match = candidates[0];
  }

  if (!match) {
    missing.push(name);
    continue;
  }

  if (usedEmails.has(match.email)) {
    missing.push(`${name} (conflito: ${match.email} já usado por ${match.name})`);
    continue;
  }

  usedEmails.add(match.email);
  found.push({
    email: match.email,
    name,
    title: match.title,
    photo:
      match.email === "daniel.maia@comparaja.pt"
        ? "1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ"
        : match.photo || "",
    matchedFrom: match.name,
  });
}

const lines = ["email,nome,cargo,foto"];
for (const p of found) {
  lines.push([p.email, esc(p.name), esc(p.title), p.photo].join(","));
}
await writeFile("data/import.csv", lines.join("\n") + "\n", "utf8");

console.log(`Pedidos: ${wanted.length}`);
console.log(`Encontrados: ${found.length}`);
console.log(`Em falta: ${missing.length}`);
if (missing.length) {
  console.log("\nSEM EMAIL/CARGO NO SISTEMA:");
  for (const m of missing) console.log(" - " + m);
}
console.log("\nNomes ajustados:");
for (const p of found) {
  if (norm(p.name) !== norm(p.matchedFrom)) {
    console.log(` - ${p.name} <= ${p.matchedFrom} <${p.email}>`);
  }
}
