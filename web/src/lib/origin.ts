import { headers } from "next/headers";
import { appOriginFromEnv } from "@/lib/photos";
import { isProductionRuntime } from "@/lib/security";

/** Resolve a origem pública estável — só Server Components / Route Handlers. */
export async function resolveAppOrigin(): Promise<string> {
  const fromEnv = appOriginFromEnv();
  if (fromEnv) return fromEnv;

  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "")
      .split(",")[0]
      ?.trim();
    // Aceitar só o domínio da app Vercel / localhost (anti Host poisoning)
    if (
      host === "comparamailpt.vercel.app" ||
      host.endsWith(".vercel.app") ||
      host.includes("localhost") ||
      host.startsWith("127.0.0.1")
    ) {
      const proto =
        host.includes("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https";
      return `${proto}://${host}`;
    }
  } catch {
    // ignore
  }

  if (isProductionRuntime() && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }

  if (isProductionRuntime()) {
    throw new Error("AUTH_URL (ou NEXTAUTH_URL) é obrigatório em produção");
  }

  return "http://localhost:3000";
}
