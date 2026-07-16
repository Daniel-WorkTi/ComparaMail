import { headers } from "next/headers";
import { appOriginFromEnv } from "@/lib/photos";
import { isProductionRuntime } from "@/lib/security";

/** Resolve a origem actual (env ou request) — só Server Components / Route Handlers. */
export async function resolveAppOrigin(): Promise<string> {
  const fromEnv = appOriginFromEnv();
  if (fromEnv) return fromEnv;

  if (isProductionRuntime()) {
    throw new Error("AUTH_URL (ou NEXTAUTH_URL) é obrigatório em produção");
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return "http://localhost:3000";
    // Em local só aceitar localhost
    if (!host.includes("localhost") && !host.startsWith("127.0.0.1")) {
      return "http://localhost:3000";
    }
    return `http://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}
