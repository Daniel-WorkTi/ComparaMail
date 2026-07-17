import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import {
  publishGmailSignature,
  workspaceConfigured,
} from "@/lib/google-workspace";
import { getPersonBySlug, getSettings, listPeople } from "@/lib/people";
import { resolveAppOrigin } from "@/lib/origin";
import { assertMutatingOrigin } from "@/lib/security";
import { renderSignatureHtml } from "@/lib/template";

type Body = {
  slug?: string;
  all?: boolean;
};

export async function POST(request: Request) {
  try {
    if (!assertMutatingOrigin(request)) {
      return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
    }
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: "Sem permissão de admin" }, { status: 403 });
    }
    if (!workspaceConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Workspace não configurado. Define GOOGLE_SERVICE_ACCOUNT_FILE/.secrets ou JSON + GOOGLE_WORKSPACE_ADMIN_EMAIL.",
        },
        { status: 400 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const [settings, origin] = await Promise.all([
      getSettings(),
      resolveAppOrigin(),
    ]);

    const targets = body.all
      ? (await listPeople(true)).filter((p) => (p.email || "").trim())
      : body.slug
        ? await (async () => {
            const person = await getPersonBySlug(body.slug!, {
              includeInactive: true,
            });
            return person ? [person] : [];
          })()
        : [];

    if (!targets.length) {
      return NextResponse.json(
        {
          error: body.slug
            ? "Pessoa não encontrada"
            : "Ninguém com email para publicar",
        },
        { status: 404 },
      );
    }

    const brandName =
      (process.env.GMAIL_SIGNATURE_NAME || "MailCJ2026").trim() || "MailCJ2026";
    const published: string[] = [];
    const errors: string[] = [];

    for (const person of targets) {
      const email = (person.email || "").trim();
      if (!email) {
        errors.push(`${person.name}: sem email`);
        continue;
      }
      try {
        const html = renderSignatureHtml(person, settings, {
          origin,
          mode: "email",
        });
        await publishGmailSignature(email, html);
        published.push(email);
      } catch (error) {
        errors.push(
          `${email}: ${error instanceof Error ? error.message : "erro"}`,
        );
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      brandName,
      published: published.length,
      emails: published,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao publicar no Gmail",
        published: 0,
        errors: [],
      },
      { status: 500 },
    );
  }
}
