import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "comparaja.pt")
  .toLowerCase()
  .replace(/^@/, "");

const googleReady = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

function isCompanyEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith(`@${ALLOWED_DOMAIN}`);
}

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!isCompanyEmail(email)) return false;
  const admins = parseAdminEmails();
  // Se ADMIN_EMAILS estiver vazio, toda a empresa pode administrar
  if (admins.length === 0) return true;
  return admins.includes(email!.toLowerCase().trim());
}

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
    async signIn({ user }) {
      return isCompanyEmail(user.email);
    },
    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toLowerCase();
      if (email) {
        token.email = email;
        token.isAdmin = isAdminEmail(email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || session.user.email;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  trustHost: true,
});

export { googleReady };
