"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompanySettings, Person } from "@/lib/types";
import { uiPhotoSrc } from "@/lib/photos";

const emptyPerson = {
  name: "",
  title: "",
  email: "",
  phone: "",
  photoUrl: "",
  active: true,
};

type Props = {
  initialPeople: Person[];
  initialSettings: CompanySettings;
  storageMode: string;
  userEmail: string;
  userName: string;
};

export function AdminPanel({
  initialPeople,
  initialSettings,
  storageMode,
  userEmail,
  userName,
}: Props) {
  const [people, setPeople] = useState(initialPeople);
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState(emptyPerson);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importMode, setImportMode] = useState<"skip" | "update">("update");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "import" | "settings">("people");

  useEffect(() => {
    setPeople(initialPeople);
    setSettings(initialSettings);
  }, [initialPeople, initialSettings]);

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.name} ${p.title} ${p.email || ""} ${p.slug}`.toLowerCase().includes(q),
    );
  }, [people, query]);

  async function refresh() {
    const res = await fetch("/api/people");
    if (!res.ok) return;
    const data = await res.json();
    setPeople(data.people);
    if (data.settings?.logoUrl) setSettings(data.settings);
  }

  async function importCsv() {
    if (!csvText.trim()) {
      setMessage("Cola o CSV primeiro.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/people/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mode: importMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na importação");
      const r = data.result;
      setMessage(
        `Importação feita: ${r.created} criados, ${r.updated} atualizados, ${r.skipped} ignorados.` +
          (r.errors?.length ? ` Avisos: ${r.errors.join(" | ")}` : ""),
      );
      setCsvText("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const url = editingId ? `/api/people/${editingId}` : "/api/people";
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? JSON.stringify(form)
        : JSON.stringify({ type: "person", person: form });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao guardar");
      setForm(emptyPerson);
      setEditingId(null);
      setMessage(editingId ? "Pessoa atualizada." : "Pessoa criada.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "settings", settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao guardar settings");
      setSettings(data.settings);
      setMessage("Definições da empresa guardadas.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setForm({
      name: person.name,
      title: person.title,
      email: person.email || "",
      phone: person.phone || "",
      photoUrl: person.photoUrl,
      active: person.active,
    });
    setTab("people");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removePerson(id: string, name: string) {
    if (!confirm(`Apagar a assinatura de ${name}?`)) return;
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Não foi possível apagar.");
      return;
    }
    setMessage("Pessoa removida.");
    await refresh();
  }

  const tabs = [
    { id: "people" as const, label: "Pessoas" },
    { id: "import" as const, label: "Importar CSV" },
    { id: "settings" as const, label: "Empresa" },
  ];

  return (
    <div className="admin-panel space-y-6">
      <header className="home-hero">
        <p className="home-kicker">Administração</p>
        <h1>Gestão de assinaturas</h1>
        <p className="home-lede">
          {userName || userEmail}
          {userEmail && userName ? ` · ${userEmail}` : ""}
          {" · "}
          Storage: <strong>{storageMode}</strong>
          {storageMode === "file" && (
            <> — em produção na Vercel, ativa Blob Storage para persistir alterações.</>
          )}
        </p>
      </header>

      {message && <div className="cj-alert cj-alert-info">{message}</div>}

      <nav className="flex flex-wrap gap-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cj-btn min-h-10 flex-1 sm:flex-none ${
              tab === t.id ? "cj-btn-primary" : "cj-btn-ghost"
            }`}
          >
            {t.label}
            {t.id === "people" ? ` (${people.length})` : ""}
          </button>
        ))}
      </nav>

      {tab === "people" && (
        <div className="cj-rise cj-rise-delay-2 space-y-5">
          <section className="cj-panel p-5 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
              {editingId ? "Editar pessoa" : "Nova pessoa"}
            </h2>
            <form onSubmit={savePerson} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="cj-field">
                <span>Nome</span>
                <input
                  required
                  className="cj-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="cj-field">
                <span>Cargo</span>
                <input
                  required
                  className="cj-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="cj-field sm:col-span-2">
                <span>URL da foto</span>
                <input
                  required
                  className="cj-input"
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://… ou ID do Drive"
                />
              </label>
              <label className="cj-field">
                <span>Email (opcional)</span>
                <input
                  className="cj-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="cj-field">
                <span>Telemóvel (opcional)</span>
                <input
                  className="cj-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+351 9XX XXX XXX"
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="font-semibold text-[var(--ink-soft)]">
                  Ativa (visível na lista)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" disabled={busy} className="cj-btn cj-btn-primary">
                  {editingId ? "Guardar alterações" : "Criar pessoa"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="cj-btn cj-btn-secondary"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyPerson);
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="cj-panel admin-people-panel">
            <div className="admin-people-head">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                  Pessoas
                </h2>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {filteredPeople.length} de {people.length}
                </p>
              </div>
              <input
                className="cj-input max-w-xs"
                placeholder="Filtrar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="admin-people-scroll">
              <table className="cj-table admin-people-table">
                <thead>
                  <tr>
                    <th className="admin-col-photo">Foto</th>
                    <th>Nome</th>
                    <th>Cargo</th>
                    <th>Link</th>
                    <th className="admin-col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => (
                    <tr key={person.id}>
                      <td className="admin-col-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uiPhotoSrc(person.photoUrl)}
                          alt=""
                          className="admin-person-avatar"
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td className="font-semibold text-[var(--ink)]">
                        {person.name}
                        {!person.active && (
                          <span className="ml-2 text-xs font-medium text-[var(--muted)]">
                            inativa
                          </span>
                        )}
                      </td>
                      <td className="text-[var(--ink-soft)]">{person.title}</td>
                      <td>
                        <a
                          className="font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                          href={`/s/${person.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          /s/{person.slug}
                        </a>
                      </td>
                      <td className="admin-col-actions">
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() => startEdit(person)}
                            className="admin-icon-btn"
                            title="Editar"
                            aria-label={`Editar ${person.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M13.5 6.5l3 3"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removePerson(person.id, person.name)}
                            className="admin-icon-btn admin-icon-btn-danger"
                            title="Apagar"
                            aria-label={`Apagar ${person.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M5 7h14M10 7V5h4v2M9 7v11a1 1 0 001 1h4a1 1 0 001-1V7"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "import" && (
        <section className="cj-panel cj-rise cj-rise-delay-2 p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Importar várias pessoas
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            Colunas: <code className="font-mono text-xs">email,nome,cargo,foto</code>. Na coluna{" "}
            <strong>foto</strong> podes colar o ID do Google Drive ou o link completo.
          </p>
          <textarea
            className="cj-textarea mt-4"
            placeholder={`email,nome,cargo,foto\ndaniel.maia@comparaja.pt,Daniel Silva Maia,IT Support,1PVpbOtqpi4oFjq585U_YxnRL3yrixLmJ`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
              <input
                type="radio"
                checked={importMode === "update"}
                onChange={() => setImportMode("update")}
              />
              Atualizar se o email já existir
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
              <input
                type="radio"
                checked={importMode === "skip"}
                onChange={() => setImportMode("skip")}
              />
              Ignorar duplicados
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={importCsv}
              className="cj-btn cj-btn-primary"
            >
              Importar CSV
            </button>
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="cj-panel cj-rise cj-rise-delay-2 p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Definições da empresa
          </h2>
          <form onSubmit={saveSettings} className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["companyName", "Nome da empresa"],
                ["website", "Website URL"],
                ["websiteLabel", "Website (texto)"],
                ["logoUrl", "Logo URL"],
                ["address", "Morada"],
                ["addressMapsUrl", "Link Google Maps"],
                ["brandColor", "Cor da marca"],
                ["instagramUrl", "Instagram"],
                ["facebookUrl", "Facebook"],
                ["linkedinUrl", "LinkedIn"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="cj-field">
                <span>{label}</span>
                <input
                  className="cj-input"
                  value={settings[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" disabled={busy} className="cj-btn cj-btn-primary">
                Guardar definições
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
