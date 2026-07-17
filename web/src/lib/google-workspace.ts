import { readFileSync, existsSync } from "fs";
import { JWT } from "google-auth-library";
import path from "path";

export type WorkspaceUser = {
  email: string;
  title: string;
  phone: string;
  /** URL de thumbnail do Directory (pode expirar / precisar auth). */
  thumbnailPhotoUrl: string;
};

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
};

const DIRECTORY_SCOPE =
  "https://www.googleapis.com/auth/admin.directory.user.readonly";
/** Escrita no Directory (atualizar cargos). Requer o mesmo Client ID na delegação do domínio. */
const DIRECTORY_USER_WRITE_SCOPE =
  "https://www.googleapis.com/auth/admin.directory.user";
const GMAIL_SETTINGS_SCOPE =
  "https://www.googleapis.com/auth/gmail.settings.basic";

function allowedDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN || "comparaja.pt")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^["']|["']$/g, "");
}

function stripQuotes(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function tryParseServiceAccountJson(raw: string): ServiceAccountJson | null {
  try {
    let parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const obj = parsed as ServiceAccountJson;
    if (obj?.client_email && obj?.private_key) {
      return {
        client_email: obj.client_email,
        private_key: String(obj.private_key).replace(/\\n/g, "\n"),
      };
    }
  } catch {
    return null;
  }
  return null;
}

function loadServiceAccountFromFile(): ServiceAccountJson | null {
  const filePath = (
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    ""
  ).trim();
  if (!filePath) {
    // fallback local padrão (gitignored)
    const fallback = path.join(process.cwd(), ".secrets", "google-sa.json");
    if (!existsSync(fallback)) return null;
    try {
      return tryParseServiceAccountJson(readFileSync(fallback, "utf8"));
    } catch {
      return null;
    }
  }

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!existsSync(resolved)) return null;
  try {
    return tryParseServiceAccountJson(readFileSync(resolved, "utf8"));
  } catch {
    return null;
  }
}

function parseServiceAccount(): ServiceAccountJson | null {
  const fromFile = loadServiceAccountFromFile();
  if (fromFile) return fromFile;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const fromEnv = tryParseServiceAccountJson(raw);
    if (fromEnv) return fromEnv;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (email && key) return { client_email: email, private_key: key };
  return null;
}

export function workspaceAdminEmail(): string {
  return stripQuotes(process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || "");
}

export function workspaceConfigured(): boolean {
  return Boolean(parseServiceAccount() && workspaceAdminEmail());
}

/** Diagnóstico sem expor segredos (para a UI Admin). */
export function workspaceConfigDebug(): {
  configured: boolean;
  hasAdminEmail: boolean;
  hasServiceAccount: boolean;
  jsonEnvLength: number;
  usingFile: boolean;
} {
  const fromFile = Boolean(
    loadServiceAccountFromFile() ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        ""),
  );
  const sa = parseServiceAccount();
  return {
    configured: Boolean(sa && workspaceAdminEmail()),
    hasAdminEmail: Boolean(workspaceAdminEmail()),
    hasServiceAccount: Boolean(sa),
    jsonEnvLength: (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").length,
    usingFile: fromFile && Boolean(sa),
  };
}

function adminEmail(): string {
  const email = workspaceAdminEmail();
  if (!email) throw new Error("GOOGLE_WORKSPACE_ADMIN_EMAIL em falta");
  return email;
}

async function getAuthClient(subject: string, scopes: string[]): Promise<JWT> {
  const sa = parseServiceAccount();
  if (!sa) {
    throw new Error(
      "Service Account em falta. Usa GOOGLE_SERVICE_ACCOUNT_FILE (recomendado) ou GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes,
    subject,
  });
  await client.authorize();
  return client;
}

async function authedFetch(
  subject: string,
  scopes: string[],
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const client = await getAuthClient(subject, scopes);
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Não foi possível obter access token Google");

  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
  });
}

type DirectoryUser = {
  primaryEmail?: string;
  suspended?: boolean;
  organizations?: Array<{ title?: string; primary?: boolean }>;
  phones?: Array<{ value?: string; type?: string; primary?: boolean }>;
  thumbnailPhotoUrl?: string;
};

