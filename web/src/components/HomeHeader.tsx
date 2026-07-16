"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";
import { GmailInstallGuide } from "@/components/GmailInstallGuide";

type Props = {
  isAdmin: boolean;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  /** Item ativo na navegação do topo */
  activeNav?: "assinaturas" | "admin";
};

export function HomeHeader({
  isAdmin,
  userName,
  userEmail,
  userPhoto,
  activeNav = "assinaturas",
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      await signOut({ redirect: false });
    } catch {
      // ok
    }
    router.push("/login");
    router.refresh();
  }

  const initials = (userName || userEmail || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="home-topbar">
        <div className="home-topbar-inner">
          <div className="home-topbar-left">
            <Link href="/" className="home-topbar-brand" aria-label="ComparaJá">
              <BrandLogo height={36} />
            </Link>
          </div>

          <div className="home-topbar-right">
            <button
              type="button"
              className="home-link-btn"
              onClick={() => setHelpOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M9.5 9.5a2.5 2.5 0 114 2c-.7.5-1.5 1-1.5 2.2V14"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">Como instalar</span>
            </button>

            {isAdmin && activeNav === "admin" && (
              <Link href="/" className="home-admin-btn">
                Assinaturas
              </Link>
            )}

            {isAdmin && activeNav !== "admin" && (
              <Link href="/admin" className="home-admin-btn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                Administração
              </Link>
            )}

            <div className="home-user" ref={menuRef}>
              <button
                type="button"
                className="home-user-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                {userPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userPhoto} alt="" className="home-user-avatar" />
                ) : (
                  <span className="home-user-fallback">{initials}</span>
                )}
                <span className="home-user-meta hidden md:block">
                  <span className="home-user-name">{userName || "Utilizador"}</span>
                  <span className="home-user-email">{userEmail}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="home-user-menu">
                  <button type="button" onClick={logout}>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {helpOpen && (
        <div className="home-modal-backdrop" role="dialog" aria-modal="true">
          <div className="home-modal home-modal-guide">
            <div className="home-modal-head">
              <h2>Como instalar no Gmail</h2>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            <p className="home-modal-lede">Seis passos até a assinatura ativa no Gmail.</p>
            <GmailInstallGuide source="header" />
            <button type="button" className="home-modal-close" onClick={() => setHelpOpen(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
