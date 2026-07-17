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
    t.includes("sem permissão") ||
    t.includes("sem permissao") ||
    t.includes("resposta inválida") ||
    t.includes("servidor sem resposta") ||
    t.includes("cola o csv")
  ) {
    return "error";
  }
  if (
    t.includes("guardad") ||
    t.includes("criad") ||
    t.includes("atualiz") ||
    t.includes("importação") ||
    t.includes("importacao") ||
    t.includes("google workspace:") ||
    t.includes("gmail (") ||
    t.includes("removida") ||
    t.includes("instalados")
  ) {
    return "success";
  }
  return "info";
}
