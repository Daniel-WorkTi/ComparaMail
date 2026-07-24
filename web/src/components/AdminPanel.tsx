"use client";

import { useEffect, useMemo, useState } from "react";
import { BusyOverlay } from "@/components/BusyOverlay";
import {
  inferFeedbackKind,
  type FeedbackKind,
} from "@/components/FeedbackBanner";
import { ResultPopup } from "@/components/ResultPopup";
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
  userEmail: string;
  userName: string;
};

export function AdminPanel({
  initialPeople,
  initialSettings,
  userEmail,
  userName,
}: Props) {
  const [people, setPeople] = useState(initialPeople);
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState(emptyPerson);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    kind: FeedbackKind;
  } | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const busy = busyLabel !== null;

  function showFeedback(message: string, kind?: FeedbackKind) {
    setFeedback({ message, kind: kind ?? inferFeedbackKind(message) });
  }

  const [csvText, setCsvText] = useState("");
  const [importMode, setImportMode] = useState<"skip" | "update">("update");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "import" | "settings">("people");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceHint, setWorkspaceHint] = useState("");

  useEffect(() => {
    setPeople(initialPeople);
    setSettings(initialSettings);
  }, [initialPeople, initialSettings]);

  useEffect(() => {
    fetch("/api/workspace/sync")
      .then(async (r) => {
        const d = await r.json();
        const ready = Boolean(d.configured) && r.ok;
        setWorkspaceReady(ready);
        if (!r.ok) {
          setWorkspaceHint("Sem permissão de administração.");
        } else if (!d.configured) {
          setWorkspaceHint("Integração Google indisponível.");
        } else {
          setWorkspaceHint("");
        }
      })
      .catch(() => {
        setWorkspaceReady(false);
        setWorkspaceHint("Integração Google indisponível.");
      });
  }, []);

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

  async function syncWorkspace() {
    setBusyLabel("A sincronizar...");
    setFeedback(null);
    try {
      const res = await fetch("/api/workspace/sync", { method: "POST" });
      const text = await res.text();
      let data: {
        error?: string;
        result?: {
          matched: number;
          updatedTitle: number;
          updatedPhone?: number;
          updatedPhoto?: number;
          restoredDrivePhoto?: number;
          googleUsers: number;
        };
      } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          text?.trim()
            ? `Resposta inválida do servidor (${res.status})`
            : `Servidor sem resposta (${res.status}). Tenta outra vez.`,
        );
      }
      if (!res.ok) throw new Error(data.error || "Erro no sync");
      const r = data.result;
      if (!r) throw new Error("Sync sem resultado");
      showFeedback(
        `Sincronização concluída: ${r.matched} correspondências · ${r.updatedPhone || 0} telemóveis · ${r.updatedPhoto || 0} fotos.`,
        "success",
      );
      await refresh();
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Falha na sincronização.",
        "error",
      );
    } finally {
      setBusyLabel(null);
    }
  }

  async function pushTitlesWorkspace() {
    if (
      !confirm(
        "Enviar os cargos da ComparaMail para o Google Workspace?\nOs nomes não são alterados.",
      )
    ) {
      return;
    }
    setBusyLabel("A enviar cargos...");
    setFeedback(null);
    try {
      const res = await fetch("/api/workspace/push-titles", { method: "POST" });
      const text = await res.text();
      let data: {
        error?: string;
        result?: {
          updated: number;
          skipped: number;
          failedCount?: number;
          googleUsers: number;
        };
      } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Resposta inválida do servidor.");
      }
      if (!res.ok) throw new Error(data.error || "Erro ao enviar cargos");
      const r = data.result;
      if (!r) throw new Error("Sem resultado");
      const failN = r.failedCount || 0;
      if (!r.updated && failN) {
        showFeedback(`Cargos não actualizados (${failN} falhas).`, "error");
      } else if (!r.updated) {
        showFeedback("Nada a alterar — cargos já estão alinhados.", "success");
      } else {
        showFeedback(
          `Cargos actualizados: ${r.updated}${failN ? ` · ${failN} falhas` : ""}.`,
          failN ? "error" : "success",
        );
      }
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Falha ao enviar cargos.",
        "error",
      );
    } finally {
      setBusyLabel(null);
    }
  }

  async function publishToGmail(slug?: string) {
    const label = slug ? "esta assinatura" : "todas as assinaturas com email";
    if (
      !confirm(
        `Publicar ${label} no Gmail como assinatura ativa “MailCJ2026”?\nAparece nos novos emails desta conta.`,
      )
    ) {
      return;
    }
    setBusyLabel("A publicar assinaturas no Gmail...");
    setFeedback(null);
    try {
      const res = await fetch("/api/workspace/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slug ? { slug } : { all: true }),
      });
      const text = await res.text();
      let data: {
        error?: string;
        brandName?: string;
        published?: number;
        failedCount?: number;
      } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Resposta inválida do servidor.");
      }
      if (!res.ok && !data.published) {
        throw new Error(data.error || "Erro ao publicar");
      }
      const brand = data.brandName || "MailCJ2026";
      const n = data.published || 0;
      const failN = data.failedCount || 0;
      showFeedback(
        n
          ? `${n} assinaturas publicadas (${brand})${failN ? ` · ${failN} falhas` : ""}.`
          : "Nenhuma assinatura publicada.",
        n && !failN ? "success" : n ? "info" : "error",
      );
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Falha ao publicar.",
        "error",
      );
    } finally {
      setBusyLabel(null);
    }
  }

  async function importCsv() {
    if (!csvText.trim()) {
      showFeedback("Cola o CSV primeiro.", "error");
      return;
    }
    setBusyLabel("A importar...");
    setFeedback(null);
    try {
      const res = await fetch("/api/people/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mode: importMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na importação");
      const r = data.result;
      showFeedback(
        `Importação feita: ${r.created} criados, ${r.updated} atualizados, ${r.skipped} ignorados.` +
          (r.errors?.length ? ` Avisos: ${r.errors.join(" | ")}` : ""),
        r.errors?.length ? "info" : "success",
      );
      setCsvText("");
      await refresh();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setBusyLabel(null);
    }
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault();
    setBusyLabel("A guardar...");
    setFeedback(null);
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
      const wasEditing = Boolean(editingId);
      setForm(emptyPerson);
      setEditingId(null);
      showFeedback(wasEditing ? "Pessoa atualizada." : "Pessoa criada.", "success");
      await refresh();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setBusyLabel(null);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusyLabel("A guardar...");
    setFeedback(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "settings", settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao guardar settings");
      setSettings(data.settings);
      showFeedback("Definições da empresa guardadas.", "success");
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setBusyLabel(null);
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
      showFeedback("Não foi possível apagar.", "error");
      return;
    }
    showFeedback("Pessoa removida.", "success");
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
        </p>
      </header>

      {feedback && (
        <ResultPopup
          kind={feedback.kind}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {busyLabel && <BusyOverlay label={busyLabel} />}

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
              Google Workspace
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !workspaceReady}
                onClick={() => syncWorkspace()}
                className="cj-btn cj-btn-primary"
              >
                Sincronizar do Google Workspace
              </button>
              <button
                type="button"
                disabled={busy || !workspaceReady}
                onClick={() => pushTitlesWorkspace()}
                className="cj-btn cj-btn-secondary"
              >
                Enviar cargos para o Workspace
              </button>
              <button
                type="button"
                disabled={busy || !workspaceReady}
                onClick={() => publishToGmail()}
                className="cj-btn cj-btn-secondary"
              >
                Publicar assinaturas no Gmail
              </button>
            </div>
            {workspaceHint && (
              <p className="mt-3 text-xs text-[var(--muted)]">{workspaceHint}</p>
            )}
          </section>

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
                          src={uiPhotoSrc(person.photoUrl, person.email)}
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
                            disabled={busy || !workspaceReady || !person.email}
                            onClick={() => publishToGmail(person.slug)}
                            className="admin-icon-btn"
                            title={
                              person.email
                                ? "Publicar assinatura no Gmail"
                                : "Sem email — não dá para publicar"
                            }
                            aria-label={`Publicar assinatura de ${person.name} no Gmail`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M4 6h16v12H4V6z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M4 7l8 6 8-6"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
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
            placeholder={`email,nome,cargo,foto\npessoa@empresa.pt,Nome Exemplo,Cargo,DRIVE_FILE_ID`}
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
