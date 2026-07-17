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

function allowedDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN || "comparaja.pt")
    .toLowerCase()
    .replace(/^@/, "");
}

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

function imageResponse(
  bytes: Buffer,
  contentType: string,
  cachePublic: boolean,
) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cachePublic
        ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
        : "private, max-age=3600",
    },
  });
}

/**
 * Foto de perfil Google Workspace (a mesma do Gmail).
 * Acesso:
 * - domínio @comparaja.pt (público, rate-limited) — para Gmail
 * - ou sessão autenticada
 * - ou URL assinada (legado)
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

  const domain = allowedDomain();
  const isCompanyEmail = email.endsWith(`@${domain}`);
  if (!isCompanyEmail) {
    return NextResponse.json({ error: "Email não permitido" }, { status: 403 });
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

  // Empresa: permite sem cookie (Gmail). Rate limit forte.
  const companyPublic = isCompanyEmail;
  if (!signedOk && !authed && !companyPublic) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const limited = consumeLoginAttempt(
    `wphoto:${clientIp(request)}`,
    signedOk || authed ? 180 : 60,
    60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const local = await readLocalWorkspacePhoto(email);
  if (local) {
    return imageResponse(local.bytes, local.contentType, true);
  }

  const fromGoogle = await fetchWorkspacePhotoBytes(email);
  if (fromGoogle && fromGoogle.bytes.byteLength <= MAX_BYTES) {
    // Cache em disco em runtime (dev e prod se filesystem permitir)
    try {
      const { mkdir, writeFile } = await import("fs/promises");
      const ext = fromGoogle.contentType.includes("png") ? "png" : "jpg";
      const safeName = email.replace(/[^a-z0-9@._-]/gi, "_");
      const dir = path.join(process.cwd(), "public", "workspace-photos");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${safeName}.${ext}`), fromGoogle.bytes);
    } catch {
      // Vercel serverless pode não persistir — ok
    }
    return imageResponse(fromGoogle.bytes, fromGoogle.contentType, true);
  }

  return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
}
