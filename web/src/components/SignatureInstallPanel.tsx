"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GmailInstallGuide } from "@/components/GmailInstallGuide";

type Props = {
  html: string;
  slug: string;
  previewId?: string;
};

export function SignatureInstallPanel({
  html,
  slug,
  previewId = "signature-preview",
}: Props) {
  const [status, setStatus] = useState<"idle" | "ok" | "fallback" | "error">("idle");
  const [guideOpen, setGuideOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleCopy() {
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([html], { type: "text/plain" }),
          }),
        ]);
        setStatus("ok");
        setTimeout(() => setStatus("idle"), 2800);
        return;
      }
      throw new Error("Clipboard API limited");
    } catch {
      const el = document.getElementById(previewId);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        try {
          document.execCommand("copy");
          setStatus("fallback");
        } catch {
          setStatus("error");
        }
        setTimeout(() => setStatus("idle"), 3500);
        return;
      }
      setStatus("error");
    }
  }

  const copied = status === "ok" || status === "fallback";

  return (
    <>
      <aside className="sig-side">
        <div className="sig-side-top">
          <div className="sig-side-head">
            <h2>Copiar e instalar</h2>
            <p>Copia a assinatura e cola nas definições do Gmail.</p>
          </div>

          <div className="sig-side-actions">
            <button
              type="button"
              onClick={handleCopy}
              className={`sig-copy-btn ${copied ? "sig-copy-btn-ok" : ""}`}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12.5l5 5L19 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Assinatura copiada
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect
                      x="8"
                      y="8"
                      width="11"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M5 15V6a2 2 0 012-2h9"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  Copiar assinatura
                </>
              )}
            </button>

            <a
              href={`/api/html/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="sig-html-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 4h6v6M10 14L20 4M18 14v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Abrir apenas o HTML
            </a>
          </div>

          {status === "error" && (
            <p className="sig-copy-error">
              Não foi possível copiar. Seleciona a pré-visualização e usa Ctrl+C.
            </p>
          )}
        </div>

        <div className="sig-side-steps">
          <div className="sig-side-steps-head">
            <p className="sig-side-steps-label">Passos</p>
            <div className="sig-more" ref={moreRef}>
              <button
                type="button"
                className="sig-more-btn"
                aria-label="Mais opções"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {moreOpen && (
                <div className="sig-more-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setGuideOpen(true);
                    }}
                  >
                    Como instalar no Gmail
                  </button>
                </div>
              )}
            </div>
          </div>

          <ol className="sig-steps-list">
            <li>
              <span className="sig-step-n">1</span>
              <span>Clica em <strong>Copiar assinatura</strong></span>
            </li>
            <li>
              <span className="sig-step-n">2</span>
              <span>
                No Gmail: ⚙️ → <strong>Ver todas as configurações</strong>
              </span>
            </li>
            <li>
              <span className="sig-step-n">3</span>
              <span>
                Em <strong>Assinatura</strong>, cria ou escolhe a tua
              </span>
            </li>
            <li>
              <span className="sig-step-n">4</span>
              <span>
                Cola com <strong>Ctrl+V</strong> e guarda
              </span>
            </li>
          </ol>
        </div>

        <div className="sig-info">
          <span className="sig-info-icon" aria-hidden>
            i
          </span>
          <p>A aparência pode variar ligeiramente consoante o dispositivo e cliente de email.</p>
        </div>
      </aside>

      {mounted &&
        guideOpen &&
        createPortal(
          <div className="home-modal-backdrop" role="dialog" aria-modal="true">
            <div className="home-modal home-modal-guide">
              <div className="home-modal-head">
                <h2>Como instalar no Gmail</h2>
                <button type="button" onClick={() => setGuideOpen(false)} aria-label="Fechar">
                  ×
                </button>
              </div>
              <p className="home-modal-lede">Seis passos até a assinatura ativa no Gmail.</p>
              <GmailInstallGuide source="page" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
