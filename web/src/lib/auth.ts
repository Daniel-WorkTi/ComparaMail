import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { auth, isAdminEmail } from "@/auth";
import { isSignaturesPublic } from "@/lib/access";
import { isProductionRuntime } from "@/lib/security";

const ACCESS_COOKIE = "cj_app_access";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (isProductionRuntime()) {
      throw new Error("AUTH_SECRET é obrigatório em produção");
    }
    return new TextEncoder().encode("comparaja-dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

/** Limpa cookie legado de password (sessões antigas). */
export async function destroyPasswordSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
}

async function hasLegacyPasswordSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  if (isSignaturesPublic()) {
    if (isProductionRuntime()) return false;
    return true;
  }

  const session = await auth();
  if (session?.user?.email) return true;

  // Sessão password legada: não autentica (força re-login Google)
  if (await hasLegacyPasswordSession()) {
    await destroyPasswordSession();
  }
  return false;
}

/** Admin só se o email Google estiver em ADMIN_EMAILS. */
export async function isAdminUser(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return false;
  return isAdminEmail(email);
}

export async function sessionEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  return email || null;
}

export async function canAccessPersonEmail(
  personEmail?: string | null,
): Promise<boolean> {
  if (await isAdminUser()) return true;
  const mine = await sessionEmail();
  if (!mine || !personEmail) return false;
  return mine === personEmail.toLowerCase().trim();
}
