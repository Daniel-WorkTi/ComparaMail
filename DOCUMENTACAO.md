# ComparaMail — Documentação do Projeto

> **ComparaMail** é a plataforma interna da ComparaJá para gerar, pré-visualizar, copiar e publicar assinaturas de email corporativas — substituto do WiseStamp, com identidade visual unificada e integração com Google Workspace.

**Branch de referência:** `APRIMORAMENTO-v3.0`  
**Documentação complementar:** [ARQUITETURA-UI.md](./ARQUITETURA-UI.md) (layout/UI para redesign) · [web/README.md](./web/README.md) (quick start)

---

## Índice

1. [Visão de produto](#1-visão-de-produto)
2. [Stack tecnológica](#2-stack-tecnológica)
3. [Estrutura de pastas](#3-estrutura-de-pastas)
4. [Autenticação e autorização](#4-autenticação-e-autorização)
5. [Armazenamento de dados](#5-armazenamento-de-dados)
6. [Template HTML da assinatura](#6-template-html-da-assinatura)
7. [Google Workspace — sync e publicação MailCJ2026](#7-google-workspace--sync-e-publicação-mailcj2026)
8. [Variáveis de ambiente](#8-variáveis-de-ambiente)
9. [Desenvolvimento local](#9-desenvolvimento-local)
10. [Deploy na Vercel — checklist](#10-deploy-na-vercel--checklist)
11. [APIs](#11-apis)
12. [Segurança v3.0](#12-segurança-v30)
13. [Limitações conhecidas](#13-limitações-conhecidas)
14. [Changelog v1 → v2.0 → v3.0](#14-changelog-v1--v20--v30)

---

## 1. Visão de produto

### Problema

A ComparaJá precisava de uma solução interna para assinaturas de email consistentes (marca, aviso legal, redes sociais, foto, cargo), sem depender de serviços externos como WiseStamp, e com controlo sobre dados de colaboradores.

### Solução — ComparaMail

| Persona | O que faz |
|---------|-----------|
| **Colaborador** | Faz login com Google `@comparaja.pt`, vê o diretório da equipa, abre a sua assinatura em `/s/[slug]`, copia o HTML para colar no Gmail |
| **Admin** | CRUD de pessoas, import CSV, settings da empresa, sync com Google Workspace, publicação automática no Gmail como **MailCJ2026** |
| **IT / DevOps** | Deploy na Vercel, Blob privado, Service Account Google, variáveis de ambiente |

### Fluxo principal

```
Login Google (@comparaja.pt)
        │
        ▼
Home (/) — diretório pesquisável + destaque "A tua assinatura"
        │
        ├──► /s/[slug] — preview + copiar para Gmail
        │
        └──► /admin — gestão (só ADMIN_EMAILS)
                    ├── Sync Workspace (cargo, email, telemóvel, foto)
                    └── Publish MailCJ2026 (Gmail API)
```

### Marca

- Nome interno: **ComparaMail**
- Cor principal: `#45668E`
- Assinatura instalada no Gmail: **MailCJ2026** (configurável via `GMAIL_SIGNATURE_NAME`)

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Auth | next-auth v5 (Google OAuth) + JWT cookie local (só dev) |
| Validação | Zod 4 |
| Storage produção | Vercel Blob (JSON privado) |
| Storage local | `web/data/people.json` |
| Google APIs | Admin SDK (Directory), Gmail Settings |
| Deploy | Vercel |
| Runtime | Node.js (serverless functions) |

---

## 3. Estrutura de pastas

```
/
├── DOCUMENTACAO.md          # Este documento
├── ARQUITETURA-UI.md        # Wireframes/UI para redesign
├── modelo-01.html           # Template original de referência
├── modelo-02.html           # Segundo template (futuro)
├── assinatura-*.html        # Exemplos exportados
├── scripts/                 # Utilitários legados (Drive, fotos)
│
└── web/                     # ★ Aplicação Next.js (Root Directory na Vercel)
    ├── .env.example         # Variáveis documentadas
    ├── .secrets/            # Service Account JSON (gitignored)
    ├── data/
    │   ├── people.json      # Seed local (~122 colaboradores)
    │   ├── import.csv       # Dados de importação
    │   └── import-exemplo.csv
    ├── public/
    │   ├── brand/           # Assets da marca
    │   └── workspace-photos/ # Fotos sync (dev local)
    ├── scripts/             # Import/build CSV, extract SA JSON
    └── src/
        ├── auth.ts          # Config next-auth (Google)
        ├── middleware.ts    # Headers segurança + bloqueios prod
        ├── app/
        │   ├── page.tsx           # Home
        │   ├── login/page.tsx
        │   ├── admin/page.tsx
        │   ├── s/[slug]/page.tsx  # Detalhe assinatura
        │   ├── aviso-legal/page.tsx
        │   └── api/               # REST endpoints
        ├── components/      # UI (AdminPanel, SignaturePreview, …)
        └── lib/
            ├── auth.ts            # Sessão, admin, access control
            ├── access-control.ts  # requireUser / requireAdmin
            ├── storage.ts         # Blob vs file
            ├── template.ts        # HTML assinatura email
            ├── google-workspace.ts
            ├── workspace-sync.ts
            ├── photo-sign.ts      # HMAC URLs fotos
            ├── security.ts        # escape, CSP helpers, rate limit
            ├── schemas.ts         # Zod validation
            └── people.ts          # CRUD lógica
```

---

## 4. Autenticação e autorização

### Google OAuth (produção — obrigatório)

- Provider: Google via next-auth v5
- Redirect URI: `{AUTH_URL}/api/auth/callback/google`
- Parâmetro `hd=comparaja.pt` força seleção de conta Workspace

**Validação fail-closed no callback `signIn`:**

| Claim | Requisito |
|-------|-----------|
| `email_verified` | Deve ser `true` |
| `hd` (hosted domain) | Deve ser exatamente `ALLOWED_EMAIL_DOMAIN` (ex.: `comparaja.pt`) |
| `email` | Obrigatório |

> Não se confia apenas em `email.endsWith("@comparaja.pt")` — contas pessoais Google não passam.

### Admin — `ADMIN_EMAILS` (fail-closed)

```
ADMIN_EMAILS=admin@comparaja.pt,it@comparaja.pt
```

| Regra | Comportamento |
|-------|---------------|
| Lista **vazia** | **Ninguém** é admin (dev e produção) |
| Email na lista | Admin completo (`/admin`, APIs mutáveis, workspace) |
| Email fora da lista | Utilizador normal — só vê a **própria** assinatura |

`isAdmin` é recalculado em cada pedido JWT/session — alterar `ADMIN_EMAILS` não exige re-login.

### Login — apenas Google Workspace

- Sem password / formulário local
- API `/api/auth/password` retorna **404**
- Contas Gmail pessoais rejeitadas (`email_verified` + `hd` + sufixo `@comparaja.pt`)

### Modo público — bloqueado em produção

`SIGNATURES_PUBLIC=true` bypassa auth em dev. O **middleware** devolve HTTP 500 em produção se esta variável estiver ativa.

### Matriz de acesso

| Recurso | Não autenticado | Google normal | Admin |
|---------|-----------------|---------------|-------|
| `/`, `/s/*` | ❌ | ✅ (própria*) | ✅ (todas) |
| `/admin` | ❌ | ❌ | ✅ |
| `/api/people/*` | ❌ | ❌ | ✅ |
| `/api/workspace/*` | ❌ | ❌ | ✅ |
| `/api/html/[slug]` | ❌ | ✅ (própria) | ✅ |
| `/api/photo/[id]` | ❌** | ✅ | ✅ |

\* Filtrado por `canAccessPersonEmail()` — email da sessão = email da pessoa.  
\** Exceto com token HMAC assinado (`?e=&s=`) para clientes de email.

---

## 5. Armazenamento de dados

### Modo `file` (local)

- Ficheiro: `web/data/people.json`
- Estrutura: `{ settings: CompanySettings, people: Person[] }`
- Escrita direta no disco
- **Vercel:** filesystem efémero — alterações admin **não persistem** sem Blob

### Modo `blob` (produção)

- Ativado quando `BLOB_READ_WRITE_TOKEN` está definido
- Ficheiro privado: `assinaturas-data.json` no Vercel Blob (`access: "private"`)
- Seed: se Blob vazio, copia de `people.json` local na primeira escrita
- PII **fora do git** em produção

### Fotos — URLs assinadas

Fotos Google Drive usam proxy `/api/photo/[id]`:

```
/api/photo/{DRIVE_ID}?e={exp_unix}&s={hmac_base64url}
```

- HMAC-SHA256 com `AUTH_SECRET`
- TTL padrão: 365 dias (Gmail precisa de URLs estáveis)
- Acesso: sessão autenticada **ou** token assinado válido
- Rate limit: 120 req/min por IP em pedidos assinados

Fotos sync Workspace podem ir para Blob público (`workspace-photos/`) ou `public/workspace-photos/` em dev.

---

## 6. Template HTML da assinatura

**Ficheiro:** `web/src/lib/template.ts` · Referência visual: `modelo-01.html`

### Características

- Layout **table-based** (~500px) compatível com Gmail/Outlook
- Fonte: Arial (email clients)
- Campos dinâmicos passam por `escapeHtml()` antes de injetar no HTML
- URLs passam por `safeHref()` / `safeImageUrl()` (allowlist de protocolos)
- Modos de render:
  - `preview` — paths relativos assinados (browser)
  - `email` — URLs absolutas com `origin` (Gmail)

### Secções do template

1. Foto (98×98) + logo empresa
2. Nome (cor marca) + cargo
3. Contactos: telemóvel, email (opcionais)
4. Website, morada (link Maps), nome empresa
5. Redes sociais (Instagram, Facebook, LinkedIn)
6. **Aviso legal** — bloco `<details>` expansível
7. Mensagem ambiental (verde)

### Bloco "Saiba mais" (`<details>`)

O rodapé legal usa HTML nativo `<details>/<summary>`:

- **Fechado:** texto resumo "Aviso legal e confidencialidade." + link **Saiba mais** (sublinhado, cor marca)
- **Expandido:** três parágrafos:
  1. Intermediação de crédito Banco de Portugal (nº 0000375) + link bportugal.pt
  2. Confidencialidade da mensagem e anexos
  3. RGPD — obrigações do destinatário
  4. Instruções se recebeu por engano

> Gmail suporta `<details>` de forma limitada; o bloco funciona como expand/collapse na maioria dos clientes modernos.

### Marca ComparaMail no Gmail

Ao publicar via API, o HTML inclui comentário:

```html
<!-- ComparaMail:MailCJ2026 -->
```

Permite identificar assinaturas instaladas pela plataforma.

---

## 7. Google Workspace — sync e publicação MailCJ2026

### Pré-requisitos

1. **Cloud Console:** Service Account + chave JSON
2. **APIs ativas:** Admin SDK API + Gmail API
3. **Google Admin → Segurança → Delegação em todo o domínio:**
   - Client ID da SA
   - Scopes:
     - `https://www.googleapis.com/auth/admin.directory.user.readonly`
     - `https://www.googleapis.com/auth/gmail.settings.basic`
4. **Super Admin** em `GOOGLE_WORKSPACE_ADMIN_EMAIL` (para impersonation no sync)

### Sync (`POST /api/workspace/sync`)

Atualiza **por match de email** (nomes e slugs locais intactos):

| Campo | Comportamento |
|-------|---------------|
| email | Atualiza se diferente no Directory |
| cargo (title) | Atualiza se Google tiver valor |
| telemóvel | Atualiza se Google tiver valor; não apaga local se vazio |
| foto | Tenta thumbnail Directory → Blob/local; mantém local se falhar |

### Publish (`POST /api/workspace/publish`)

Instala assinatura HTML como **send-as principal** ativo no Gmail:

```json
{ "slug": "daniel-silva-maia" }   // uma pessoa
{ "all": true }                    // todos com email
```

- Nome da assinatura: `GMAIL_SIGNATURE_NAME` (default **MailCJ2026**)
- Impersona cada utilizador via Gmail Settings API
- HTML renderizado em modo `email` (URLs absolutas)

### UI Admin

Tab **Pessoas** → secção **Google Workspace**:

- **Sincronizar do Google Workspace**
- **Instalar MailCJ2026 em todos**
- Por linha na tabela: botão individual "Instalar MailCJ2026 no Gmail"

---

## 8. Variáveis de ambiente

Todas definidas em `web/.env.example`. **Nunca commitar valores reais.**

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `AUTH_URL` | Prod | URL pública da app (anti Host-header poisoning). Ex.: `https://teu-dominio.vercel.app` |
| `AUTH_SECRET` | Prod | String longa aleatória. Assina sessões e URLs de fotos |
| `SIGNATURES_PUBLIC` | Não | `true` = acesso sem login. **Bloqueado em produção** |
| `ACCESS_PASSWORD` | Dev | Password login local. **Ignorada em produção** |
| `GOOGLE_CLIENT_ID` | Prod | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Prod | OAuth Client Secret (nunca commitar) |
| `ALLOWED_EMAIL_DOMAIN` | Sim | Domínio Workspace permitido. Default: `comparaja.pt` |
| `ADMIN_EMAILS` | Sim* | Emails admin separados por vírgula. *Vazio = ninguém admin |
| `GOOGLE_WORKSPACE_ADMIN_EMAIL` | Workspace | Email Super Admin para impersonation |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | Workspace | Caminho ao JSON da SA (recomendado: `web/.secrets/google-sa.json`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Workspace | Alternativa: JSON numa linha (frágil no Windows) |
| `GMAIL_SIGNATURE_NAME` | Não | Nome da assinatura Gmail. Default: `MailCJ2026` |
| `BLOB_READ_WRITE_TOKEN` | Prod | Token Vercel Blob para persistência |

**Alternativas SA (fallback):**

- `GOOGLE_APPLICATION_CREDENTIALS` — caminho alternativo ao ficheiro
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — campos separados

**Fallbacks de URL (não substituem `AUTH_URL` em prod):**

- `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`

---

## 9. Desenvolvimento local

```bash
cd web
cp .env.example .env.local
# Preencher: AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_EMAILS
# Opcional: ACCESS_PASSWORD (login sem Google)
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### Service Account local

```bash
# Extrair JSON para ficheiro (evita problemas de aspas no .env)
node scripts/extract-sa-json.cjs
# Cria web/.secrets/google-sa.json
```

### Import de pessoas

```bash
npm run import:people   # script CLI
# ou CSV via Admin → tab Importar
```

### Modos de teste

| Cenário | Config |
|---------|--------|
| Só password | `ACCESS_PASSWORD=...` (sem Google) |
| Só Google | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Admin | Email em `ADMIN_EMAILS` + login Google |
| Workspace | SA JSON + `GOOGLE_WORKSPACE_ADMIN_EMAIL` |

---

## 10. Deploy na Vercel — checklist

### Configuração do projeto

- [ ] **Root Directory:** `web`
- [ ] Framework: Next.js (auto-detect via `vercel.json`)

### Variáveis de ambiente (Production)

- [ ] `AUTH_URL` = URL final do domínio (ex.: `https://assinaturas.comparaja.pt`)
- [ ] `AUTH_SECRET` = string aleatória forte (`openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- [ ] `ALLOWED_EMAIL_DOMAIN=comparaja.pt`
- [ ] `ADMIN_EMAILS` = pelo menos um email admin
- [ ] `BLOB_READ_WRITE_TOKEN` (criar Blob Store na Vercel)
- [ ] `SIGNATURES_PUBLIC` = **não definir** ou `false`
- [ ] Workspace (se necessário): SA JSON + `GOOGLE_WORKSPACE_ADMIN_EMAIL`

### Google Cloud Console

- [ ] Authorized JavaScript origins: `https://teu-dominio.vercel.app`
- [ ] Authorized redirect URIs: `https://teu-dominio.vercel.app/api/auth/callback/google`

### Pós-deploy

- [ ] Login Google com conta `@comparaja.pt`
- [ ] Verificar `/admin` com email admin
- [ ] Testar copiar assinatura em `/s/[slug]`
- [ ] Confirmar `storageMode: blob` no admin
- [ ] (Opcional) Sync + publish MailCJ2026

---

## 11. APIs

### Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/auth/[...nextauth]` | — | Google OAuth (next-auth handlers) |
| POST | `/api/auth/password` | — | Login password (**403 em prod**) |
| POST | `/api/auth/logout` | — | Limpa sessão password + signOut |

### Pessoas e settings

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/people` | Admin | Lista pessoas + settings + storageMode |
| POST | `/api/people` | Admin | Criar pessoa (`type: person`) ou settings (`type: settings`) |
| PUT | `/api/people/[id]` | Admin | Atualizar pessoa (Zod) |
| DELETE | `/api/people/[id]` | Admin | Apagar pessoa |
| POST | `/api/people/import` | Admin | Import CSV/rows (max 500 linhas, 500KB) |

### Assinatura e media

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/html/[slug]` | User* | HTML puro da assinatura (CSP restritiva) |
| GET | `/api/photo/[id]` | User ou HMAC | Proxy foto Drive |

\* User com acesso à pessoa (`canAccessPersonEmail`).

### Google Workspace

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/workspace/sync` | Admin | Estado config Workspace (debug sem segredos) |
| POST | `/api/workspace/sync` | Admin | Executar sync email/cargo/tel/foto |
| POST | `/api/workspace/publish` | Admin | Publicar assinatura(s) no Gmail (`slug` ou `all`) |

### Proteções transversais

- Mutações (`POST`/`PUT`/`DELETE`): `assertMutatingOrigin()` — valida header `Origin`
- Respostas privadas: `Cache-Control: private, no-store`
- Body limits: people 200KB, CSV 500KB

---

## 12. Segurança v3.0

Medidas introduzidas/reforçadas nos commits `e5fc993`, `3a28f72`, `c4415bb`:

### e5fc993 — Admin fail-closed + OAuth Workspace

| Medida | Detalhe |
|--------|---------|
| Admin fail-closed | `ADMIN_EMAILS` vazio = zero admins; password nunca admin |
| Google OAuth hardened | Exige `email_verified=true` + claim `hd` = domínio |
| `access-control.ts` | Helpers centralizados `requireUser()` / `requireAdmin()` |
| APIs unificadas | Todas as rotas mutáveis usam `requireAdmin` consistente |
| Recálculo admin | JWT/session recalcula `isAdmin` a cada pedido |

### 3a28f72 — XSS preview + escaping

| Medida | Detalhe |
|--------|---------|
| Preview iframe sandbox | `sandbox=""` — iframe isolado, sem scripts/forms/top-nav |
| Copy usa HTML original | `SignatureInstallPanel` copia string server-side, não DOM do iframe |
| `escapeHtml()` universal | Todos os campos dinâmicos no template escapados |
| `safeImageUrl()` | Bloqueia `javascript:`, `data:`, hosts privados, http |
| CSP em `/api/html` | `script-src 'none'`, `default-src 'none'`, `sandbox` |
| Headers HTML | `Referrer-Policy: no-referrer`, `frame-ancestors 'none'` |

### c4415bb — Validação Zod + limites + cache

| Medida | Detalhe |
|--------|---------|
| Zod schemas | Person, settings, CSV rows — `.strict()` sem campos extra |
| Prototype pollution | `parseJsonSafe()` rejeita `__proto__`, `constructor` |
| Limites CSV | Max 500 linhas, 500KB payload |
| Limites body | POST people max 200KB |
| Cache privado | Middleware + `jsonPrivate()` em rotas sensíveis |
| Rate limit login | 5 tentativas/15min por IP (password) |
| Middleware headers | HSTS, `X-Frame-Options: DENY`, `nosniff`, Permissions-Policy |
| Bloqueio prod | `SIGNATURES_PUBLIC` e `AUTH_URL` em falta → HTTP 500 |

### Medidas anteriores (v1/v2, ainda ativas)

- Fotos assinadas HMAC (`photo-sign.ts`)
- CSRF via validação Origin em mutações
- Comparação timing-safe de passwords/tokens
- Acesso por email: não-admin só vê assinatura própria
- Blob privado para PII

---

## 13. Limitações conhecidas

| Limitação | Impacto |
|-----------|---------|
| Rate limit in-memory | Por instância serverless — não global entre regiões |
| `<details>` no Gmail | Suporte inconsistente em clientes email antigos |
| Fotos Drive | Dependem de proxy; IDs inválidos → 404 |
| Publish Gmail | Requer delegação SA + impersonation por utilizador |
| Sync match por email | Pessoas sem email local não sincronizam |
| Password dev vê tudo | Sem email na sessão, não filtra por pessoa |
| Vercel sem Blob | Admin não persiste alterações |
| Thumbnail Workspace | URLs Directory podem expirar; preferir Blob |
| next-auth beta | v5 beta.31 — monitorizar updates |
| ~122 pessoas | UI otimizada para centenas, não milhares |

---

## 14. Changelog v1 → v2.0 → v3.0

### v1.0 — Initial commit (`e783185`)

- App Next.js ComparaMail — assinaturas email ComparaJá
- Template modelo 01 (substituto WiseStamp)
- Lista pública, páginas individuais, HTML API
- Login Google + password local
- Admin CRUD, import CSV, settings empresa
- Seed `people.json` (~122 colaboradores)

### v1.x — Hardening inicial (`8b8c27f`, `d81818d`, `8be5eb8`)

- Controlo de acesso por email
- Fotos assinadas HMAC para Gmail
- Proteções XSS/CSRF base
- Fix crash produção sem `people.json`
- Fix preview fotos e logos

### v2.0 — Versão de teste (`70aff4d`)

- Integração Google Workspace (sync + publish)
- Assinatura Gmail **MailCJ2026**
- Vercel Blob privado
- UI admin com tabs (pessoas, CSV, settings, workspace)
- Proxy fotos Drive `/api/photo/[id]`
- Preview e copy para Gmail melhorados

### v3.0 — Segurança e validação (`e5fc993`, `3a28f72`, `c4415bb`)

- **Admin fail-closed:** `ADMIN_EMAILS` vazio = zero admins
- **OAuth hardened:** `hd` + `email_verified` obrigatórios
- **Password:** bloqueada em produção; nunca concede admin
- **Preview sandbox:** iframe isolado + copy via HTML original
- **Escape universal** no template de assinatura
- **Zod validation** em todas as entradas API
- **Limites CSV/body** e cache `private, no-store`
- **CSP** restritiva no endpoint HTML
- **Middleware** reforçado (HSTS, frame deny, bloqueio modo público)

---

## Contacto e manutenção

- Repositório: Assinaturas Eletrónica ComparaJá
- Branch ativa: `APRIMORAMENTO-v3.0`
- Para alterações de UI/layout: ver [ARQUITETURA-UI.md](./ARQUITETURA-UI.md)
