import { NextResponse } from "next/server";
import { checkPassword, createPasswordSession } from "@/lib/auth";
import { hasAccessPassword } from "@/lib/access";

export async function POST(request: Request) {
  if (!hasAccessPassword()) {
    return NextResponse.json(
      { error: "ACCESS_PASSWORD não está definido no .env.local" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { password?: string };
  if (!body.password || !checkPassword(body.password)) {
    return NextResponse.json({ error: "Password incorreta" }, { status: 401 });
  }

  await createPasswordSession();
  return NextResponse.json({ ok: true });
}
