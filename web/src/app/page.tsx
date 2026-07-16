import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppFooter } from "@/components/AppFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { PeopleDirectory } from "@/components/PeopleDirectory";
import { isAdminUser, isAuthenticated } from "@/lib/auth";
import { listPeopleForViewer } from "@/lib/people";
import { signedUiPhotoSrc } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const [session, isAdmin] = await Promise.all([auth(), isAdminUser()]);
  const email = session?.user?.email?.toLowerCase() || "";
  const peopleRaw = await listPeopleForViewer({
    isAdmin,
    viewerEmail: email,
  });
  const people = peopleRaw.map((p) => ({
    ...p,
    photoUrl: signedUiPhotoSrc(p.photoUrl) || p.photoUrl,
  }));

  const params = await searchParams;
  const mySignature = email
    ? peopleRaw.find((p) => (p.email || "").toLowerCase() === email)
    : undefined;

  const userName =
    session?.user?.name || mySignature?.name || (email ? email.split("@")[0] : "Utilizador");
  const userPhoto = mySignature
    ? signedUiPhotoSrc(mySignature.photoUrl) || session?.user?.image || undefined
    : session?.user?.image || undefined;

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

      <main className="home-main">
        {params.error === "admin" && (
          <div className="home-banner-warn">
            A tua conta está autenticada, mas não tem permissão de administração.
          </div>
        )}

        <header className="home-hero">
          <p className="home-kicker">ComparaJá · Equipa</p>
          <h1>Assinaturas de email</h1>
          <p className="home-lede">
            {isAdmin
              ? "Encontra a assinatura oficial de qualquer pessoa da equipa e copia-a diretamente para o Gmail."
              : "Acede à tua assinatura oficial e copia-a diretamente para o Gmail."}
          </p>
        </header>

        <PeopleDirectory
          people={people}
          mySlug={mySignature?.slug}
          showEmail={isAdmin}
        />
        <AppFooter />
      </main>
    </div>
  );
}
