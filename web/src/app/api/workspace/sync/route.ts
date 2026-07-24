import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { workspaceConfigured } from "@/lib/google-workspace";
import { assertMutatingOrigin } from "@/lib/security";
import { syncEmailsAndTitlesFromWorkspace } from "@/lib/workspace-sync";

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) {
    return NextResponse.json(
      { configured: false, isAdmin: false, error: "Sem permissão" },
      { status: 403 },
    );
  }
  return NextResponse.json({
    configured: workspaceConfigured(),
    isAdmin: true,
  });
}

export async function POST(request: Request) {
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

  try {
    const result = await syncEmailsAndTitlesFromWorkspace();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[workspace/sync]", error);
    return NextResponse.json(
      { error: "Não foi possível sincronizar." },
      { status: 500 },
    );
  }
}
