import { NextResponse } from "next/server";
import { isAdminUser, isAuthenticated, sessionEmail } from "@/lib/auth";
import {
  createPerson,
  getSettings,
  listPeopleForViewer,
  updateSettings,
} from "@/lib/people";
import { assertMutatingOrigin, safeHref, safeImageUrl } from "@/lib/security";
import { storageMode } from "@/lib/storage";
import type { CompanySettings, PersonInput } from "@/lib/types";

const MAX_BODY_BYTES = 200_000;

function sanitizeSettings(
  partial: Partial<CompanySettings>,
): Partial<CompanySettings> {
  const out: Partial<CompanySettings> = { ...partial };
  if (out.logoUrl !== undefined) out.logoUrl = safeImageUrl(out.logoUrl);
  if (out.website !== undefined) {
    out.website = safeHref(out.website, ["https:", "http:"]);
    if (out.website === "#") out.website = "";
  }
  if (out.addressMapsUrl !== undefined) {
    out.addressMapsUrl = safeHref(out.addressMapsUrl, ["https:", "http:"]);
    if (out.addressMapsUrl === "#") out.addressMapsUrl = "";
  }
  if (out.instagramUrl !== undefined) {
    out.instagramUrl = safeHref(out.instagramUrl, ["https:", "http:"]);
    if (out.instagramUrl === "#") out.instagramUrl = "";
  }
  if (out.facebookUrl !== undefined) {
    out.facebookUrl = safeHref(out.facebookUrl, ["https:", "http:"]);
    if (out.facebookUrl === "#") out.facebookUrl = "";
  }
  if (out.linkedinUrl !== undefined) {
    out.linkedinUrl = safeHref(out.linkedinUrl, ["https:", "http:"]);
    if (out.linkedinUrl === "#") out.linkedinUrl = "";
  }
  return out;
}

function sanitizePerson(person: PersonInput): PersonInput {
  return {
    ...person,
    photoUrl: safeImageUrl(person.photoUrl),
  };
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = await isAdminUser();
  const email = await sessionEmail();
  const people = await listPeopleForViewer({
    isAdmin: admin,
    viewerEmail: email,
    includeInactive: admin,
  });
  const settings = await getSettings();
  return NextResponse.json({
    people,
    settings: admin
      ? settings
      : {
          companyName: settings.companyName,
          brandColor: settings.brandColor,
        },
    storageMode: storageMode(),
    authenticated: true,
    isAdmin: admin,
  });
}

export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Pedido demasiado grande" }, { status: 413 });
  }

  let body: {
    type?: "person" | "settings";
    person?: PersonInput;
    settings?: Partial<CompanySettings>;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  if (body.type === "settings" && body.settings) {
    const settings = await updateSettings(sanitizeSettings(body.settings));
    return NextResponse.json({ settings });
  }

  if (!body.person?.name || !body.person?.title || !body.person?.photoUrl) {
    return NextResponse.json(
      { error: "Nome, cargo e foto são obrigatórios" },
      { status: 400 },
    );
  }

  const sanitized = sanitizePerson(body.person);
  if (!sanitized.photoUrl) {
    return NextResponse.json({ error: "URL de foto inválida" }, { status: 400 });
  }

  const person = await createPerson(sanitized);
  return NextResponse.json({ person }, { status: 201 });
}
