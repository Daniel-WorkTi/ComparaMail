import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import {
  workspaceConfigDebug,
  workspaceConfigured,
} from "@/lib/google-workspace";
import { assertMutatingOrigin } from "@/lib/security";
import { syncEmailsAndTitlesFromWorkspace } from "@/lib/workspace-sync";

export async function GET() {
  const debug = workspaceConfigDebug();
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json(
      {
        configured: debug.configured,
        isAdmin: false,
        debug,
        error: "Sem permissão de admin",
      },
      { status: 403 },
    );
  }
  return NextResponse.json({
    configured: debug.configured,
    isAdmin: true,
    debug,
  });
}

export async function POST(request: Request) {
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
          "Google Workspace não configurado. Define GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_WORKSPACE_ADMIN_EMAIL.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await syncEmailsAndTitlesFromWorkspace();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no sync" },
      { status: 500 },
    );
  }
}
