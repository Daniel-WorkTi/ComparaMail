import { writeFile } from "fs/promises";

const blob = `Adryana Mayaraadryana.mayara@comparaja.ptEN (Energia)Ágata Mendesagata.mendes@comparaja.ptHL (Crédito Habitação)Ana Isabel Ferreiraana.ferreira@comparaja.ptHL (Crédito Habitação)Ana Mafalda Soaresana.soares@comparaja.ptHL (Crédito Habitação)Ana Sofia Silvaana.sofia.silva@comparaja.ptPL (Extinta)Ana Toméana.tome@comparaja.ptEN (Energia)André Assisandre.assis@comparaja.ptEN (Energia)André Leitãoandre.leitao@comparaja.ptEN (Energia)André Nunesandre.nunes@comparaja.ptEN (Energia)Aneta Rafajlovskaaneta.rafajlovska@comparaja.pt-Anna Loyolaanna.loyola@comparaja.ptEN (Energia)António Marquesantonio.marques@comparaja.ptHL (Crédito Habitação)António Rebeloantonio.j.rebelo@comparaja.ptLPA (Pertence a HL)António Santosantonio.santos@comparaja.ptEN (Energia)Arthur Almeidaarthur.almeida@comparaja.ptIN (Seguros)Bárbara Martinsbarbara.martins@comparaja.ptHL (Crédito Habitação)Beatriz Barbosabeatriz.barbosa@comparaja.ptMarketing / BrandBeatriz Batistabeatriz.batista@comparaja.ptHL (Crédito Habitação)Benedita Quintanilhabenedita.quintanilha@comparaja.ptRH (People & Culture)Bernardo Água-Melbernardo.aguamel@comparaja.ptTech & ProductBernardo Diasbernardo.dias@comparaja.ptSem Departamento / DesconhecidoBernardo Silvabernardo.silva@comparaja.ptMarketing / BrandBruna Jesusbruna.jesus@comparaja.ptVendas / Consultores (Por Alocar)Bruna Passosbruna.passos@comparaja.ptRE (Real Estate / Novos Negócios)Bruno Siqueirabruno.siqueira@comparaja.ptSem Departamento / DesconhecidoCarlos Ribeirocarlos.ribeiro@comparaja.ptHL (Crédito Habitação)Carolina Knotzcarolina.knotz@comparaja.ptHL (Crédito Habitação)Carolina Matoscarolina.matos@comparaja.ptHL (Crédito Habitação)Caroline Moraescaroline.moraes@comparaja.ptIN (Seguros)Caroline Serafimcaroline.serafim@comparaja.ptEN (Energia)Catarina Amorimcatarina.amorim@comparaja.ptRE (Real Estate / Novos Negócios)Catarina Cardosocatarina.cardoso@comparaja.ptHL (Crédito Habitação)Catarina Cotacatarina.cota@comparaja.ptIN (Seguros)Catarina Silvestrecatarina.silvestre@comparaja.ptHL (Crédito Habitação)Catarina Virgíliocatarina.virgilio@comparaja.ptRH (People & Culture)Cátia Gouveiacatia.gouveia@comparaja.ptHL (Crédito Habitação)Cátia Lourençocatia.lourenco@comparaja.ptRE (Real Estate / Novos Negócios)Cintia Araujocintia.araujo@comparaja.ptSem Departamento / DesconhecidoCláudia Fonsecaclaudia.fonseca@comparaja.ptSem Departamento / DesconhecidoCláudia Monteiroclaudia.monteiro@comparaja.ptHL (Crédito Habitação)Cláudio Bizarroclaudio.bizarro@comparaja.ptTech & ProductComparaJá TV Net Voztvnetvoz@comparaja.ptEmails GeraisConcierge ComparaJáconcierge@comparaja.ptSem Departamento / DesconhecidoCristina Folgadocristina.folgado@comparaja.ptRE (Real Estate / Novos Negócios)Dairé Gonçalvesdaire.goncalves@comparaja.ptHL (Crédito Habitação)Daniel Maiadaniel.maia@comparaja.ptTech & ProductDaniela Ferreiradaniela.ferreira@comparaja.ptHL (Crédito Habitação)David Pedrodavid.pedro@comparaja.ptHL (Crédito Habitação)Dayane Santosdayane.santos@comparaja.ptHL (Crédito Habitação)Diogo Barãodiogo.barao@comparaja.ptIT, Quality & OperationsDiogo Coutodiogo.couto@comparaja.ptEN (Energia)Diogo Luísdiogo.luis@comparaja.ptTech & ProductDiogo Nunesdiogo.nunes@comparaja.ptHL (Crédito Habitação)Dominykas Juodisdominykas.juodis@comparaja.ptFinanceFarid Miafarid.mia@comparaja.ptBB (Telecomunicações)Filipe Leitefilipe.leite@comparaja.ptMarketing / BrandFinanças ComparaJáfinance@comparaja.ptSem Departamento / DesconhecidoFrancisca Azevedofrancisca.azevedo@comparaja.ptRE (Real Estate / Novos Negócios)Giovana Dantasgiovana.dantas@comparaja.ptHL (Crédito Habitação)Gonçalo Cascaisgoncalo.cascais@comparaja.ptHL (Crédito Habitação)Gonçalo Monjardinogoncalo.monjardino@comparaja.ptManagement Associate / JuniorGuilherme Alvesguilherme.alves@comparaja.ptRE (Real Estate / Novos Negócios)Hélio Alhadahelio.alhada@comparaja.ptRE (Real Estate / Novos Negócios)Inês Cristóvãoines.cristovao@comparaja.ptEN (Energia)Inês Ferreiraines.ferreira@comparaja.ptHL (Crédito Habitação)Inês Marquesines.marques@comparaja.ptMarketing / BrandInês Nascimentoines.nascimento@comparaja.ptRE (Real Estate / Novos Negócios)Inês Sampaioines.sampaio@comparaja.ptEN (Energia)Irene Silvairene.silva@comparaja.ptEN (Energia)Isabel Piresisabel.pires@comparaja.ptSem Departamento / DesconhecidoJéssica Mirandajessica.miranda@comparaja.ptRE (Real Estate / Novos Negócios)Joana Silvajoana.silva@comparaja.ptHL (Crédito Habitação)Joana Soaresjoana.soares@comparaja.ptHL (Crédito Habitação)João Andréjoao.andre@comparaja.ptLPA (Pertence a HL)João Bastosjoao.bastos@comparaja.ptIN (Seguros)João Borgesjoao.borges@comparaja.ptTech & ProductJoão Coelhojoao.coelho@comparaja.ptIT, Quality & OperationsJoão Costajoao.costa@comparaja.ptTech & ProductJoão Miguel Rodriguesjoao.rodrigues@comparaja.ptTech & ProductJoão Pedro Silvajoao.silva@comparaja.ptRE (Real Estate / Novos Negócios)Jorge Luísjorge.luis@comparaja.ptHL (Crédito Habitação)Jorge Rebelojorge.rebelo@comparaja.ptBB (Telecomunicações)José Figueirajose.figueira@comparaja.ptSem Departamento / DesconhecidoJosé Figueiredojose.figueiredo@comparaja.ptSem Departamento / DesconhecidoJosé Silvajose.silva@comparaja.ptHL (Crédito Habitação)José Trovãojose.trovao@comparaja.ptEN (Energia)Leandro Teixeiraleandro.teixeira@comparaja.ptEN (Energia)Leonardo Amorimleonardo.amorim@comparaja.ptEN (Energia)Leonor Santosleonor.santos@comparaja.ptHL (Crédito Habitação)Leonor Wilsonleonor.wilson@comparaja.ptRE (Real Estate / Novos Negócios)Lourenço Parentelourenco.parente@comparaja.ptRH (People & Culture)Luís Nunesluis.nunes@comparaja.ptMarketing / BrandMadalena Alvesmadalena.alves@comparaja.ptMarketing / BrandMadalena Amorimmadalena.amorim@comparaja.ptEN (Energia)Mafalda Amaralmafalda.amaral@comparaja.ptIN (Seguros)Márcio Pinheiromarcio.pinheiro@comparaja.ptVendas / Consultores (Por Alocar)Maria Mouramaria.moura@comparaja.ptOutrosMaria Rodriguesmaria.rodrigues@comparaja.ptHL (Crédito Habitação)Maria Silvamaria.silva@comparaja.ptSem Departamento / DesconhecidoMariana Lapasmariana.lapas@comparaja.ptAgente de Clientes / JuniorMariana Moraismariana.morais@comparaja.ptHL (Crédito Habitação)Mariana Mouramariana.moura@comparaja.ptIN (Seguros)Mariana Pintomariana.pinto@comparaja.ptEN (Energia)Martin Fjordvaldmartin@comparaja.ptSem Departamento / DesconhecidoMartim Matosmartim.matos@comparaja.ptFinanceMélanie Rodriguesmelanie.rodrigues@comparaja.ptTech & ProductMélanie Silvamelanie.silva@comparaja.ptEN (Energia)Michely Assunçãomichely.assuncao@comparaja.ptEN (Energia)Mónica Machadomonica.machado@comparaja.ptHL (Crédito Habitação)Natália Fanzeresnatalia.fanzeres@comparaja.ptMarketing / BrandNatália Oliveiranatalia.oliveira@comparaja.ptEN (Energia)Neuza Borgesneuza.borges@comparaja.ptRE (Real Estate / Novos Negócios)Noelma Mendesnoelma.mendes@comparaja.ptHL (Crédito Habitação)Nuno Conceiçãonuno.conceicao@comparaja.ptIN (Seguros)Patrícia Lopespatricia.lopes@comparaja.ptIN (Seguros)Paula Camocardipaula.camocardi@comparaja.ptRE (Real Estate / Novos Negócios)Pedro Castropedro.castro@comparaja.ptRE (Real Estate / Novos Negócios)Pedro Cruzpedro.cruz@comparaja.ptRH (People & Culture)Pedro Mendespedro.mendes@comparaja.ptRE (Real Estate / Novos Negócios)Pedro Netopedro.neto@comparaja.ptRE (Real Estate / Novos Negócios)Pedro Pinheiropedro.pinheiro@comparaja.ptRE (Real Estate / Novos Negócios)Piera Borgespiera.borges@comparaja.ptEN (Energia)Rafaela Alcântararafaela.alcantara@comparaja.ptEN (Energia)Raquel Simõesraquel.simoes@comparaja.ptEN (Energia)Ricardo Feferbaumricardo.feferbaum@comparaja.ptRE (Real Estate / Novos Negócios)Rita Silvarita.silva@comparaja.ptBB (Telecomunicações)Rita Sogalhorita.sogalho@comparaja.ptHL (Crédito Habitação)Rodrigo Gameirorodrigo.gameiro@comparaja.ptTech & ProductRui Venturarui.ventura@comparaja.ptIN (Seguros)Samanta Souzasamanta.souza@comparaja.ptEN (Energia)Sara Correiasara.correia@comparaja.ptLPA (Pertence a HL)Sara Henriquessara.henriques@comparaja.ptEN (Energia)Sofia Croftsofia.croft@comparaja.ptRH (People & Culture)Sophia Nóvoasophia.novoa@comparaja.ptHL (Crédito Habitação)Stefany Mendesstefany.mendes@comparaja.ptEN (Energia)Susana Pedrosusana.pedro@comparaja.ptMarketing / BrandTalita Batistatalita.batista@comparaja.ptHL (Crédito Habitação)Tânia Arraiolostania.arraiolos@comparaja.ptHL (Crédito Habitação)Tânia Baratatania.barata@comparaja.ptRE (Real Estate / Novos Negócios)Tânia Sousatania.sousa@comparaja.ptRE (Real Estate / Novos Negócios)Teresa Jorgeteresa.jorge@comparaja.ptHL (Crédito Habitação)Thalita Cristinathalita.cristina@comparaja.ptRE (Real Estate / Novos Negócios)Thaynná Albuquerquethaynna.albuquerque@comparaja.ptEN (Energia)Valderene Almeidavalderene.almeida@comparaja.ptEN (Energia)Valéria Netavaleria.neta@comparaja.ptOutrosVanessa Pereiravanessa.pereira@comparaja.ptRE (Real Estate / Novos Negócios)Vanessa Sanchesvanessa.sanches@comparaja.ptBB (Telecomunicações)Vânia Alexandrevania.alexandre@comparaja.ptRE (Real Estate / Novos Negócios)Vera Luísvera.luis@comparaja.ptHL (Crédito Habitação)Vera Peixotovera.peixoto@comparaja.ptSem Departamento / DesconhecidoVictoria Correiavictoria.correia@comparaja.ptVendas / Consultores (Por Alocar)Wendy Limawendy.lima@comparaja.ptEN (Energia)`;

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

