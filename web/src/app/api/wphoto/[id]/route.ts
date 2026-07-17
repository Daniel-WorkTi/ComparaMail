import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { fetchWorkspacePhotoBytes } from "@/lib/google-workspace";
import {
  emailFromWorkspacePhotoToken,
  verifyWorkspacePhotoToken,
} from "@/lib/photo-sign";
import { clientIp, consumeLoginAttempt } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 2_000_000;

async function readLocalWorkspacePhoto(
  email: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const safeName = email.replace(/[^a-z0-9@._-]/gi, "_");
  const dir = path.join(process.cwd(), "public", "workspace-photos");
  for (const [ext, contentType] of [
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["webp", "image/webp"],
  ] as const) {
    const file = path.join(dir, `${safeName}.${ext}`);
    if (!existsSync(file)) continue;
    const bytes = await readFile(file);
    if (bytes.byteLength > MAX_BYTES) return null;
    return { bytes, contentType };
  }
  return null;
}

/**
 * Foto Workspace para UI e Gmail.
 * Auth por sessão OU URL assinada (HMAC).
 * Ordem: ficheiro local (dev) → Directory API.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const email = emailFromWorkspacePhotoToken(id);
  if (!email) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("e") || "");
  const sig = url.searchParams.get("s");
  const signedOk = verifyWorkspacePhotoToken(id, exp, sig);

  let authed = false;
  if (!signedOk) {
    try {
      authed = await isAuthenticated();
    } catch {
      authed = false;
    }
  }

  if (!signedOk && !authed) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (signedOk) {
    const limited = consumeLoginAttempt(`wphoto:${clientIp(request)}`, 120, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiados pedidos" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }
  }

  const local = await readLocalWorkspacePhoto(email);
  if (local) {
    return new NextResponse(new Uint8Array(local.bytes), {
      headers: {
        "Content-Type": local.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": signedOk
          ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
          : "private, max-age=3600",
      },
    });
  }

  const fromGoogle = await fetchWorkspacePhotoBytes(email);
  if (fromGoogle && fromGoogle.bytes.byteLength <= MAX_BYTES) {
    return new NextResponse(new Uint8Array(fromGoogle.bytes), {
      headers: {
        "Content-Type": fromGoogle.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": signedOk
          ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
          : "private, max-age=3600",
      },
    });
  }

  return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
}
