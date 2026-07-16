"use client";

import { useState, type ReactNode } from "react";

type Step = {
  n: number;
  title: string;
  body: ReactNode;
  images: { src: string; alt: string }[];
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Copia a assinatura",
    body: "Nesta página, clica em Copiar assinatura.",
    images: [
      {
        src: "/help/gmail-copiar.png",
        alt: "Painel Copiar e instalar com o botão Copiar assinatura",
      },
    ],
  },
  {
    n: 2,
    title: "Abre as configurações do Gmail",
    body: (
      <>
        Clica na <strong>engrenagem</strong> e depois em{" "}
        <strong>Ver todas as configurações</strong>.
      </>
    ),
    images: [
      {
        src: "/help/gmail-gear.png",
        alt: "Ícone da engrenagem nas configurações do Gmail",
      },
      {
        src: "/help/gmail-configuracoes.png",
        alt: "Painel Configurações Rápidas com Ver todas as configurações",
      },
    ],
  },
  {
    n: 3,
    title: "Cria uma nova assinatura",
    body: (
      <>
        Em <strong>Assinatura</strong>, clica em <strong>+ Criar novo</strong>, dá um nome e confirma
        com <strong>Criar</strong>.
      </>
    ),
    images: [
      {
        src: "/help/gmail-criar-novo.png",
        alt: "Secção Assinatura com o botão Criar novo",
      },
    ],
  },
  {
    n: 4,
    title: "Cola a assinatura",
    body: (
      <>
        No editor à direita, cola com <strong>Ctrl+V</strong> o conteúdo que copiaste.
      </>
    ),
    images: [
      {
        src: "/help/gmail-colar.png",
        alt: "Lista de assinaturas e editor para colar o conteúdo",
      },
    ],
  },
  {
    n: 5,
    title: "Define os padrões de assinatura",
    body: (
      <>
        Em <strong>Padrões de assinatura</strong>, escolhe a assinatura que criaste em{" "}
        <strong>novos e-mails</strong> e em <strong>respostas/encaminhamentos</strong>. Sem este
        passo, a assinatura não aparece.
      </>
    ),
    images: [
      {
        src: "/help/gmail-padroes.png",
        alt: "Padrões de assinatura para novos e-mails e respostas",
      },
    ],
  },
  {
    n: 6,
    title: "Salvar alterações",
    body: (
      <>
        Desce ao fundo da página e clica em <strong>Salvar alterações</strong>. Pronto.
      </>
    ),
    images: [],
  },
];

type Props = {
  /** header = aberto a partir da lista; page = já na página da assinatura */
  source?: "header" | "page";
};

export function GmailInstallGuide({ source = "header" }: Props) {
  const [index, setIndex] = useState(0);
  const steps = STEPS.map((step) =>
    step.n === 1
      ? {
          ...step,
          body:
            source === "page"
              ? "Nesta página, clica em Copiar assinatura."
              : "Abre a assinatura na lista e clica em Copiar assinatura.",
        }
      : step,
  );

  const step = steps[index];
  const total = steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div className="gmail-guide">
      <div className="gmail-guide-progress" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.n}
            className={`gmail-guide-dot ${i === index ? "is-active" : ""} ${i < index ? "is-done" : ""}`}
          />
        ))}
      </div>

      <p className="gmail-guide-count">
        Passo {step.n} de {total}
      </p>

      <div className="gmail-guide-card">
        <div className="gmail-guide-step-head">
          <span className="gmail-guide-num">{step.n}</span>
          <div>
            <p className="gmail-guide-title">{step.title}</p>
            <p className="gmail-guide-body">{step.body}</p>
          </div>
        </div>

        {step.images.length > 0 && (
          <div className={`gmail-guide-figures ${step.images.length > 1 ? "is-multi" : ""}`}>
            {step.images.map((img) => (
              <figure key={img.src} className="gmail-guide-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} />
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="gmail-guide-nav">
        <button
          type="button"
          className="gmail-guide-nav-btn"
          disabled={isFirst}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </button>
        <button
          type="button"
          className="gmail-guide-nav-btn gmail-guide-nav-primary"
          disabled={isLast}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
        >
          Seguinte
        </button>
      </div>
    </div>
  );
}
