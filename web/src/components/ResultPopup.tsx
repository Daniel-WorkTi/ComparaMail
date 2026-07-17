"use client";

import { useEffect } from "react";
import type { FeedbackKind } from "@/components/FeedbackBanner";

type Props = {
  kind: FeedbackKind;
  message: string;
  onClose: () => void;
};

const TITLES: Record<FeedbackKind, string> = {
  success: "Concluído",
  error: "Falhou",
  info: "Informação",
};

export function ResultPopup({ kind, message, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="cj-popup-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`cj-popup cj-popup-${kind}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cj-popup-title"
        aria-describedby="cj-popup-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="cj-popup-title" className="cj-popup-title">
          {TITLES[kind]}
        </p>
        <p id="cj-popup-msg" className="cj-popup-msg">
          {message}
        </p>
        <button type="button" className="cj-btn cj-btn-primary cj-popup-ok" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
