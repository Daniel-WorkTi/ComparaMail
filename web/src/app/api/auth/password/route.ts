import { NextResponse } from "next/server";
import { jsonPrivate } from "@/lib/security";

/** Login por password removido — só Google Workspace @comparaja.pt. */
export async function POST() {
  return jsonPrivate({ error: "Login por password desativado" }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: "Login por password desativado" }, { status: 404 });
}