const EXCLUDE_EMAILS = new Set([
  "tvnetvoz@comparaja.pt",
  "concierge@comparaja.pt",
  "finance@comparaja.pt",
]);

const depts = Object.keys(map).sort((a, b) => b.length - a.length);
const emailRe = /([a-z0-9._+-]+@comparaja\.pt)/gi;
const emailMatches = [...blob.matchAll(emailRe)];

const people = [];
let cursor = 0;

for (let i = 0; i < emailMatches.length; i++) {
  const m = emailMatches[i];
  const email = m[1].toLowerCase();
  const emailStart = m.index;
  const name = blob.slice(cursor, emailStart).trim();
  const afterEmail = emailStart + m[0].length;

  let dept = "";
  for (const d of depts) {
    if (blob.startsWith(d, afterEmail)) {
      dept = d;
      break;
    }
  }
  if (!dept && blob.startsWith("-", afterEmail)) dept = "-";

  const deptLen = dept.length;
  cursor = afterEmail + deptLen;

  people.push({
    name,
    email,
    dept,
    title: map[dept] || dept || "ComparaJá",
  });
}

const filtered = people.filter((p) => !EXCLUDE_EMAILS.has(p.email));

function esc(s) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const lines = ["email,nome,cargo,foto"];
for (const p of filtered) {
  const foto =
    p.email === "daniel.maia@comparaja.pt"
      ? "1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ"
      : "";
  lines.push([p.email, esc(p.name), esc(p.title), foto].join(","));
}

await writeFile("data/import.csv", lines.join("\n") + "\n", "utf8");

const tsv = ["Nome\tE-mail\tDepartamento / Cargo"];
for (const p of filtered) tsv.push(`${p.name}\t${p.email}\t${p.dept}`);
await writeFile("data/colaboradores-raw.tsv", tsv.join("\n") + "\n", "utf8");

const weird = filtered.filter(
  (p) => !p.name || p.name.includes("@") || p.title.includes("@") || /Diogo|João/.test(p.title),
);

console.log(`Parseados: ${people.length}`);
console.log(`Após excluir caixas gerais: ${filtered.length}`);
console.log("Excluídos:", [...EXCLUDE_EMAILS].join(", "));
console.log(
  "Diogo Barão:",
  filtered.find((p) => p.email === "diogo.barao@comparaja.pt"),
);
console.log(
  "João Coelho:",
  filtered.find((p) => p.email === "joao.coelho@comparaja.pt"),
);
if (weird.length) console.log("Avisos:", weird);
