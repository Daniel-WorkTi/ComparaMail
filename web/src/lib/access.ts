export function isSignaturesPublic(): boolean {
  return (process.env.SIGNATURES_PUBLIC || "false").toLowerCase() === "true";
}
