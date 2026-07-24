import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { get, list, put } from "@vercel/blob";
import type { CompanySettings, StoreData } from "./types";

const BLOB_NAME = "assinaturas-data.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "people.json");

const DEFAULT_SETTINGS: CompanySettings = {
  logoUrl: "",
  website: "https://www.comparaja.pt",
  websiteLabel: "www.comparaja.pt",
  address: "Praça de Alvalade 6, 6º F, 1700-036 Lisboa",
  addressMapsUrl:
    "https://maps.google.com/?q=Praça de Alvalade 6, 6º F, 1700-036 Lisboa",
  companyName: "ComparaJá",
  brandColor: "#45668E",
  instagramUrl: "https://instagram.com/comparaja",
  facebookUrl: "https://www.facebook.com/ComparaJa",
  linkedinUrl: "https://www.linkedin.com/company/compara-ja/",
};

function emptyStore(): StoreData {
  return {
    settings: { ...DEFAULT_SETTINGS },
    people: [],
  };
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readSeed(): Promise<StoreData> {
  try {
    const raw = await readFile(LOCAL_PATH, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    // Em Vercel o ficheiro local não existe (PII fora do git) — arranque vazio
    return emptyStore();
  }
}

async function parseJsonStream(stream: ReadableStream<Uint8Array>): Promise<StoreData> {
  const text = await new Response(stream).text();
  return JSON.parse(text) as StoreData;
}

async function readFromBlob(): Promise<StoreData | null> {
  try {
    const privateBlob = await get(BLOB_NAME, { access: "private", useCache: false });
    if (privateBlob?.stream) {
      return parseJsonStream(privateBlob.stream);
    }
  } catch {
    // Pode ainda existir blob legado público — fallback abaixo
  }

  const { blobs } = await list({ prefix: BLOB_NAME });
  const file = blobs.find((b) => b.pathname === BLOB_NAME);
  if (!file) return null;

  try {
    const viaSdk = await get(file.url, { access: "private", useCache: false });
    if (viaSdk?.stream) {
      return parseJsonStream(viaSdk.stream);
    }
  } catch {
    // Continua para fetch público legado
  }

  const res = await fetch(file.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as StoreData;
}

export async function getStore(): Promise<StoreData> {
  if (process.env.VERCEL && !hasBlob()) {
    throw new Error("Storage Blob obrigatório em produção.");
  }
  if (hasBlob()) {
    const fromBlob = await readFromBlob();
    if (fromBlob) return fromBlob;
    const seed = await readSeed();
    await saveStore(seed);
    return seed;
  }
  return readSeed();
}

export async function saveStore(data: StoreData): Promise<void> {
  if (process.env.VERCEL && !hasBlob()) {
    throw new Error("Storage Blob obrigatório em produção.");
  }
  const payload = JSON.stringify(data, null, 2);

  if (hasBlob()) {
    await put(BLOB_NAME, payload, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }

  await mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, payload, "utf8");
}

export function storageMode(): "blob" | "file" {
  return hasBlob() ? "blob" : "file";
}
