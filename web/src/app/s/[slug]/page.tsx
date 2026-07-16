import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppFooter } from "@/components/AppFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { SignatureInstallPanel } from "@/components/SignatureInstallPanel";
import { SignaturePreview } from "@/components/SignaturePreview";
import {
  canAccessPersonEmail,
  isAdminUser,
  isAuthenticated,
} from "@/lib/auth";
import { getPersonByEmail, getPersonBySlug, getSettings } from "@/lib/people";
import { resolveAppOrigin } from "@/lib/origin";
import { renderSignatureHtml } from "@/lib/template";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function SignaturePage({ params }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();

  const person = await getPersonBySlug(slug);
  if (!person) notFound();

  if (!(await canAccessPersonEmail(person.email))) {
    notFound();
  }

  const [settings, session, isAdmin, origin] = await Promise.all([
    getSettings(),
    auth(),
    isAdminUser(),
    resolveAppOrigin(),
  ]);
  const html = renderSignatureHtml(person, settings, { origin });

  const email = session?.user?.email?.toLowerCase() || "";
  const mySignature = email ? await getPersonByEmail(email) : null;
  const userName =
    session?.user?.name || mySignature?.name || (email ? email.split("@")[0] : "Utilizador");
  const userPhoto = mySignature?.photoUrl || session?.user?.image || undefined;

  return (
    <div className="home-page">
      <HomeHeader
        isAdmin={isAdmin}
        activeNav="assinaturas"
        userName={userName}
        userEmail={email || session?.user?.email || ""}
        userPhoto={userPhoto}
        mySlug={mySignature?.slug}
      />

      <div className="sig-wrap">
        <header className="sig-hero">
          <Link href="/" className="sig-back">
            ← Todas as assinaturas
          </Link>
          <h1>
            <span className="sig-hero-label">Assinatura de</span>{" "}
            <span className="sig-hero-name">{person.name}</span>
          </h1>
          <p>Pré-visualiza e copia a assinatura oficial para utilizares no Gmail.</p>
        </header>

        <div className="sig-grid">
          <SignatureInstallPanel html={html} slug={person.slug} />

          <section className="sig-preview-card">
            <div className="sig-preview-head">
              <h2>Pré-visualização da assinatura</h2>
              <p>É exatamente este conteúdo que será copiado.</p>
            </div>

            <div className="sig-preview-frame">
              <SignaturePreview html={html} />
            </div>

            <div className="sig-tip">
              <span className="sig-tip-icon" aria-hidden>
                ✦
              </span>
              <p>
                Dica: depois de colar no Gmail, ajusta se necessário o tipo e tamanho da letra nas
                definições de assinatura.
              </p>
            </div>
          </section>
        </div>

        <AppFooter />
      </div>
    </div>
  );
}
