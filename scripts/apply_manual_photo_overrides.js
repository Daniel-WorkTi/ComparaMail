/**
 * Aplica overrides manuais de fotos enviados pelo utilizador.
 * Ignora IDs duplicados claramente por engano (mesma foto para duas pessoas).
 */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "web", "data");
const CSV_PATH = path.join(DATA, "import.csv");
const PEOPLE_PATH = path.join(DATA, "people.json");

/** email -> drive file id */
const OVERRIDES = {
  "ana.ferreira@comparaja.pt": "17AJkipkMXVUMYZPE2MEIMA4fWZquMNsA",
  // Ana Mafalda: user colou o mesmo link da Ana Isabel — manter mafalda-soares
  "ana.soares@comparaja.pt": "1u8D2DCKvT6QJMQVKUQ4sBvSunw4anJFb",
  "ana.sofia.silva@comparaja.pt": "1ec-jSSJtvQvvk5F7Pu2OIXLfptRZaiN0",
  "andre.nunes@comparaja.pt": "1_VoZ3DP-f1bU5H79AGOCiSA5JJGKPWzl",
  "anna.loyola@comparaja.pt": "1O9hXQcU_bOSNvyJ-TGWi1_H52iylD1fh",
  "antonio.santos@comparaja.pt": "1ltMK1clkb_Rzeq66nBOfxDuWSY7RFWOs",
  "arthur.almeida@comparaja.pt": "1E0qHZp5tdBxo3jr8zzNWBnbdCEzCwchi",
  "barbara.martins@comparaja.pt": "1PrnHKGtT7xmpiCIUiZSW8vQNWqAB9vIt",
  "beatriz.barbosa@comparaja.pt": "17K49rkyUEq7rQARg-WWLSNo77Oc9Kr7_",
  "bernardo.aguamel@comparaja.pt": "1MO-RwSuPXAdSyKjCXuVgqczq1bOfwljV",
  "bernardo.silva@comparaja.pt": "1eDE_spKQVigAo5DW62Dsmehq62sL8bj8",
  "carolina.knotz@comparaja.pt": "1lW9VkSGx1Zl_Nfyg0xqEej18NuUi1ppx",
  "carolina.matos@comparaja.pt": "1ImDj0KWOIWEKHmSYEdxZ3n9iiiTxjRSo",
  // Caroline Moraes: user colou o link da Carolina Matos — manter anterior
  "caroline.moraes@comparaja.pt": "1xt5VTm5PdKcgZuy5v5yEBns81Wh-aiB1",
  "catarina.cardoso@comparaja.pt": "1H3GRqH8pkPVFU03tXsJOu7iJ-Sw9ySje",
  "catarina.virgilio@comparaja.pt": "1YwUvTZGDlDH9Hhz605N6MckpBssXAtYV",
  "catia.gouveia@comparaja.pt": "1iCjkcW6PCB_R5H_ROzGsJkiU9sIndDd4",
  "cristina.folgado@comparaja.pt": "15D-sGijsL5nUwoOcw3UJUCviVbFj0DJu",
  "david.pedro@comparaja.pt": "1IWf4aslfAyFjjiZoKXSPRXacV1QsHOsC",
  "diogo.barao@comparaja.pt": "1--rtYbuA4VjTkLWzg4_zWVGeqmpanph5",
  "diogo.couto@comparaja.pt": "1eLZaI9UjZavwHyDxgeT-pvsMKk4MHIwf",
  "diogo.nunes@comparaja.pt": "1MY3foQauz0R35yEhYnkfnRr3q4plH25C",
  "giovana.dantas@comparaja.pt": "1CmE9HW1fzBzTmZt2pATluITkBP4TjdwV",
  "helio.alhada@comparaja.pt": "1pIFkK4ggwyZjhzv0jiyM1RmWlyzw4iPN",
  "jessica.miranda@comparaja.pt": "1EBWcDQI2uTRn6vtqJBbVEtS_swNo5CDb",
  "joana.soares@comparaja.pt": "10_CS5NWeLRBvscKhr4XYfgwqiop3zMsN",
  "joao.andre@comparaja.pt": "10rWTibLTv9Hd-SsdbWAH8G86YpKCUHmc",
  "joao.bastos@comparaja.pt": "1cH8PETliOdLAvhN19yF2m8XKc0hkFRNF",
  // Borges: user colou o link do João Bastos — manter joao-borges
  "joao.borges@comparaja.pt": "1xnT1YBNZThpWZVI9r7phU32GGcaYaQYn",
  "joao.silva@comparaja.pt": "1HYtSNWA1AkcSS8iCSorRsGnyZjNn0qJl",
  "leandro.teixeira@comparaja.pt": "1jg9dLa20eh3ONVe89Da8ms2WUkgsd8nB",
  "lourenco.parente@comparaja.pt": "1EnB7b1iUlnekw_H3ns-K7xnab6NXO05O",
  "mariana.morais@comparaja.pt": "13nUH21TxfQqI03N7YLtl6q49WIX4-pWk",
  "mariana.moura@comparaja.pt": "1qEKLdHkGp2mVRf735JleKu-Hf2yMnukD",
  "melanie.silva@comparaja.pt": "1bYqrDnuSMMIh_NbwLVK1BP6FvDsw9IVC",
  "monica.machado@comparaja.pt": "12fz9YEas2nRtmxBZNMRFQZEkdB6wu7Mg",
  "natalia.fanzeres@comparaja.pt": "1u-JnPQiv93II34XDJiTBLnAe8pDmYM-_",
  "natalia.oliveira@comparaja.pt": "1W4QOuMHWGhuJKjrzX_gXmo_nAPqvWA2n",
  "paula.camocardi@comparaja.pt": "1GEGPHPtUgBHSuRUS9sPCRElTLt8pUj89",
  "pedro.neto@comparaja.pt": "1NlYOFfajB43hJYmuHs4Kjg-dseF7-Vfx",
  "raquel.simoes@comparaja.pt": "1jDlEUMoMo9zeo4XYBAlmBlN8lOnc9Sfo",
  "rita.silva@comparaja.pt": "1hoj8Lv26W14VOfUGLGe77b7zCH1N3Mbw",
  "sara.henriques@comparaja.pt": "13GLY8DiS-EOnjeQI37UZ-46Rih7bIDTe",
  "sofia.croft@comparaja.pt": "1G1UsRwrG4BXJX7ReO7d2_sxp6-GjHvzK",
  // Stefany: user colou o link da Sofia Croft — manter stefany-mendes
  "stefany.mendes@comparaja.pt": "1UDAG_9iovUd84t6lEL4-GtLH-N3qks6t",
  "susana.pedro@comparaja.pt": "1HchLq2k82tIIphVknJOADgGeb0FQYUZR",
  "tania.arraiolos@comparaja.pt": "1zTk9t9On7DANke5-u7D9ya1TOn0enwbE",
  "teresa.jorge@comparaja.pt": "1d5G2kiESaapnQt9mFKWRN5VFxUi55LNs",
  "valeria.neta@comparaja.pt": "1_nJ3GSFCZbloiR4QyfHeOQbAVTxA6gLH",
  "vanessa.sanches@comparaja.pt": "1C8bd-7tQYT2QdIbRVT_oINlrZdw1JXH_",
  "vera.luis@comparaja.pt": "12MK9nAb7WznOu8prs3g6J-DcUF9oMnH2",
  "wendy.lima@comparaja.pt": "1HsbrJrkjQIcQ5svX4En58_VCeyw_lEer",
};

