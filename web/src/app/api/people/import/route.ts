import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import {
  mergeImport,
  parseCsv,
  rowToPersonInput,
} from "@/lib/import";
import { assertMutatingOrigin, jsonPrivate, safeImageUrl } from "@/lib/security";
import {
  importBodySchema,
  importRowSchema,
  parseJsonSafe,
  zodErrorMessage,
} from "@/lib/schemas";
import { getStore, saveStore } from "@/lib/storage";
import type { PersonInput } from "@/lib/types";

const MAX_CSV_BYTES = 500_000;
const MAX_ROWS = 500;

function withNoStore(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

function validateAllRows(
  rows: unknown[],
  fallbackPhoto: string,
): { ok: true; inputs: PersonInput[] } | { ok: false; error: string } {
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `Máximo de ${MAX_ROWS} linhas por importação` };
  }

  const inputs: PersonInput[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = importRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push(`Linha ${i + 1}: ${zodErrorMessage(parsed.error)}`);
      continue;
    }
    const person = rowToPersonInput(
      {
        email: parsed.data.email,
        name: parsed.data.name,
        title: parsed.data.title,
        photo: parsed.data.photo,
        phone: parsed.data.phone || "",
      },
      fallbackPhoto,
    );
    if (!person) {
      errors.push(`Linha ${i + 1}: nome/cargo em falta`);
      continue;
    }
    const photoUrl = safeImageUrl(person.photoUrl) || safeImageUrl(fallbackPhoto);
    if (!photoUrl) {
      errors.push(`Linha ${i + 1}: URL de foto inválida`);
      continue;
    }
    inputs.push({ ...person, photoUrl });
  }

  if (errors.length) {
    return {
      ok: false,
      error: `Importação rejeitada (${errors.length} erro(s)). ${errors.slice(0, 5).join(" · ")}`,
    };
  }
  if (!inputs.length) {
    return { ok: false, error: "Nenhuma linha válida para importar" };
  }
  return { ok: true, inputs };
}

export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return jsonPrivate({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return withNoStore(access.response);

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_CSV_BYTES + 80_000) {
    return jsonPrivate({ error: "Pedido demasiado grande" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = parseJsonSafe(raw);
  } catch {
    return jsonPrivate({ error: "Pedido inválido" }, { status: 400 });
  }

  const envelope = importBodySchema.safeParse(body);
  if (!envelope.success) {
    return jsonPrivate(
      { error: zodErrorMessage(envelope.error) },
      { status: 400 },
    );
  }

  const mode = envelope.data.mode === "update" ? "update" : "skip";
  const store = await getStore();
  const fallbackPhoto = store.settings.logoUrl;

  let rows: unknown[] = [];

  if (envelope.data.rows?.length) {
    rows = envelope.data.rows;
  } else if (envelope.data.csv?.trim()) {
    const csv = envelope.data.csv;
    if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
      return jsonPrivate(
        { error: `CSV demasiado grande (máx. ${MAX_CSV_BYTES} bytes)` },
        { status: 413 },
      );
    }
    try {
      rows = parseCsv(csv);
    } catch (error) {
      return jsonPrivate(
        { error: error instanceof Error ? error.message : "CSV inválido" },
        { status: 400 },
      );
    }
  }

  const validated = validateAllRows(rows, fallbackPhoto);
  if (!validated.ok) {
    return jsonPrivate({ error: validated.error }, { status: 400 });
  }

  const { people, result } = mergeImport(store.people, validated.inputs, mode);
  store.people = people;
  await saveStore(store);

  return jsonPrivate({ ok: true, result, total: people.length });
}
