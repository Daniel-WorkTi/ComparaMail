import { isProductionRuntime } from "@/lib/security";

export function isSignaturesPublic(): boolean {
  return (process.env.SIGNATURES_PUBLIC || "false").toLowerCase() === "true";
}

export function getAccessPassword(): string {
  return process.env.ACCESS_PASSWORD || "";
}

/** Password de acesso só em desenvolvimento — em produção obriga Google OAuth. */
export function hasAccessPassword(): boolean {
  if (isProductionRuntime()) return false;
  return Boolean(getAccessPassword());
}