/** title fixes for corrupted CSV rows */
const TITLE_FIXES = {
  "diogo.barao@comparaja.pt": "IT, Quality & Operations",
};

function toPhotoUrl(id) {
  const v = (id || "").trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return `https://lh3.googleusercontent.com/d/${v}=s400`;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    // Recover broken Diogo Barão line: email,nome,"IT,ID  or similar
    if (line.startsWith("diogo.barao@")) {
      const idMatch = line.match(/,(1[--]?[a-zA-Z0-9_-]{20,})\s*$/);
      rows.push({
        email: "diogo.barao@comparaja.pt",
        nome: "Diogo Barão",
        cargo: TITLE_FIXES["diogo.barao@comparaja.pt"] || "Energia e Business",
        foto: idMatch ? idMatch[1] : "",
      });
      continue;
    }
    const first = line.indexOf(",");
    const second = line.indexOf(",", first + 1);
    const last = line.lastIndexOf(",");
    rows.push({
      email: line.slice(0, first).trim(),
      nome: line.slice(first + 1, second).trim(),
      cargo: line.slice(second + 1, last).trim().replace(/^"|"$/g, ""),
      foto: line.slice(last + 1).trim(),
    });
  }
  return rows;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  let changed = 0;
  let filledEmpty = 0;

  for (const row of rows) {
    const key = row.email.toLowerCase();
    if (TITLE_FIXES[key]) row.cargo = TITLE_FIXES[key];
    const id = OVERRIDES[key];
    if (!id) continue;
    if (row.foto !== id) {
      if (!row.foto) filledEmpty++;
      row.foto = id;
      changed++;
    }
  }

  const out = ["email,nome,cargo,foto"];
  for (const r of rows) {
    const cargo =
      r.cargo.includes(",") || r.cargo.includes('"')
        ? `"${r.cargo.replace(/"/g, '""')}"`
        : r.cargo;
    out.push(`${r.email},${r.nome},${cargo},${r.foto}`);
  }
  fs.writeFileSync(CSV_PATH, out.join("\n") + "\n", "utf8");

  const store = JSON.parse(fs.readFileSync(PEOPLE_PATH, "utf8"));
  const now = new Date().toISOString();
  let peopleUpdated = 0;
  const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));

  for (const p of store.people) {
    const row = byEmail.get((p.email || "").toLowerCase());
    if (!row) continue;
    const url = toPhotoUrl(row.foto);
    let dirty = false;
    if (row.cargo && p.title !== row.cargo) {
      p.title = row.cargo;
      dirty = true;
    }
    if (url && p.photoUrl !== url) {
      p.photoUrl = url;
      dirty = true;
    }
    if (dirty) {
      p.updatedAt = now;
      peopleUpdated++;
    }
  }

  fs.writeFileSync(PEOPLE_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");

  const withPhoto = rows.filter((r) => r.foto).length;
  const without = rows.filter((r) => !r.foto);
  console.log(`CSV rows: ${rows.length}`);
  console.log(`Overrides aplicados (diffs): ${changed}`);
  console.log(`Antes vazios preenchidos: ${filledEmpty}`);
  console.log(`people.json atualizados: ${peopleUpdated}`);
  console.log(`Com foto: ${withPhoto} | Sem foto: ${without.length}`);
  if (without.length) {
    console.log("Ainda sem foto:");
    for (const p of without) console.log(`  - ${p.nome} <${p.email}>`);
  }
  console.log("\nLinks duplicados ignorados (mantida foto correcta):");
  console.log("  - Ana Mafalda Soares (não usou link da Ana Isabel)");
  console.log("  - Caroline Moraes (não usou link da Carolina Matos)");
  console.log("  - João Borges (não usou link do João Bastos)");
  console.log("  - Stefany Mendes (não usou link da Sofia Croft)");
}

main();
