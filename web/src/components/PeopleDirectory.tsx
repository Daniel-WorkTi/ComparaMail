"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Person } from "@/lib/types";
import { uiPhotoSrc } from "@/lib/photos";

type Props = {
  people: Person[];
  mySlug?: string;
  showEmail?: boolean;
};

export function PeopleDirectory({ people, mySlug, showEmail = false }: Props) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const departments = useMemo(() => {
    const set = new Set(people.map((p) => p.title).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "pt"));
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (dept !== "all" && p.title !== dept) return false;
      if (!q) return true;
      const hay = showEmail
        ? `${p.name} ${p.title} ${p.email || ""}`.toLowerCase()
        : `${p.name} ${p.title}`.toLowerCase();
      return hay.includes(q);
    });
  }, [people, query, dept, showEmail]);

  const resultLabel = useMemo(() => {
    const q = query.trim();
    if (q) {
      return `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"} para ‘${q}’`;
    }
    if (dept !== "all") {
      return `${filtered.length} de ${people.length} em ${dept}`;
    }
    return `${filtered.length} assinatura${filtered.length === 1 ? "" : "s"}`;
  }, [filtered.length, query, dept, people.length]);

  return (
    <section className="home-directory">
      <div className="home-toolbar">
        <label className="home-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M20 20l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              showEmail
                ? "Pesquisar por nome, cargo ou email…"
                : "Pesquisar por nome ou cargo…"
            }
            aria-label="Pesquisar"
          />
          {query && (
            <button
              type="button"
              className="home-search-clear"
              onClick={() => setQuery("")}
              aria-label="Limpar pesquisa"
            >
              ×
            </button>
          )}
        </label>

        <div className="home-filter">
          <button
            type="button"
            className="home-filter-btn"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6h16M7 12h10M10 18h4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Filtrar
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
          {filterOpen && (
            <div className="home-filter-menu">
              <button
                type="button"
                className={dept === "all" ? "active" : ""}
                onClick={() => {
                  setDept("all");
                  setFilterOpen(false);
                }}
              >
                Todas as áreas
              </button>
              {departments.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={dept === d ? "active" : ""}
                  onClick={() => {
                    setDept(d);
                    setFilterOpen(false);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="home-results-meta">{resultLabel}</p>

      {people.length === 0 && (
        <div className="home-empty">Ainda não há pessoas. Entra no admin para adicionar.</div>
      )}

      {people.length > 0 && filtered.length === 0 && (
        <div className="home-empty">Nenhuma assinatura corresponde à pesquisa.</div>
      )}

      {filtered.length > 0 && (
        <div className="home-list">
          {filtered.map((person) => {
            const isMine = mySlug === person.slug;
            return (
              <Link
                key={person.id}
                href={`/s/${person.slug}`}
                className={`home-row ${isMine ? "home-row-mine" : ""}`}
              >
                <div className="home-row-person">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uiPhotoSrc(person.photoUrl, person.email)}
                    alt=""
                    className="home-row-avatar"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="home-row-name-line">
                      <span className="home-row-name">{person.name}</span>
                      {isMine && <span className="home-badge-mine">A tua</span>}
                    </div>
                    <span className="home-row-title">{person.title}</span>
                  </div>
                </div>

                <span className="home-row-email">
                  {showEmail ? person.email || "—" : "—"}
                </span>
                <span className="home-row-dept">{person.title}</span>
                <span className="home-row-chevron" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
