import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppFooter } from "@/components/AppFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { PeopleDirectory } from "@/components/PeopleDirectory";
import { isAdminUser, isAuthenticated } from "@/lib/auth";
import { listPeople } from "@/lib/people";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const [people, session, isAdmin] = await Promise.all([
    listPeople(false),
    auth(),
    isAdminUser(),
  ]);

  const params = await searchParams;
  const email = session?.user?.email?.toLowerCase() || "";
  const mySignature = email
    ? people.find((p) => (p.email || "").toLowerCase() === email)
    : undefined;

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
            Encontra a assinatura oficial de qualquer pessoa da equipa e copia-a diretamente para o
            Gmail.
          </p>
        </header>

        <PeopleDirectory people={people} mySlug={mySignature?.slug} />
        <AppFooter />
      </main>
    </div>
  );
}
