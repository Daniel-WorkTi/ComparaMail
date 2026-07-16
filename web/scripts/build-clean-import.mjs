import { writeFile } from "fs/promises";

// Lista oficial (a que colaste), com nomes/emails já separados.
const rows = `
Adryana Mayara|adryana.mayara@comparaja.pt|EN (Energia)
Ágata Mendes|agata.mendes@comparaja.pt|HL (Crédito Habitação)
Ana Isabel Ferreira|ana.ferreira@comparaja.pt|HL (Crédito Habitação)
Ana Mafalda Soares|ana.soares@comparaja.pt|HL (Crédito Habitação)
Ana Sofia Silva|ana.sofia.silva@comparaja.pt|PL (Extinta)
Ana Tomé|ana.tome@comparaja.pt|EN (Energia)
André Assis|andre.assis@comparaja.pt|EN (Energia)
André Leitão|andre.leitao@comparaja.pt|EN (Energia)
André Nunes|andre.nunes@comparaja.pt|EN (Energia)
Aneta Rafajlovska|aneta.rafajlovska@comparaja.pt|-
Anna Loyola|anna.loyola@comparaja.pt|EN (Energia)
António Marques|antonio.marques@comparaja.pt|HL (Crédito Habitação)
António Rebelo|antonio.j.rebelo@comparaja.pt|LPA (Pertence a HL)
António Santos|antonio.santos@comparaja.pt|EN (Energia)
Arthur Almeida|arthur.almeida@comparaja.pt|IN (Seguros)
Bárbara Martins|barbara.martins@comparaja.pt|HL (Crédito Habitação)
Beatriz Barbosa|beatriz.barbosa@comparaja.pt|Marketing / Brand
Beatriz Batista|beatriz.batista@comparaja.pt|HL (Crédito Habitação)
Benedita Quintanilha|benedita.quintanilha@comparaja.pt|RH (People & Culture)
Bernardo Água-Mel|bernardo.aguamel@comparaja.pt|Tech & Product
Bernardo Dias|bernardo.dias@comparaja.pt|Sem Departamento / Desconhecido
Bernardo Silva|bernardo.silva@comparaja.pt|Marketing / Brand
Bruna Jesus|bruna.jesus@comparaja.pt|Vendas / Consultores (Por Alocar)
Bruna Passos|bruna.passos@comparaja.pt|RE (Real Estate / Novos Negócios)
Bruno Siqueira|bruno.siqueira@comparaja.pt|Sem Departamento / Desconhecido
Carlos Ribeiro|carlos.ribeiro@comparaja.pt|HL (Crédito Habitação)
Carolina Knotz|carolina.knotz@comparaja.pt|HL (Crédito Habitação)
Carolina Matos|carolina.matos@comparaja.pt|HL (Crédito Habitação)
Caroline Moraes|caroline.moraes@comparaja.pt|IN (Seguros)
Caroline Serafim|caroline.serafim@comparaja.pt|EN (Energia)
Catarina Amorim|catarina.amorim@comparaja.pt|RE (Real Estate / Novos Negócios)
Catarina Cardoso|catarina.cardoso@comparaja.pt|HL (Crédito Habitação)
Catarina Cota|catarina.cota@comparaja.pt|IN (Seguros)
Catarina Silvestre|catarina.silvestre@comparaja.pt|HL (Crédito Habitação)
Catarina Virgílio|catarina.virgilio@comparaja.pt|RH (People & Culture)
Cátia Gouveia|catia.gouveia@comparaja.pt|HL (Crédito Habitação)
Cátia Lourenço|catia.lourenco@comparaja.pt|RE (Real Estate / Novos Negócios)
Cintia Araujo|cintia.araujo@comparaja.pt|Sem Departamento / Desconhecido
Cláudia Fonseca|claudia.fonseca@comparaja.pt|Sem Departamento / Desconhecido
Cláudia Monteiro|claudia.monteiro@comparaja.pt|HL (Crédito Habitação)
Cláudio Bizarro|claudio.bizarro@comparaja.pt|Tech & Product
Cristina Folgado|cristina.folgado@comparaja.pt|RE (Real Estate / Novos Negócios)
Dairé Gonçalves|daire.goncalves@comparaja.pt|HL (Crédito Habitação)
Daniel Maia|daniel.maia@comparaja.pt|Tech & Product
Daniela Ferreira|daniela.ferreira@comparaja.pt|HL (Crédito Habitação)
David Pedro|david.pedro@comparaja.pt|HL (Crédito Habitação)
Dayane Santos|dayane.santos@comparaja.pt|HL (Crédito Habitação)
Diogo Barão|diogo.barao@comparaja.pt|IT, Quality & Operations
Diogo Couto|diogo.couto@comparaja.pt|EN (Energia)
Diogo Luís|diogo.luis@comparaja.pt|Tech & Product
Diogo Nunes|diogo.nunes@comparaja.pt|HL (Crédito Habitação)
Dominykas Juodis|dominykas.juodis@comparaja.pt|Finance
Farid Mia|farid.mia@comparaja.pt|BB (Telecomunicações)
Filipe Leite|filipe.leite@comparaja.pt|Marketing / Brand
Francisca Azevedo|francisca.azevedo@comparaja.pt|RE (Real Estate / Novos Negócios)
Giovana Dantas|giovana.dantas@comparaja.pt|HL (Crédito Habitação)
Gonçalo Cascais|goncalo.cascais@comparaja.pt|HL (Crédito Habitação)
Gonçalo Monjardino|goncalo.monjardino@comparaja.pt|Management Associate / Junior
Guilherme Alves|guilherme.alves@comparaja.pt|RE (Real Estate / Novos Negócios)
Hélio Alhada|helio.alhada@comparaja.pt|RE (Real Estate / Novos Negócios)
Inês Cristóvão|ines.cristovao@comparaja.pt|EN (Energia)
Inês Ferreira|ines.ferreira@comparaja.pt|HL (Crédito Habitação)
Inês Marques|ines.marques@comparaja.pt|Marketing / Brand
Inês Nascimento|ines.nascimento@comparaja.pt|RE (Real Estate / Novos Negócios)
Inês Sampaio|ines.sampaio@comparaja.pt|EN (Energia)
Irene Silva|irene.silva@comparaja.pt|EN (Energia)
Isabel Pires|isabel.pires@comparaja.pt|Sem Departamento / Desconhecido
Jéssica Miranda|jessica.miranda@comparaja.pt|RE (Real Estate / Novos Negócios)
Joana Silva|joana.silva@comparaja.pt|HL (Crédito Habitação)
Joana Soares|joana.soares@comparaja.pt|HL (Crédito Habitação)
João André|joao.andre@comparaja.pt|LPA (Pertence a HL)
João Bastos|joao.bastos@comparaja.pt|IN (Seguros)
João Borges|joao.borges@comparaja.pt|Tech & Product
João Coelho|joao.coelho@comparaja.pt|IT, Quality & Operations
João Costa|joao.costa@comparaja.pt|Tech & Product
João Miguel Rodrigues|joao.rodrigues@comparaja.pt|Tech & Product
João Pedro Silva|joao.silva@comparaja.pt|RE (Real Estate / Novos Negócios)
Jorge Luís|jorge.luis@comparaja.pt|HL (Crédito Habitação)
Jorge Rebelo|jorge.rebelo@comparaja.pt|BB (Telecomunicações)
José Figueira|jose.figueira@comparaja.pt|Sem Departamento / Desconhecido
José Figueiredo|jose.figueiredo@comparaja.pt|Sem Departamento / Desconhecido
José Silva|jose.silva@comparaja.pt|HL (Crédito Habitação)
José Trovão|jose.trovao@comparaja.pt|EN (Energia)
Leandro Teixeira|leandro.teixeira@comparaja.pt|EN (Energia)
Leonardo Amorim|leonardo.amorim@comparaja.pt|EN (Energia)
Leonor Santos|leonor.santos@comparaja.pt|HL (Crédito Habitação)
Leonor Wilson|leonor.wilson@comparaja.pt|RE (Real Estate / Novos Negócios)
Lourenço Parente|lourenco.parente@comparaja.pt|RH (People & Culture)
Luís Nunes|luis.nunes@comparaja.pt|Marketing / Brand
Madalena Alves|madalena.alves@comparaja.pt|Marketing / Brand
Madalena Amorim|madalena.amorim@comparaja.pt|EN (Energia)
Mafalda Amaral|mafalda.amaral@comparaja.pt|IN (Seguros)
Márcio Pinheiro|marcio.pinheiro@comparaja.pt|Vendas / Consultores (Por Alocar)
Maria Moura|maria.moura@comparaja.pt|Outros
Maria Rodrigues|maria.rodrigues@comparaja.pt|HL (Crédito Habitação)
Maria Silva|maria.silva@comparaja.pt|Sem Departamento / Desconhecido
Mariana Lapas|mariana.lapas@comparaja.pt|Agente de Clientes / Junior
Mariana Morais|mariana.morais@comparaja.pt|HL (Crédito Habitação)
Mariana Moura|mariana.moura@comparaja.pt|IN (Seguros)
Mariana Pinto|mariana.pinto@comparaja.pt|EN (Energia)
Martin Fjordvald|martin@comparaja.pt|Sem Departamento / Desconhecido
Martim Matos|martim.matos@comparaja.pt|Finance
Mélanie Rodrigues|melanie.rodrigues@comparaja.pt|Tech & Product
Mélanie Silva|melanie.silva@comparaja.pt|EN (Energia)
Michely Assunção|michely.assuncao@comparaja.pt|EN (Energia)
Mónica Machado|monica.machado@comparaja.pt|HL (Crédito Habitação)
Natália Fanzeres|natalia.fanzeres@comparaja.pt|Marketing / Brand
Natália Oliveira|natalia.oliveira@comparaja.pt|EN (Energia)
Neuza Borges|neuza.borges@comparaja.pt|RE (Real Estate / Novos Negócios)
Noelma Mendes|noelma.mendes@comparaja.pt|HL (Crédito Habitação)
Nuno Conceição|nuno.conceicao@comparaja.pt|IN (Seguros)
Patrícia Lopes|patricia.lopes@comparaja.pt|IN (Seguros)
Paula Camocardi|paula.camocardi@comparaja.pt|RE (Real Estate / Novos Negócios)
Pedro Castro|pedro.castro@comparaja.pt|RE (Real Estate / Novos Negócios)
Pedro Cruz|pedro.cruz@comparaja.pt|RH (People & Culture)
Pedro Mendes|pedro.mendes@comparaja.pt|RE (Real Estate / Novos Negócios)
Pedro Neto|pedro.neto@comparaja.pt|RE (Real Estate / Novos Negócios)
Pedro Pinheiro|pedro.pinheiro@comparaja.pt|RE (Real Estate / Novos Negócios)
Piera Borges|piera.borges@comparaja.pt|EN (Energia)
Rafaela Alcântara|rafaela.alcantara@comparaja.pt|EN (Energia)
Raquel Simões|raquel.simoes@comparaja.pt|EN (Energia)
Ricardo Feferbaum|ricardo.feferbaum@comparaja.pt|RE (Real Estate / Novos Negócios)
Rita Silva|rita.silva@comparaja.pt|BB (Telecomunicações)
Rita Sogalho|rita.sogalho@comparaja.pt|HL (Crédito Habitação)
Rodrigo Gameiro|rodrigo.gameiro@comparaja.pt|Tech & Product
Rui Ventura|rui.ventura@comparaja.pt|IN (Seguros)
Samanta Souza|samanta.souza@comparaja.pt|EN (Energia)
Sara Correia|sara.correia@comparaja.pt|LPA (Pertence a HL)
Sara Henriques|sara.henriques@comparaja.pt|EN (Energia)
Sofia Croft|sofia.croft@comparaja.pt|RH (People & Culture)
Sophia Nóvoa|sophia.novoa@comparaja.pt|HL (Crédito Habitação)
Stefany Mendes|stefany.mendes@comparaja.pt|EN (Energia)
Susana Pedro|susana.pedro@comparaja.pt|Marketing / Brand
Talita Batista|talita.batista@comparaja.pt|HL (Crédito Habitação)
Tânia Arraiolos|tania.arraiolos@comparaja.pt|HL (Crédito Habitação)
Tânia Barata|tania.barata@comparaja.pt|RE (Real Estate / Novos Negócios)
Tânia Sousa|tania.sousa@comparaja.pt|RE (Real Estate / Novos Negócios)
Teresa Jorge|teresa.jorge@comparaja.pt|HL (Crédito Habitação)
Thalita Cristina|thalita.cristina@comparaja.pt|RE (Real Estate / Novos Negócios)
Thaynná Albuquerque|thaynna.albuquerque@comparaja.pt|EN (Energia)
Valderene Almeida|valderene.almeida@comparaja.pt|EN (Energia)
Valéria Neta|valeria.neta@comparaja.pt|Outros
Vanessa Pereira|vanessa.pereira@comparaja.pt|RE (Real Estate / Novos Negócios)
Vanessa Sanches|vanessa.sanches@comparaja.pt|BB (Telecomunicações)
Vânia Alexandre|vania.alexandre@comparaja.pt|RE (Real Estate / Novos Negócios)
Vera Luís|vera.luis@comparaja.pt|HL (Crédito Habitação)
Vera Peixoto|vera.peixoto@comparaja.pt|Sem Departamento / Desconhecido
Victoria Correia|victoria.correia@comparaja.pt|Vendas / Consultores (Por Alocar)
Wendy Lima|wendy.lima@comparaja.pt|EN (Energia)
`.trim().split(/\n/).filter(Boolean);

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

const people = rows.map((line) => {
  const [name, email, dept] = line.split("|");
  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    dept: dept.trim(),
    title: map[dept.trim()] || dept.trim(),
  };
});

const lines = ["email,nome,cargo,foto"];
for (const p of people) {
  const foto =
    p.email === "daniel.maia@comparaja.pt"
      ? "1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ"
      : "";
  lines.push([p.email, esc(p.name), esc(p.title), foto].join(","));
}

await writeFile("data/import.csv", lines.join("\n") + "\n", "utf8");

const tsv = ["Nome\tE-mail\tDepartamento / Cargo"];
for (const p of people) tsv.push(`${p.name}\t${p.email}\t${p.dept}`);
await writeFile("data/colaboradores-raw.tsv", tsv.join("\n") + "\n", "utf8");

console.log(`Funcionários no CSV: ${people.length}`);
console.log("Caixas gerais excluídas: tvnetvoz, concierge, finance");
console.log(
  "Sample:",
  people.find((p) => p.email.includes("barao")),
  people.find((p) => p.email.includes("coelho")),
);
