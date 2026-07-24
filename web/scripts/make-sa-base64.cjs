/**
 * Gera Base64 do JSON da Service Account para colar na Vercel
 * como GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (evita JSON partido).
 *
 * Uso:
 *   node scripts/make-sa-base64.cjs
 *   (lê web/.secrets/google-sa.json ou GOOGLE_SERVICE_ACCOUNT_JSON do .env.local)
 */
const fs = require("fs");
const path = require("path");

const secretsFile = path.join(__dirname, "..", ".secrets", "google-sa.json");
const envPath = path.join(__dirname, "..", ".env.local");

function fromSecrets() {
  if (!fs.existsSync(secretsFile)) return null;
  return fs.readFileSync(secretsFile, "utf8");
}

function fromEnv() {
  if (!fs.existsSync(envPath)) return null;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("GOOGLE_SERVICE_ACCOUNT_JSON=")) continue;
    let raw = line.slice("GOOGLE_SERVICE_ACCOUNT_JSON=".length).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    if (raw.includes('\\"')) raw = raw.replace(/\\"/g, '"');
    return raw;
  }
  return null;
}

let raw = fromSecrets() || fromEnv();
if (!raw) {
  console.error(
    "Não encontrei .secrets/google-sa.json nem GOOGLE_SERVICE_ACCOUNT_JSON no .env.local",
  );
  console.error("Corre primeiro: node scripts/extract-sa-json.cjs");
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

const compact = JSON.stringify(parsed);
const b64 = Buffer.from(compact, "utf8").toString("base64");

console.log("");
console.log("=== Cola isto na Vercel (Production) ===");
console.log("Name:  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
console.log("Value: (a linha abaixo, completa)");
console.log("");
console.log(b64);
console.log("");
console.log("Podes apagar GOOGLE_SERVICE_ACCOUNT_JSON na Vercel se usares Base64.");
console.log("Mantém GOOGLE_WORKSPACE_ADMIN_EMAIL.");
console.log("client_email:", parsed.client_email);
