"use client";

import { useEffect } from "react";

export type FeedbackKind = "success" | "error" | "info";

type Props = {
  kind: FeedbackKind;
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
};

export function FeedbackBanner({
  kind,
  message,
  onDismiss,
  autoDismissMs,
}: Props) {
  const dismissMs = autoDismissMs ?? (kind === "success" ? 4000 : 0);

  useEffect(() => {
    if (!dismissMs || !onDismiss) return;
    const t = window.setTimeout(onDismiss, dismissMs);
    return () => window.clearTimeout(t);
  }, [dismissMs, onDismiss, message]);

  const role = kind === "error" ? "alert" : "status";

  return (
    <div
      className={`cj-feedback cj-feedback-${kind}`}
      role={role}
      aria-live={kind === "error" ? "assertive" : "polite"}
    >
      <p>{message}</p>
      {onDismiss && (
        <button
          type="button"
          className="cj-feedback-dismiss"
          onClick={onDismiss}
          aria-label="Fechar mensagem"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function inferFeedbackKind(text: string): FeedbackKind {
  const t = text.toLowerCase();
  if (
    t.includes("erro") ||
    t.includes("não foi possível") ||
    t.includes("nao foi possivel") ||
    t.includes("inválid") ||
    t.includes("invalid") ||
    t.includes("falhas:") ||
    t.includes("falhou") ||
    t.includes("não foram") ||
    t.includes("nao foram") ||
    t.includes("sem permissão") ||
    t.includes("sem permissao") ||
    t.includes("resposta inválida") ||
    t.includes("servidor sem resposta") ||
    t.includes("cola o csv") ||
    t.includes("scope")
  ) {
    return "error";
  }
  if (
    t.includes("guardad") ||
    t.includes("criad") ||
    t.includes("atualiz") ||
    t.includes("actualiz") ||
    t.includes("importação") ||
    t.includes("importacao") ||
    t.includes("google workspace") ||
    t.includes("sync") ||
    t.includes("cargos →") ||
    t.includes("gmail (") ||
    t.includes("publicad") ||
    t.includes("removida") ||
    t.includes("conclu") ||
    t.includes("nada a alterar")
  ) {
    return "success";
  }
  return "info";
}
