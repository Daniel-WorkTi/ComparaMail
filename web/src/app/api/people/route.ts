import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import {
  createPerson,
  getSettings,
  listPeopleForViewer,
  updateSettings,
} from "@/lib/people";
import { assertMutatingOrigin, jsonPrivate } from "@/lib/security";
import {
  parseJsonSafe,
  personPostEnvelopeSchema,
  settingsPostEnvelopeSchema,
  zodErrorMessage,
} from "@/lib/schemas";
import { storageMode } from "@/lib/storage";

const MAX_BODY_BYTES = 200_000;

function withNoStore(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return withNoStore(access.response);

  const people = await listPeopleForViewer({
    isAdmin: true,
    viewerEmail: access.email,
    includeInactive: true,
  });
  const settings = await getSettings();
  return jsonPrivate({
    people,
    settings,
    storageMode: storageMode(),
    authenticated: true,
    isAdmin: true,
  });
}

export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return jsonPrivate({ error: "Origem não permitida" }, { status: 403 });
  }

  const access = await requireAdmin();
  if (!access.ok) return withNoStore(access.response);

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

  if (
    body &&
    typeof body === "object" &&
    (body as { type?: string }).type === "settings"
  ) {
    const parsed = settingsPostEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonPrivate(
        { error: zodErrorMessage(parsed.error) },
        { status: 400 },
      );
    }
    const settings = await updateSettings(parsed.data.settings);
    return jsonPrivate({ settings });
  }

  const parsed = personPostEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonPrivate(
      { error: zodErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  const person = await createPerson(parsed.data.person);
  return jsonPrivate({ person }, { status: 201 });
}
