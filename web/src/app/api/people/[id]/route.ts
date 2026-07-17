import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { deletePerson, updatePerson } from "@/lib/people";
import { assertMutatingOrigin, safeImageUrl } from "@/lib/security";
import type { PersonInput } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const MAX_BODY_BYTES = 100_000;

export async function PUT(request: Request, { params }: Params) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await params;
  if (!/^[\w-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Pedido demasiado grande" }, { status: 413 });
  }

  let body: Partial<PersonInput>;
  try {
    body = JSON.parse(raw) as Partial<PersonInput>;
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  if (body.photoUrl !== undefined) {
    body.photoUrl = safeImageUrl(body.photoUrl);
    if (!body.photoUrl) {
      return NextResponse.json({ error: "URL de foto inválida" }, { status: 400 });
    }
  }

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

export async function DELETE(request: Request, { params }: Params) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await params;
  if (!/^[\w-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await deletePerson(id);
  return NextResponse.json({ ok: true });
}
