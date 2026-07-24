import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { workspaceConfigured } from "@/lib/google-workspace";
import { assertMutatingOrigin } from "@/lib/security";
import { pushTitlesToWorkspace } from "@/lib/workspace-sync";

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
    const result = await pushTitlesToWorkspace();
    return NextResponse.json({
      ok: true,
      result: {
        updated: result.updated,
        skipped: result.skipped,
        failedCount: result.failed.length,
        googleUsers: result.googleUsers,
      },
    });
  } catch (error) {
    console.error("[workspace/push-titles]", error);
    return NextResponse.json(
      { error: "Não foi possível actualizar os cargos." },
      { status: 500 },
    );
  }
}
