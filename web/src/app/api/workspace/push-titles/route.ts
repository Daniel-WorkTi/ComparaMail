import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { workspaceConfigured } from "@/lib/google-workspace";
import { assertMutatingOrigin } from "@/lib/security";
import { pushTitlesToWorkspace } from "@/lib/workspace-sync";

/**
 * Envia cargos da app → Google Workspace Directory.
 * Requer scope admin.directory.user na delegação do domínio.
 */
export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  if (!workspaceConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Workspace não configurado. Define GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_WORKSPACE_ADMIN_EMAIL.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await pushTitlesToWorkspace();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao enviar cargos",
      },
      { status: 500 },
    );
  }
}
