import { NextResponse } from "next/server";
import { destroyPasswordSession } from "@/lib/auth";

export async function POST() {
  await destroyPasswordSession();
  return NextResponse.json({ ok: true });
}
