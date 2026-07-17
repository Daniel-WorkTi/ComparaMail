import { googleReady, signIn } from "@/auth";
import { isSignaturesPublic } from "@/lib/access";
import { isAuthenticated } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/security";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.7-4.4 6.4-8.1 7.1l.1.1 6.2 5.2C36.1 39.1 44 33 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  if (await isAuthenticated()) {
    redirect("/");
  }

  const params = await searchParams;
  const denied =
    params.error === "AccessDenied" ||
    params.error === "Configuration" ||
    Boolean(params.error && params.error !== "CredentialsSignin");

  return (
    <main className="login-page">
      <div className="login-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-comparaja.png"
          alt="ComparaJá"
          className="login-logo"
        />

        <div className="login-card">
          <div className="text-center">
            <h1>Entrar</h1>
            <p className="login-card-lede">
              Utiliza a tua conta Google <strong>@comparaja.pt</strong> (Workspace).
            </p>
          </div>

          {isSignaturesPublic() && (
            <p className="login-alert login-alert-ok">Modo público ativo.</p>
          )}

          {denied && (
            <p className="login-alert login-alert-danger">
              Acesso negado. Só contas Google Workspace <strong>@comparaja.pt</strong>{" "}
              verificadas podem entrar. Contas Gmail pessoais não são aceites.
            </p>
          )}

          {!googleReady && (
            <p className="login-alert login-alert-warn">
              Google OAuth não configurado. Define <code>GOOGLE_CLIENT_ID</code> e{" "}
              <code>GOOGLE_CLIENT_SECRET</code> no ambiente.
            </p>
          )}

          <div className="login-actions">
            {googleReady && (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", {
                    redirectTo: safeRedirectPath(params.callbackUrl),
                  });
                }}
              >
                <button type="submit" className="login-btn-google">
                  <GoogleIcon />
                  Continuar com Google
                </button>
              </form>
            )}
          </div>

          <p className="login-secure">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 10V7a4 4 0 118 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Acesso reservado à equipa ComparaJá.
          </p>
        </div>
      </div>
    </main>
  );
}
