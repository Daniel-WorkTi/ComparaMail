/** Deteção de ambiente — sem dependências Node (seguro para Edge/middleware). */
export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}
