import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { deletePerson, updatePerson } from "@/lib/people";
import { assertMutatingOrigin, jsonPrivate } from "@/lib/security";
import {
  parseJsonSafe,
  personUpdateSchema,
  zodErrorMessage,
} from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

const MAX_BODY_BYTES = 100_000;

function withNoStore(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

export async function PUT(request: Request, { params }: Params) {
  if (!assertMutatingOrigin(request)) {
    return jsonPrivate({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return withNoStore(access.response);

  const { id } = await params;
  if (!/^[\w-]{1,80}$/.test(id)) {
    return jsonPrivate({ error: "ID inválido" }, { status: 400 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonPrivate({ error: "Pedido demasiado grande" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = parseJsonSafe(raw);
  } catch {
    return jsonPrivate({ error: "Pedido inválido" }, { status: 400 });
  }

  const parsed = personUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonPrivate(
      { error: zodErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const person = await updatePerson(id, parsed.data);
    return jsonPrivate({ person });
  } catch (error) {
    return jsonPrivate(
      { error: error instanceof Error ? error.message : "Erro" },
      { status: 404 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!assertMutatingOrigin(request)) {
    return jsonPrivate({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return withNoStore(access.response);

  const { id } = await params;
  if (!/^[\w-]{1,80}$/.test(id)) {
    return jsonPrivate({ error: "ID inválido" }, { status: 400 });
  }

  await deletePerson(id);
  return jsonPrivate({ ok: true });
}
