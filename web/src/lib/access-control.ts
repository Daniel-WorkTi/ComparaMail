import { NextResponse } from "next/server";
import { isAdminEmail } from "@/auth";
import { isAuthenticated, sessionEmail } from "@/lib/auth";

export type AccessOk = {
  ok: true;
  email: string | null;
  isAdmin: boolean;
};

export type AccessDenied = {
  ok: false;
  response: NextResponse;
};

export type AccessResult = AccessOk | AccessDenied;

/** Qualquer utilizador autenticado (Google ou password local em non-prod). */
export async function requireUser(): Promise<AccessResult> {
  if (!(await isAuthenticated())) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const email = await sessionEmail();
  // Fonte de verdade: ADMIN_EMAILS. Password sem email = nunca admin.
  const isAdmin = email ? isAdminEmail(email) : false;

  return { ok: true, email, isAdmin };
}

/** Só emails listados em ADMIN_EMAILS. Lista vazia = ninguém. */
export async function requireAdmin(): Promise<AccessResult> {
  const user = await requireUser();
  if (!user.ok) return user;

  if (!user.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sem permissão de admin" },
        { status: 403 },
      ),
    };
  }

  return user;
}
