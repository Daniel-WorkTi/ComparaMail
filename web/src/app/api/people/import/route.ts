import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import {
  mergeImport,
  parseCsv,
  rowToPersonInput,
  type ImportRow,
} from "@/lib/import";
import { assertMutatingOrigin, safeImageUrl } from "@/lib/security";
import { getStore, saveStore } from "@/lib/storage";
import type { PersonInput } from "@/lib/types";

const MAX_CSV_CHARS = 1_000_000;
const MAX_ROWS = 500;

export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_CSV_CHARS + 50_000) {
    return NextResponse.json({ error: "Pedido demasiado grande" }, { status: 413 });
  }

  let body: {
    csv?: string;
    mode?: "skip" | "update";
    rows?: ImportRow[];
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const mode = body.mode === "update" ? "update" : "skip";
  const store = await getStore();
  const fallbackPhoto = store.settings.logoUrl;

  let inputs: PersonInput[] = [];

  if (body.rows?.length) {
    if (body.rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_ROWS} linhas por importação` },
        { status: 400 },
      );
    }
    inputs = body.rows
      .map((row) => rowToPersonInput(row, fallbackPhoto))
      .filter((p): p is PersonInput => p !== null)
      .map((p) => ({ ...p, photoUrl: safeImageUrl(p.photoUrl) || fallbackPhoto }));
  } else if (body.csv?.trim()) {
    if (body.csv.length > MAX_CSV_CHARS) {
      return NextResponse.json(
        { error: "CSV demasiado grande (máx. 1 MB)" },
        { status: 413 },
      );
    }
    try {
      const rows = parseCsv(body.csv);
      if (rows.length > MAX_ROWS) {
        return NextResponse.json(
          { error: `Máximo de ${MAX_ROWS} linhas por importação` },
          { status: 400 },
        );
      }
      inputs = rows
        .map((row) => rowToPersonInput(row, fallbackPhoto))
        .filter((p): p is PersonInput => p !== null)
        .map((p) => ({ ...p, photoUrl: safeImageUrl(p.photoUrl) || fallbackPhoto }));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "CSV inválido" },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "Envia csv ou rows" }, { status: 400 });
  }

  const { people, result } = mergeImport(store.people, inputs, mode);
  store.people = people;
  await saveStore(store);

  return NextResponse.json({ ok: true, result, total: people.length });
}
