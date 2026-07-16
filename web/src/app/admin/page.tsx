import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPanel } from "@/components/AdminPanel";
import { AppFooter } from "@/components/AppFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { isAdminUser, isAuthenticated } from "@/lib/auth";
import { getSettings, listPeople } from "@/lib/people";
import { storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  if (!(await isAdminUser())) {
    redirect("/?error=admin");
  }

  const session = await auth();
  const [people, settings] = await Promise.all([listPeople(true), getSettings()]);

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
        isAdmin
        activeNav="admin"
        userName={userName}
        userEmail={email || session?.user?.email || ""}
        userPhoto={userPhoto}
      />

      <main className="home-main">
        <AdminPanel
          initialPeople={people}
          initialSettings={settings}
          storageMode={storageMode()}
          userEmail={session?.user?.email || ""}
          userName={session?.user?.name || ""}
        />
        <AppFooter />
      </main>
    </div>
  );
}
