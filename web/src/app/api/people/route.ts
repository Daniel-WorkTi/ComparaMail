import { NextResponse } from "next/server";
import { isAdminUser, isAuthenticated } from "@/lib/auth";
import {
  createPerson,
  getSettings,
  listPeople,
  updateSettings,
} from "@/lib/people";
import { storageMode } from "@/lib/storage";
import type { CompanySettings, PersonInput } from "@/lib/types";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = await isAdminUser();
  const people = await listPeople(admin);
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
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
  }

  const body = (await request.json()) as {
    type?: "person" | "settings";
    person?: PersonInput;
    settings?: Partial<CompanySettings>;
  };

  if (body.type === "settings" && body.settings) {
    const settings = await updateSettings(body.settings);
    return NextResponse.json({ settings });
  }

  if (!body.person?.name || !body.person?.title || !body.person?.photoUrl) {
    return NextResponse.json(
      { error: "Nome, cargo e foto são obrigatórios" },
      { status: 400 },
    );
  }

  const person = await createPerson(body.person);
  return NextResponse.json({ person }, { status: 201 });
}
