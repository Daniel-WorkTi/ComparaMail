import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { auth, isAdminEmail } from "@/auth";
import { getAccessPassword, isSignaturesPublic } from "@/lib/access";
import { isProductionRuntime, safeEqualString } from "@/lib/security";

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

export async function createPasswordSession() {
  const token = await new SignJWT({ access: "ok" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionRuntime(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyPasswordSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
}

async function hasPasswordSession(): Promise<boolean> {
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
  // Em produção nunca permitir bypass público
  if (isSignaturesPublic()) {
    if (isProductionRuntime()) return false;
    return true;
  }

  const session = await auth();
  if (session?.user?.email) return true;

  return hasPasswordSession();
}

export async function isAdminUser(): Promise<boolean> {
  const session = await auth();
  if (session?.user?.email && isAdminEmail(session.user.email)) return true;

  // Password partilhada NUNCA concede admin em produção
  if (
    !isProductionRuntime() &&
    (await hasPasswordSession()) &&
    getAccessPassword()
  ) {
    return true;
  }

  return false;
}

/** Email da sessão Google ou null (password local não tem email). */
export async function sessionEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  return email || null;
}

/**
 * Não-admin só acede à própria assinatura.
 * Admin (ou password local em dev) acede a todas.
 */
export async function canAccessPersonEmail(
  personEmail?: string | null,
): Promise<boolean> {
  if (await isAdminUser()) return true;
  const mine = await sessionEmail();
  if (!mine || !personEmail) return false;
  return mine === personEmail.toLowerCase().trim();
}

export function checkPassword(password: string): boolean {
  const expected = getAccessPassword();
  if (!expected || !password) return false;
  // Em produção a API já bloqueia; reforço extra
  if (isProductionRuntime()) return false;
  return safeEqualString(password, expected);
}
