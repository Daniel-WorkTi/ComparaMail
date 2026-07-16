import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { auth, isAdminEmail } from "@/auth";
import { getAccessPassword, isSignaturesPublic } from "@/lib/access";

const ACCESS_COOKIE = "cj_app_access";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
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
    secure: process.env.NODE_ENV === "production",
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
  if (isSignaturesPublic()) return true;

  const session = await auth();
  if (session?.user?.email) return true;

  return hasPasswordSession();
}

export async function isAdminUser(): Promise<boolean> {
  const session = await auth();
  if (session?.user?.email && isAdminEmail(session.user.email)) return true;

  // Em local, quem entra com ACCESS_PASSWORD também administra
  if ((await hasPasswordSession()) && getAccessPassword()) return true;

  return false;
}

export function checkPassword(password: string): boolean {
  const expected = getAccessPassword();
  return Boolean(expected) && password === expected;
}
