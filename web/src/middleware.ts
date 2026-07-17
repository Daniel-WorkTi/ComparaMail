import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProductionRuntime } from "@/lib/runtime";

export function middleware(request: NextRequest) {
  // Bloqueia modo público acidental em produção
  if (
    isProductionRuntime() &&
    (process.env.SIGNATURES_PUBLIC || "").toLowerCase() === "true"
  ) {
    return new NextResponse(
      "SIGNATURES_PUBLIC não é permitido em produção.",
      { status: 500 },
    );
  }

  // AUTH_URL obrigatório em produção (anti Host-header poisoning)
  // VERCEL_URL é definido pela plataforma e é fiável como fallback
  if (
    isProductionRuntime() &&
    !process.env.AUTH_URL &&
    !process.env.NEXTAUTH_URL &&
    !process.env.VERCEL_URL
  ) {
    return new NextResponse(
      "AUTH_URL (ou NEXTAUTH_URL) é obrigatório em produção.",
      { status: 500 },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  const path = request.nextUrl.pathname;
  const privatePath =
    path === "/" ||
    path.startsWith("/admin") ||
    path.startsWith("/s/") ||
    path.startsWith("/api/people") ||
    path.startsWith("/api/workspace") ||
    path.startsWith("/api/auth/password") ||
    path.startsWith("/api/auth/logout");
  if (privatePath) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (isProductionRuntime()) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|help/).*)",
  ],
};
