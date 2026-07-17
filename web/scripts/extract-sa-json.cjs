/**
 * Extrai GOOGLE_SERVICE_ACCOUNT_JSON do .env.local para web/.secrets/google-sa.json
 * (Next.js parte JSON longo com aspas no .env — ficheiro é mais fiável).
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const outDir = path.join(__dirname, "..", ".secrets");
const outFile = path.join(outDir, "google-sa.json");

if (!fs.existsSync(envPath)) {
  console.error("Não encontrei .env.local");
  process.exit(1);
}

const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
let raw = "";
for (const line of lines) {
  if (line.startsWith("GOOGLE_SERVICE_ACCOUNT_JSON=")) {
    raw = line.slice("GOOGLE_SERVICE_ACCOUNT_JSON=".length).trim();
    break;
  }
}

if (!raw) {
  console.error("GOOGLE_SERVICE_ACCOUNT_JSON em falta no .env.local");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
} catch (e) {
  console.error("JSON inválido:", e.message);
  process.exit(1);
}

if (!parsed.client_email || !parsed.private_key) {
  console.error("JSON sem client_email/private_key");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2), "utf8");
console.log("OK wrote", outFile);
console.log("client_email ends with iam.gserviceaccount.com:", String(parsed.client_email).includes(".iam.gserviceaccount.com"));
