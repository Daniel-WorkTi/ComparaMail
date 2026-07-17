import type { CompanySettings, Person } from "./types";
import { emailPhotoSrc } from "./photos";
import { escapeHtml, safeHref } from "./security";

/** Limite da Gmail API para o campo signature (sendAs). */
export const GMAIL_SIGNATURE_MAX_CHARS = 10_000;

function minifyHtml(html: string): string {
  return html
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function socialIcon(
  href: string,
  bg: string,
  iconSrc: string,
  alt: string,
): string {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-right:6px;line-height:0;text-decoration:none"><span style="display:inline-block;width:26px;height:26px;background:${bg};text-align:center;line-height:26px"><img src="${iconSrc}" width="15" height="15" alt="${alt}" style="display:inline-block;border:0;vertical-align:middle"></span></a>`;
}

/**
 * HTML da assinatura.
 * - preview: aviso legal expansível (completo) — para a app web
 * - email: versão compacta (<10k chars) — Gmail API + colar no Gmail
 */
export function renderSignatureHtml(
  person: Person,
  settings: CompanySettings,
  options?: { origin?: string; mode?: "email" | "preview" },
): string {
  const mode = options?.mode || "email";
  const name = escapeHtml(person.name);
  const title = escapeHtml(person.title);
  const brand = escapeHtml(settings.brandColor || "#45668E");
  const photoOrigin = mode === "preview" ? undefined : options?.origin;
  const logo = escapeHtml(emailPhotoSrc(settings.logoUrl, photoOrigin));
  const photo = escapeHtml(emailPhotoSrc(person.photoUrl, photoOrigin));
  const website = escapeHtml(safeHref(settings.website, ["https:", "http:"]));
  const websiteLabel = escapeHtml(settings.websiteLabel);
  const address = escapeHtml(settings.address);
  const maps = escapeHtml(
    safeHref(settings.addressMapsUrl, ["https:", "http:"]),
  );
  const company = escapeHtml(settings.companyName);
  const ig = escapeHtml(safeHref(settings.instagramUrl, ["https:", "http:"]));
  const fb = escapeHtml(safeHref(settings.facebookUrl, ["https:", "http:"]));
  const li = escapeHtml(safeHref(settings.linkedinUrl, ["https:", "http:"]));
  const email = (person.email || "").trim();
  const phone = (person.phone || "").trim();
  const emailHtml = email ? escapeHtml(email) : "";
  const phoneHtml = phone ? escapeHtml(phone) : "";
  const phoneHref = phone
    ? escapeHtml(safeHref(`tel:${phone.replace(/[^\d+]/g, "")}`, ["tel:"]))
    : "";
  const mailtoHref = email
    ? escapeHtml(safeHref(`mailto:${email}`, ["mailto:"]))
    : "";

  const legalUrl = escapeHtml(
    safeHref(
      "https://www.comparaja.pt/termos-condicoes-gerais",
      ["https:"],
    ),
  );

  const contactBits: string[] = [];
  if (phoneHtml) {
    contactBits.push(
      `<tr><td style="padding:14px 0 0 0"><p style="margin:0;font-size:11px;line-height:1.2;font-family:Arial,sans-serif"><a href="${phoneHref}" style="color:#212121;text-decoration:none">${phoneHtml}</a></p></td></tr>`,
    );
  }
  if (emailHtml) {
    contactBits.push(
      `<tr><td style="padding:${phoneHtml ? "7px" : "14px"} 0 0 0"><p style="margin:0;font-size:11px;line-height:1.2;font-family:Arial,sans-serif"><a href="${mailtoHref}" style="color:#212121;text-decoration:none">${emailHtml}</a></p></td></tr>`,
    );
  }
  const webPad = phoneHtml || emailHtml ? "7px" : "14px";

  const social =
    socialIcon(
      ig,
      "#E4405F",
      "https://img.icons8.com/ios-glyphs/90/ffffff/instagram-new.png",
      "Instagram",
    ) +
    socialIcon(
      fb,
      "#1877F2",
      "https://img.icons8.com/ios-glyphs/90/ffffff/facebook-new.png",
      "Facebook",
    ) +
    socialIcon(
      li,
      "#0A66C2",
      "https://img.icons8.com/ios-glyphs/90/ffffff/linkedin.png",
      "LinkedIn",
    );

  const legalParagraphs = `<div style="font-size:10px;color:#333;line-height:1.4;font-family:Arial,sans-serif"><p style="margin:0 0 8px 0">O ComparaJá atua como intermediário de crédito junto do Banco de Portugal para a prestação de serviços de consultoria e intermediação de crédito com o nº 0000375. Saiba mais <a href="${legalUrl}" target="_blank" rel="noopener noreferrer" style="color:#333;text-decoration:underline">aqui</a>.</p><p style="margin:0 0 8px 0">Esta mensagem de correio electrónico, o seu conteúdo e os respectivos anexos, são confidenciais e destinam-se apenas ao conhecimento e uso exclusivo da(s) pessoa(s) nela indicada(s) como destinatária(s) e poderá conter dados pessoais e informação privada e privilegiada, confidencial ou legalmente protegida.</p><p style="margin:0 0 8px 0">Se a presente comunicação incluir dados pessoais, o(s) destinatário(s) está(ão) obrigado(s) ao cumprimento do disposto no Regulamento Geral de Proteção de Dados (UE) 2016/679-PE/C de 2016/04/27 e demais legislação nacional de execução, devendo utilizá-las estritamente para as finalidades definidas e tratá-los em estrito cumprimento do referido Regulamento e demais legislação aplicável.</p><p style="margin:0">Se não é o destinatário ou a pessoa autorizada a receber esta mensagem e a recebeu indevidamente, não pode usar, copiar, transmitir ou divulgar, seja por que meio for, as informações nela contidas ou tomar qualquer ação baseada nessas informações. Por favor, avise-nos imediatamente, respondendo ao e-mail e em seguida apague a mensagem e os respetivos anexos. Agradecemos a sua cooperação.</p></div>`;

  // Preview: expansível. Email/Gmail: texto completo sempre visível (Gmail não suporta <details> bem; API max 10k).
  const legalBlock =
    mode === "preview"
      ? `<details style="font-size:10px;color:#333;line-height:1.4;font-family:Arial,sans-serif"><summary style="cursor:pointer;list-style:none">Aviso legal e confidencialidade. <span style="color:${brand};text-decoration:underline;font-weight:700">Saiba mais</span></summary><div style="padding-top:8px">${legalParagraphs}</div></details>`
      : legalParagraphs;

  const html = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:500px;max-width:500px;font-family:Arial,sans-serif;color:#212121;background:#fff"><tr><td style="font-size:0;height:12px;line-height:0"></td></tr><tr><td><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:100%"><tr><td valign="top" style="width:120px;vertical-align:top;padding:0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr><td style="padding:0 0 14px 0;text-align:center;width:98px"><img src="${photo}" alt="${name}" width="98" height="98" style="display:block;width:98px;height:98px;border:0" referrerpolicy="no-referrer"></td></tr><tr><td style="padding:0;text-align:center"><a href="${website}/" target="_blank" rel="noopener noreferrer" style="display:inline-block;line-height:0"><img src="${logo}" alt="${company}" width="120" height="31" style="display:block;width:120px;height:31px;border:0" referrerpolicy="no-referrer"></a></td></tr></table></td><td valign="top" style="vertical-align:top;padding:0 0 0 14px"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr><td style="padding:0 0 14px 0;border-bottom:2px solid #BDBDBD"><p style="margin:0;line-height:1.2;font-size:16px;font-family:Arial,sans-serif"><span style="font-size:16px;font-weight:bold;color:${brand}">${name}</span><br><span style="font-size:13px;font-weight:bold;color:#646464">${title}</span></p></td></tr>${contactBits.join("")}<tr><td style="padding:${webPad} 0 0 0"><p style="margin:0;font-size:11px;line-height:1.2;font-family:Arial,sans-serif"><a href="${website}" target="_blank" rel="noopener noreferrer" style="color:#212121;text-decoration:none">${websiteLabel}</a></p></td></tr><tr><td style="padding:7px 0 0 0"><p style="margin:0;font-size:11px;line-height:1.2;font-family:Arial,sans-serif"><a href="${maps}" target="_blank" rel="noopener noreferrer" style="color:#212121;text-decoration:none">${address}</a></p></td></tr><tr><td style="padding:7px 0 0 0"><p style="margin:0;font-size:11px;line-height:1.2;font-family:Arial,sans-serif">${company}</p></td></tr><tr><td style="padding:14px 0 0 0">${social}</td></tr></table></td></tr></table></td></tr><tr><td style="padding-top:16px;font-size:1px;line-height:1%">&nbsp;</td></tr><tr><td>${legalBlock}</td></tr><tr><td style="padding-top:16px;font-size:1px;line-height:1%">&nbsp;</td></tr><tr><td><p style="margin:1px;color:#008000;font-size:10px;line-height:1.4;font-family:Arial,sans-serif">Antes de imprimir, pense no meio ambiente. Recicle ou reutilize as suas impressões.</p></td></tr><tr><td style="padding-top:16px;font-size:1px;line-height:1%">&nbsp;</td></tr></table>`;

  return mode === "email" ? minifyHtml(html) : html;
}
