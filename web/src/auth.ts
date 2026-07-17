import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "comparaja.pt")
  .toLowerCase()
  .replace(/^@/, "")
  .replace(/^["']|["']$/g, "");

const googleReady = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Fail-closed: ADMIN_EMAILS vazio = ninguém é admin (dev e produção).
 * Não concede admin só por domínio.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = parseAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase().trim());
}

type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
  hd?: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : "comparaja-dev-secret-change-me"),
  providers: googleReady
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: {
              hd: ALLOWED_DOMAIN,
              prompt: "select_account",
            },
          },
        }),
      ]
    : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      const p = profile as GoogleProfile | undefined;
      if (!p) return false;
      if (p.email_verified !== true) return false;
      if ((p.hd || "").toLowerCase() !== ALLOWED_DOMAIN) return false;
      const email = (p.email || "").toLowerCase().trim();
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
      return true;
    },
    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toLowerCase().trim();
      if (email) {
        token.email = email;
      }
      // Recalcular em cada pedido — ADMIN_EMAILS pode mudar sem re-login
      token.isAdmin = isAdminEmail(
        (token.email as string | undefined) || null,
      );
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || session.user.email;
        // Recalcular a partir de ADMIN_EMAILS (não só JWT stale)
        session.user.isAdmin = isAdminEmail(session.user.email);
      }
      return session;
    },
  },
  trustHost: true,
});

export { googleReady, ALLOWED_DOMAIN };
