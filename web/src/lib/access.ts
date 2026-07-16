export function isSignaturesPublic(): boolean {
  return (process.env.SIGNATURES_PUBLIC || "false").toLowerCase() === "true";
}

export function getAccessPassword(): string {
  return process.env.ACCESS_PASSWORD || "";
}

export function hasAccessPassword(): boolean {
  return Boolean(getAccessPassword());
}