function pickWorkspacePhone(
  phones?: Array<{ value?: string; type?: string; primary?: boolean }>,
): string {
  if (!phones?.length) return "";
  const normalized = phones
    .map((p) => ({
      value: (p.value || "").trim(),
      type: (p.type || "").toLowerCase(),
      primary: Boolean(p.primary),
    }))
    .filter((p) => p.value);
  if (!normalized.length) return "";

  const primary = normalized.find((p) => p.primary);
  if (primary) return primary.value;

  const mobile = normalized.find(
    (p) => p.type === "mobile" || p.type === "work_mobile",
  );
  if (mobile) return mobile.value;

  const work = normalized.find((p) => p.type === "work");
  if (work) return work.value;

  return normalized[0].value;
}

/** Lista emails + cargos + telemóveis do Workspace (não devolve nomes). */
export async function listWorkspaceEmailsAndTitles(): Promise<WorkspaceUser[]> {
  const domain = allowedDomain();
  const admin = adminEmail();
  const out: WorkspaceUser[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      customer: "my_customer",
      maxResults: "200",
      projection: "full",
      orderBy: "email",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await authedFetch(
      admin,
      [DIRECTORY_SCOPE],
      `https://admin.googleapis.com/admin/directory/v1/users?${params}`,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Directory API ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      users?: DirectoryUser[];
      nextPageToken?: string;
    };

    for (const user of data.users || []) {
      const email = (user.primaryEmail || "").toLowerCase().trim();
      if (!email || user.suspended) continue;
      if (!email.endsWith(`@${domain}`)) continue;

      const orgs = user.organizations || [];
      const primaryOrg = orgs.find((o) => o.primary) || orgs[0];
      const title = (primaryOrg?.title || "").trim();
      const phone = pickWorkspacePhone(user.phones);
      const thumbnailPhotoUrl = (user.thumbnailPhotoUrl || "").trim();

      out.push({ email, title, phone, thumbnailPhotoUrl });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

/**
 * Actualiza o cargo (organizations.title) de um user no Google Workspace Directory.
 * Preserva name/department/etc. da organização primária.
 */
export async function updateWorkspaceUserTitle(
  userEmail: string,
  title: string,
): Promise<void> {
  const email = userEmail.toLowerCase().trim();
  const newTitle = title.trim();
  if (!email || !newTitle) {
    throw new Error("Email e cargo são obrigatórios");
  }

  const admin = adminEmail();
  const scopes = [DIRECTORY_USER_WRITE_SCOPE];
  const userUrl = `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`;

  const getRes = await authedFetch(
    admin,
    scopes,
    `${userUrl}?projection=full`,
  );
  if (!getRes.ok) {
    const text = await getRes.text();
    if (getRes.status === 403) {
      throw new Error(
        "Sem permissão (403). No Google Admin → Delegação do domínio, adiciona o scope admin.directory.user à Service Account.",
      );
    }
    throw new Error(`Directory GET ${getRes.status}: ${text.slice(0, 240)}`);
  }

  const user = (await getRes.json()) as DirectoryUser & {
    organizations?: Array<Record<string, unknown>>;
  };
  const rawOrgs = (user.organizations || []) as Array<Record<string, unknown>>;
  const primaryIdx = rawOrgs.findIndex((o) => o.primary === true);
  const idx = primaryIdx >= 0 ? primaryIdx : 0;

  // Só campos seguros — evita rejeição do PATCH por propriedades só de leitura
  const keepKeys = [
    "name",
    "title",
    "primary",
    "type",
    "department",
    "description",
    "costCenter",
    "location",
    "domain",
    "symbol",
  ] as const;

  function slimOrg(
    src: Record<string, unknown> | undefined,
    titleValue: string,
    primary: boolean,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { title: titleValue, primary };
    if (!src) return out;
    for (const k of keepKeys) {
      if (k === "title" || k === "primary") continue;
      if (src[k] !== undefined && src[k] !== null && src[k] !== "") {
        out[k] = src[k];
      }
    }
    return out;
  }

  const organizations =
    rawOrgs.length === 0
      ? [slimOrg(undefined, newTitle, true)]
      : rawOrgs.map((org, i) =>
          i === idx ? slimOrg(org, newTitle, true) : slimOrg(org, String(org.title || ""), Boolean(org.primary)),
        );

  const patchRes = await authedFetch(admin, scopes, userUrl, {
    method: "PATCH",
    body: JSON.stringify({ organizations }),
  });
  if (!patchRes.ok) {
    const text = await patchRes.text();
    if (patchRes.status === 403) {
      throw new Error(
        "Sem permissão para escrever cargos (403). Adiciona https://www.googleapis.com/auth/admin.directory.user na delegação do domínio e espera 1–2 min.",
      );
    }
    throw new Error(`Directory PATCH ${patchRes.status}: ${text.slice(0, 240)}`);
  }
}

/**
 * Bytes da foto de perfil no Directory (para proxy /api/wphoto e sync).
 */
export async function fetchWorkspacePhotoBytes(
  userEmail: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const email = userEmail.toLowerCase().trim();
  if (!email) return null;
  try {
    const admin = adminEmail();
    const res = await authedFetch(
      admin,
      [DIRECTORY_SCOPE],
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}/photos/thumbnail`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photoData?: string;
      mimeType?: string;
    };
    if (!data.photoData) return null;
    const b64 = data.photoData.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Buffer.from(b64, "base64");
    if (!bytes.byteLength) return null;
    return {
      bytes,
      contentType: data.mimeType || "image/jpeg",
    };
  } catch {
    return null;
  }
}

/**
 * URL durável para gravar em people.json (só HTTPS público).
 * Preferência: Vercel Blob. Sem Blob → null (mantém Drive local).
 * Nunca devolve paths locais nem wphoto: (quebram no Gmail).
 */
export async function resolveWorkspacePhotoUrl(
  userEmail: string,
  _thumbnailPhotoUrl?: string,
): Promise<string | null> {
  const email = userEmail.toLowerCase().trim();
  if (!email) return null;

  const fromApi = await fetchWorkspacePhotoBytes(email);
  if (!fromApi) return null;

  const ext = fromApi.contentType.includes("png") ? "png" : "jpg";
  const safeName = email.replace(/[^a-z0-9@._-]/gi, "_");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(
        `workspace-photos/${safeName}.${ext}`,
        fromApi.bytes,
        {
          access: "public",
          contentType: fromApi.contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        },
      );
      return blob.url;
    } catch {
      // continua
    }
  }

  // Cache local só para UI em dev — não gravar este path em people.json
  try {
    const { mkdir, writeFile } = await import("fs/promises");
    const pathMod = await import("path");
    const dir = pathMod.join(process.cwd(), "public", "workspace-photos");
    await mkdir(dir, { recursive: true });
    await writeFile(pathMod.join(dir, `${safeName}.${ext}`), fromApi.bytes);
  } catch {
    // ignore
  }

  return null;
}

/** Nome da assinatura ComparaMail instalada no Gmail (marca / identificação). */
export function gmailSignatureBrandName(): string {
  return (process.env.GMAIL_SIGNATURE_NAME || "MailCJ2026").trim() || "MailCJ2026";
}

function withSignatureBrand(html: string): string {
  const name = gmailSignatureBrandName();
  const marker = `<!-- ComparaMail:${name} -->`;
  if (html.includes(marker)) return html;
  return `${marker}\n${html}`;
}

/** Publica HTML como assinatura ativa do send-as principal no Gmail. */
export async function publishGmailSignature(
  userEmail: string,
  signatureHtml: string,
): Promise<{ sendAsEmail: string; brandName: string }> {
  const email = userEmail.toLowerCase().trim();
  if (!email) throw new Error("Email em falta");

  const brandName = gmailSignatureBrandName();
  const signature = withSignatureBrand(signatureHtml);
  if (signature.length > 10_000) {
    throw new Error(
      `Signature exceeds maximum length of 10000 characters (${signature.length})`,
    );
  }

  const listRes = await authedFetch(
    email,
    [GMAIL_SETTINGS_SCOPE],
    "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs",
  );
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`Gmail list sendAs ${listRes.status}: ${text.slice(0, 300)}`);
  }

  const listData = (await listRes.json()) as {
    sendAs?: Array<{ sendAsEmail?: string; isPrimary?: boolean }>;
  };
  const primary =
    listData.sendAs?.find((a) => a.isPrimary) ||
    listData.sendAs?.find(
      (a) => (a.sendAsEmail || "").toLowerCase() === email,
    ) ||
    listData.sendAs?.[0];

  const sendAsEmail = (primary?.sendAsEmail || email).trim();
  if (!sendAsEmail) throw new Error("Send-as principal não encontrado");

  const res = await authedFetch(
    email,
    [GMAIL_SETTINGS_SCOPE],
    `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(sendAsEmail)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ signature }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API ${res.status}: ${text.slice(0, 300)}`);
  }

  return { sendAsEmail, brandName };
}
