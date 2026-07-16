import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import { deletePerson, updatePerson } from "@/lib/people";
import type { PersonInput } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<PersonInput>;

  try {
    const person = await updatePerson(id, body);
    return NextResponse.json({ person });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro" },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const { id } = await params;
  await deletePerson(id);
  return NextResponse.json({ ok: true });
}
