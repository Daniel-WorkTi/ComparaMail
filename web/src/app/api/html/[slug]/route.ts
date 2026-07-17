import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { canAccessPersonEmail } from "@/lib/auth";
import { getPersonBySlug, getSettings } from "@/lib/people";
import { resolveAppOrigin } from "@/lib/origin";
import { renderSignatureHtml } from "@/lib/template";

type Params = { params: Promise<{ slug: string }> };

const HTML_SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src https: data:",
    "connect-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "sandbox",
  ].join("; "),
} as const;

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const person = await getPersonBySlug(slug);
  if (!person) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (!(await canAccessPersonEmail(person.email))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const [settings, origin] = await Promise.all([
    getSettings(),
    resolveAppOrigin(),
  ]);
  const html = renderSignatureHtml(person, settings, {
    origin,
    mode: "email",
  });
  return new NextResponse(html, {
    headers: {
      ...HTML_SECURITY_HEADERS,
      "Content-Disposition": `inline; filename="assinatura-${slug}.html"`,
    },
  });
}
