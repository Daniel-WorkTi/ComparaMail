import { checkPassword, createPasswordSession } from "@/lib/auth";
import { hasAccessPassword } from "@/lib/access";
import {
  assertMutatingOrigin,
  clientIp,
  consumeLoginAttempt,
  isProductionRuntime,
  jsonPrivate,
} from "@/lib/security";

export async function POST(request: Request) {
  if (isProductionRuntime()) {
    return jsonPrivate(
      { error: "Login por password desativado em produção" },
      { status: 403 },
    );
  }

  if (!assertMutatingOrigin(request)) {
    return jsonPrivate({ error: "Origem não permitida" }, { status: 403 });
  }

  if (!hasAccessPassword()) {
    return jsonPrivate({ error: "Login indisponível" }, { status: 400 });
  }

  const ip = clientIp(request);
  const limited = consumeLoginAttempt(`pwd:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return jsonPrivate(
      { error: "Demasiadas tentativas. Tenta mais tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return jsonPrivate({ error: "Pedido inválido" }, { status: 400 });
  }

  if (!body.password || !checkPassword(body.password)) {
    return jsonPrivate({ error: "Credenciais inválidas" }, { status: 401 });
  }

  await createPasswordSession();
  return jsonPrivate({ ok: true });
}
