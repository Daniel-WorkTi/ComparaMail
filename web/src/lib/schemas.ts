import { z } from "zod";
import { safeHref, safeImageUrl } from "@/lib/security";

const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** JSON.parse que rejeita chaves de prototype pollution. */
export function parseJsonSafe(raw: string): unknown {
  return JSON.parse(raw, (key, value) => {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      throw new SyntaxError("Campo proibido no JSON");
    }
    return value;
  });
}

const HTMLISH = /[<>]|javascript:|data:text\/html/i;

function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}

function plainText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max, `${label} demasiado longo`)
    .refine((v) => !HTMLISH.test(v), `${label} contém caracteres inválidos`);
}

function optionalPlain(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} demasiado longo`)
    .refine((v) => !v || !HTMLISH.test(v), `${label} contém caracteres inválidos`);
}

const emailField = z
  .string()
  .trim()
  .max(254)
  .transform((v) => v.toLowerCase())
  .refine((v) => !v || isEmail(v), "Email inválido");

const phoneField = z
  .string()
  .trim()
  .max(40, "Telefone demasiado longo")
  .refine((v) => !v || /^[\d\s+()./-]+$/.test(v), "Telefone inválido");

/** URL de imagem: http(s) ou path relativo interno. */
export const photoUrlSchema = z
  .string()
  .trim()
  .min(1, "URL de foto é obrigatória")
  .max(2000, "URL de foto demasiado longa")
  .transform((v) => safeImageUrl(v))
  .refine((v) => Boolean(v), "URL de foto inválida");

const optionalPhotoUrl = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => {
    if (!v) return "";
    return safeImageUrl(v);
  })
  .refine((v) => v === "" || Boolean(v), "URL de foto inválida");

const httpUrlField = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${label} demasiado longo`)
    .transform((v) => {
      if (!v) return "";
      const href = safeHref(v, ["https:", "http:"]);
      return href === "#" ? "" : href;
    });

const brandColorSchema = z
  .string()
  .trim()
  .max(32)
  .refine(
    (v) => !v || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v),
    "Cor inválida",
  );

/** Criação: sem id/slug/timestamps (só o servidor gera). */
export const personCreateSchema = z
  .object({
    name: plainText(120, "Nome"),
    title: plainText(160, "Cargo"),
    email: emailField.optional(),
    phone: phoneField.optional(),
    photoUrl: photoUrlSchema,
    active: z.boolean().optional(),
  })
  .strict();

/** Update parcial: sem id/slug/timestamps. */
export const personUpdateSchema = z
  .object({
    name: plainText(120, "Nome").optional(),
    title: plainText(160, "Cargo").optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    photoUrl: optionalPhotoUrl.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Nenhum campo para atualizar",
  });

export const companySettingsSchema = z
  .object({
    logoUrl: z.union([z.literal(""), photoUrlSchema]),
    website: httpUrlField("Website"),
    websiteLabel: optionalPlain(80, "Label do website"),
    address: optionalPlain(240, "Morada"),
    addressMapsUrl: httpUrlField("URL do mapa"),
    companyName: plainText(120, "Nome da empresa"),
    brandColor: brandColorSchema,
    instagramUrl: httpUrlField("Instagram"),
    facebookUrl: httpUrlField("Facebook"),
    linkedinUrl: httpUrlField("LinkedIn"),
  })
  .strict()
  .partial();

export const personPostEnvelopeSchema = z
  .object({
    type: z.literal("person").optional(),
    person: personCreateSchema,
  })
  .strict();

export const settingsPostEnvelopeSchema = z
  .object({
    type: z.literal("settings"),
    settings: companySettingsSchema,
  })
  .strict();

/** Linha CSV / rows JSON (colunas: email, nome, cargo, foto). */
export const importRowSchema = z
  .object({
    email: emailField,
    name: plainText(120, "Nome"),
    title: plainText(160, "Cargo"),
    photo: z.string().trim().max(2000),
    phone: phoneField.optional().default(""),
  })
  .strict();

export const importBodySchema = z
  .object({
    csv: z.string().max(500_000).optional(),
    mode: z.enum(["skip", "update"]).optional(),
    rows: z.array(z.unknown()).max(500).optional(),
  })
  .strict()
  .refine((b) => Boolean(b.csv?.trim()) || Boolean(b.rows?.length), {
    message: "Envia csv ou rows",
  });

export function zodErrorMessage(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Dados inválidos";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
