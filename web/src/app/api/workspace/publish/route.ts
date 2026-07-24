import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import {
  publishGmailSignature,
  workspaceConfigured,
} from "@/lib/google-workspace";
import { getPersonBySlug, getSettings, listPeople } from "@/lib/people";
import { publicAppOrigin } from "@/lib/photos-server";
import { resolveAppOrigin } from "@/lib/origin";
import { assertMutatingOrigin } from "@/lib/security";
import { renderSignatureHtml, GMAIL_SIGNATURE_MAX_CHARS } from "@/lib/template";

type Body = {
  slug?: string;
  all?: boolean;
};

export async function POST(request: Request) {
  try {
    if (!assertMutatingOrigin(request)) {
      return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
    }
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    if (!workspaceConfigured()) {
      return NextResponse.json(
        { error: "Integração Google não disponível." },
        { status: 400 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const [settings, rawOrigin] = await Promise.all([
      getSettings(),
      resolveAppOrigin(),
    ]);
    // Gmail nunca pode usar localhost — fotos/logos têm de ser HTTPS públicos
    const origin = publicAppOrigin(rawOrigin);

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
        if (html.length > GMAIL_SIGNATURE_MAX_CHARS) {
          throw new Error(
            `Assinatura demasiado longa (${html.length}/${GMAIL_SIGNATURE_MAX_CHARS} chars). Encurta cargo/URL da foto.`,
          );
        }
        await publishGmailSignature(email, html);
        published.push(email);
      } catch (error) {
        console.error("[workspace/publish]", email, error);
        errors.push(email);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      brandName,
      published: published.length,
      emails: published,
      failedCount: errors.length,
    });
  } catch (error) {
    console.error("[workspace/publish]", error);
    return NextResponse.json(
      {
        error: "Não foi possível publicar as assinaturas.",
        published: 0,
        failedCount: 0,
      },
      { status: 500 },
    );
  }
}
