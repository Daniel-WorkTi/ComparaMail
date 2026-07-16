import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { get, list, put } from "@vercel/blob";
import type { StoreData } from "./types";

const BLOB_NAME = "assinaturas-data.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "people.json");

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readSeed(): Promise<StoreData> {
  const raw = await readFile(LOCAL_PATH, "utf8");
  return JSON.parse(raw) as StoreData;
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
  const payload = JSON.stringify(data, null, 2);

  if (hasBlob()) {
    // Privado: não fica URL pública com emails/fotos da equipa
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
