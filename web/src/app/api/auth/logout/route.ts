import { NextResponse } from "next/server";
import { destroyPasswordSession } from "@/lib/auth";
import { assertMutatingOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!assertMutatingOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  await destroyPasswordSession();
  return NextResponse.json({ ok: true });
}
