import { readFile, writeFile } from "fs/promises";

const raw = await readFile("data/colaboradores-raw.tsv", "utf8");

const map = {
  "EN (Energia)": "Energia",
  "HL (Crédito Habitação)": "Crédito Habitação",
  "PL (Extinta)": "Colaborador",
  "LPA (Pertence a HL)": "Crédito Habitação",
  "IN (Seguros)": "Seguros",
  "Marketing / Brand": "Marketing",
  "RH (People & Culture)": "People & Culture",
  "Tech & Product": "Tech & Product",
  "Sem Departamento / Desconhecido": "ComparaJá",
  "Vendas / Consultores (Por Alocar)": "Consultor",
  "RE (Real Estate / Novos Negócios)": "Real Estate",
  "Emails Gerais": "ComparaJá",
  "IT, Quality & Operations": "IT, Quality & Operations",
  Finance: "Finance",
  "BB (Telecomunicações)": "Telecomunicações",
  "Management Associate / Junior": "Management Associate",
  Outros: "ComparaJá",
  "Agente de Clientes / Junior": "Agente de Clientes",
  "-": "ComparaJá",
};

function esc(s) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const lines = raw.split(/\r?\n/).filter(Boolean).slice(1);
const out = ["email,nome,cargo,foto"];

for (const line of lines) {
  const parts = line.split("\t");
  if (parts.length < 3) continue;
  const nome = parts[0].trim();
  const email = parts[1].trim().toLowerCase();
  const dept = parts[2].trim();
  const cargo = map[dept] || dept;
  const foto =
    email === "daniel.maia@comparaja.pt" ? "1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ" : "";
  out.push([email, esc(nome), esc(cargo), foto].join(","));
}

await writeFile("data/import.csv", out.join("\n") + "\n", "utf8");
console.log(`Gerado data/import.csv com ${out.length - 1} pessoas`);
