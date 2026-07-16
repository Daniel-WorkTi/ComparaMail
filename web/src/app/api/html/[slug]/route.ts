import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getPersonBySlug, getSettings } from "@/lib/people";
import { renderSignatureHtml } from "@/lib/template";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  const settings = await getSettings();
  const html = renderSignatureHtml(person, settings);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
