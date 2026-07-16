import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import {
  mergeImport,
  parseCsv,
  rowToPersonInput,
  type ImportRow,
} from "@/lib/import";
import { getStore, saveStore } from "@/lib/storage";
import type { PersonInput } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const body = (await request.json()) as {
    csv?: string;
    mode?: "skip" | "update";
    rows?: ImportRow[];
  };

  const mode = body.mode === "update" ? "update" : "skip";
  const store = await getStore();
  const fallbackPhoto = store.settings.logoUrl;

  let inputs: PersonInput[] = [];

  if (body.rows?.length) {
    inputs = body.rows
      .map((row) => rowToPersonInput(row, fallbackPhoto))
      .filter((p): p is PersonInput => p !== null);
  } else if (body.csv?.trim()) {
    try {
      const rows = parseCsv(body.csv);
      inputs = rows
        .map((row) => rowToPersonInput(row, fallbackPhoto))
        .filter((p): p is PersonInput => p !== null);
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
