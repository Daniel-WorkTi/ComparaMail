import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { verifyPhotoToken } from "@/lib/photo-sign";
import { clientIp, consumeLoginAttempt } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const ID_RE = /^[a-zA-Z0-9_-]{10,120}$/;
const MAX_BYTES = 2_000_000;

async function fetchImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    const len = res.headers.get("content-length");
    if (len && Number(len) > MAX_BYTES) return null;
    return res;
  } catch {
    return null;
  }
}

/**
 * Proxy Drive: sessão autenticada OU URL assinada (HMAC) para Gmail.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("e") || "");
  const sig = url.searchParams.get("s");
  const signedOk = verifyPhotoToken(id, exp, sig);

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

  // Rate limit pedidos com token assinado (públicos na prática)
  if (signedOk) {
    const limited = consumeLoginAttempt(`photo:${clientIp(request)}`, 120, 60_000);
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

  const candidates = [
    `https://lh3.googleusercontent.com/d/${id}=s400`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
  ];

  for (const candidate of candidates) {
    const upstream = await fetchImage(candidate);
    if (!upstream) continue;

    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) continue;

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": signedOk
          ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
          : "private, max-age=3600",
      },
    });
  }

  return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
}
