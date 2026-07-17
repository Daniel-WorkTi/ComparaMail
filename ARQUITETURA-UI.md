# Arquitetura UI — Assinaturas de Email ComparaJá

Documento para outra IA redesenhar o **layout/UI da aplicação web**.  
**Não alterar** a estrutura HTML da assinatura de email (template table-based para Gmail), salvo pedido explícito.

---

## 1. Produto

App interna Next.js (App Router) da **ComparaJá** para:
1. Colaboradores autenticados verem a lista de assinaturas
2. Abrir a assinatura de uma pessoa, pré-visualizar e **copiar HTML para o Gmail**
3. Admins gerirem pessoas (CRUD), importarem CSV, e editarem settings da empresa

- **Stack:** Next.js 15, React 19, Tailwind CSS 4, next-auth (Google opcional), password local
- **Marca:** cor `#45668E`, nome `ComparaJá`
- **Idioma UI:** Português (PT)
- **Dados:** ~122 pessoas em `web/data/people.json`
- **Dev local:** `http://localhost:3000` (pasta `web/`)

---

## 2. Mapa de rotas (páginas)

| Rota | Tipo | Auth | Quem vê | Função |
|------|------|------|---------|--------|
| `/login` | Página | Pública | Todos | Entrar (password e/ou Google `@comparaja.pt`) |
| `/` | Página | Privada | Utilizadores autenticados | Diretório de assinaturas + destaque “a tua” |
| `/s/[slug]` | Página | Privada | Utilizadores autenticados | Detalhe: instruções Gmail + copiar + preview |
| `/admin` | Página | Privada + admin | Admins | Gestão: pessoas, CSV, settings empresa |
| `/api/html/[slug]` | API (HTML) | Privada | Autenticados | HTML puro da assinatura (abrir em tab) |

### Fluxo de navegação

```
/login
   │  (auth OK)
   ▼
/  ──────────────────────────────►  /admin   (só se isAdmin)
   │                                   │
   │  clica pessoa                     │  “Ver lista”
   ▼                                   ▼
/s/[slug]  ◄──────────────────────────┘
   │
   ├── botão “Copiar assinatura para o Gmail”
   └── link “Abrir só o HTML” → /api/html/[slug]
```

### Redirects

- Não autenticado em `/`, `/s/*`, `/admin` → `/login`
- Autenticado em `/login` → `/`
- Autenticado mas não admin em `/admin` → `/?error=admin`

---

## 3. Páginas — estrutura de conteúdo (wireframe textual)

### 3.1 `/login` — Entrar

**Objetivo:** autenticar. Uma composição centrada, marca em destaque.

**Blocos:**
1. **Brand** — wordmark “ComparaJá” + subtítulo “Assinaturas de email · acesso interno”
2. **Painel de login**
   - Título: “Entrar”
   - Texto de apoio (password / Google)
   - Alertas condicionais: modo público, acesso negado Google, config em falta
   - Form password (`PasswordLoginForm`): campo password + botão “Entrar”
   - Separador “ou” (se Google ativo)
   - Botão “Continuar com Google” (server action `signIn("google")`)

**Estados:**
- `ACCESS_PASSWORD` definido → form password
- Google configurado → botão Google
- `error=AccessDenied` → alerta domínio inválido
- Só contas `@comparaja.pt` no Google

**Componentes:** `PasswordLoginForm`

---

### 3.2 `/` — Lista / Home

**Objetivo:** encontrar e abrir assinaturas. Escala: 100+ pessoas → **pesquisa obrigatória**.

**Blocos:**
1. **Header**
   - Kicker: nome da empresa (`settings.companyName`)
   - Título: “Assinaturas de email”
   - Lede: área interna, copiar para Gmail
   - Ações: “Administração” (se admin) + “Sair” (`LogoutButton`)
2. **Alerta** (condicional `?error=admin`) — sem permissão admin
3. **Card “A tua assinatura”** (se o email da sessão bate com uma pessoa)
   - Foto, nome, cargo, CTA “Abrir” → `/s/{slug}`
4. **Diretório** (`PeopleDirectory`)
   - Título “Equipa” + contagem filtrada
   - Input pesquisa (nome, cargo, email)
   - Lista de linhas clicáveis: avatar, nome, cargo, chip “A tua”, ação “Abrir”
   - Empty states: sem pessoas / sem resultados

**Dados:** `listPeople(false)` = só `active: true`  
**Componentes:** `PeopleDirectory`, `LogoutButton`

---

### 3.3 `/s/[slug]` — Assinatura individual

**Objetivo:** copiar a assinatura para o Gmail com o mínimo de atrito.

**Blocos:**
1. **Nav** — “← Todas as assinaturas” + link “Abrir só o HTML”
2. **Header pessoa** — foto (desktop), kicker empresa, nome, cargo, email
3. **Painel “Como colar no Gmail”**
   - Lista numerada (5 passos)
   - `CopySignatureButton` (copia HTML+plain para clipboard)
4. **Pré-visualização** — `SignaturePreview` (HTML injectado)
   - Dica fallback Ctrl+A / Ctrl+C

**Dados:** `getPersonBySlug` + `getSettings` + `renderSignatureHtml`  
**Nota UI:** o HTML dentro do preview é o template de email (tabela 500px). O cromado à volta pode mudar; o HTML interno é produto.

**Componentes:** `CopySignatureButton`, `SignaturePreview`

---

### 3.4 `/admin` — Administração

**Objetivo:** gerir dados. Layout atual com **tabs**.

**Header:**
- Kicker “ComparaJá · Administração”
- Título “Assinaturas”
- Sessão (nome/email) + modo storage (`file` | blob)
- Aviso se storage = `file` (Vercel não persiste sem Blob)
- Ações: “Ver lista” + “Sair”

**Feedback:** `FeedbackBanner` (sucesso/erro/info) + `BusyOverlay` durante sync/publish/import/guardar

**Google Workspace (tab Pessoas):**
- Sync: email, cargo, telemóvel, foto (nomes locais intactos)
- Publish MailCJ2026: instala assinatura ativa no Gmail de cada conta

**Tabs:**

#### Tab A — Pessoas
1. **Form** criar/editar pessoa  
   Campos: `name`, `title`, `photoUrl`, `email` (opcional), `active` (checkbox)  
   Botões: Guardar / Cancelar (se editar)
2. **Tabela** de pessoas  
   Colunas: Foto | Nome (+ badge inativa) | Cargo | Link `/s/{slug}` | Editar / Apagar  
   Filtro texto no topo

#### Tab B — Importar CSV
- Instruções colunas: `email,nome,cargo,foto` (foto = ID Drive ou URL)
- Textarea CSV
- Radio: `update` (atualizar se email existe) | `skip` (ignorar duplicados)
- Botão “Importar CSV”

#### Tab C — Empresa (settings)
Campos: `companyName`, `website`, `websiteLabel`, `logoUrl`, `address`, `addressMapsUrl`, `brandColor`, `instagramUrl`, `facebookUrl`, `linkedinUrl`  
Botão “Guardar definições”

**Componentes:** `AdminPanel` (client, concentra quase toda a UI admin)

---

## 4. Componentes UI

| Componente | Tipo | Responsabilidade |
|------------|------|------------------|
| `Providers` | Client | SessionProvider (next-auth) |
| `PasswordLoginForm` | Client | Login por password → POST `/api/auth/password` |
| `LogoutButton` | Client | Limpa sessão password + signOut Google → `/login` |
| `PeopleDirectory` | Client | Pesquisa + lista de pessoas na home |
| `SignaturePreview` | Server-safe | iframe `sandbox=""` + `srcDoc` (isolamento XSS) |
| `SignatureInstallPanel` | Client | Copiar + passos Gmail + `FeedbackBanner` em erro |
| `BusyOverlay` | Client | Loading minimalista em ações longas |
| `FeedbackBanner` | Client | Sucesso/erro/info com dismiss |
| `AdminPanel` | Client | Toda a UI admin (tabs, forms, tabela, CSV, settings, Workspace) |

---

## 5. Modelo de dados (para UI)

```ts
Person {
  id, slug, name, title, email?, photoUrl, active, createdAt, updatedAt
}

CompanySettings {
  logoUrl, website, websiteLabel, address, addressMapsUrl,
  companyName, brandColor, instagramUrl, facebookUrl, linkedinUrl
}
```

- `photoUrl` tipicamente: `https://lh3.googleusercontent.com/d/{DRIVE_FILE_ID}=s400`
- `slug` usado na rota `/s/[slug]`
- Pessoas inativas: ocultas na home; visíveis no admin

---

## 6. APIs relevantes à UI

| Método | Rota | Uso na UI |
|--------|------|-----------|
| POST | `/api/auth/password` | Login password |
| POST | `/api/auth/logout` | Logout |
| GET/POST | `/api/auth/[...nextauth]` | Google OAuth |
| GET | `/api/people` | Refresh lista no admin |
| POST | `/api/people` | Criar pessoa (`type: person`) ou settings (`type: settings`) |
| PUT | `/api/people/[id]` | Editar pessoa |
| DELETE | `/api/people/[id]` | Apagar pessoa |
| POST | `/api/people/import` | Import CSV `{ csv, mode }` |
| GET/POST | `/api/workspace/sync` | Estado + sync Workspace |
| POST | `/api/workspace/publish` | Publicar assinatura no Gmail |
| GET | `/api/html/[slug]` | HTML da assinatura (CSP estrita) |

---

## 7. Auth / roles (impacto UI)

| Condição | Comportamento UI |
|----------|------------------|
| Sem sessão | Só `/login` |
| Password `ACCESS_PASSWORD` | Login local **sem admin**; desativado em produção |
| Google `@comparaja.pt` + `hd` verificado | Login empresa |
| `ADMIN_EMAILS` | Lista explícita; **vazio = ninguém admin** (fail-closed) |
| Botão Admin | Só aparece na home se `isAdminUser()` |

---

## 8. Design system atual (pode ser substituído)

Ficheiros: `src/app/globals.css`, `src/app/layout.tsx`

**Tipografia atual:** Manrope (UI) + Fraunces (títulos/marca) via `next/font`

**Tokens CSS (`:root`):**
- `--brand: #45668E` · `--brand-deep: #2F4866` · `--brand-soft` · `--brand-wash`
- `--ink` · `--ink-soft` · `--muted` · `--line` · `--surface`
- Classes: `.cj-shell`, `.cj-panel`, `.cj-btn-*`, `.cj-input`, `.cj-person`, `.cj-alert-*`, `.cj-table`, `.cj-title`, `.cj-kicker`

**Fundo:** gradiente azul-suave (não flat branco)

**Restrições desejáveis para o novo layout:**
- Manter identidade ComparaJá (azul `#45668E`, não roxo genérico)
- Evitar UI “dashboard SaaS” genérica com cards/méticas inúteis
- Home e login: hierarquia clara; marca visível
- Mobile-first: lista longa usável em telemóvel
- Admin: organização clara (tabs ou sidebar), tabela 100+ linhas com filtro
- Acessibilidade: contraste, labels, focus states
- Não depender de emojis decorativos
- O **HTML da assinatura de email** (largura ~500px, tabelas, Arial) deve continuar a ser o preview copiável — redesenhar só o **chrome** da app
- Preview usa **iframe sandbox** (sem scripts); “Saiba mais” expande `<details>` no template, não link externo no email

---

## 9. Ficheiros-chave da UI

```
web/src/app/layout.tsx          # root layout + fonts
web/src/app/globals.css         # design tokens / classes
web/src/app/page.tsx            # home
web/src/app/login/page.tsx      # login
web/src/app/s/[slug]/page.tsx  # detalhe assinatura
web/src/app/admin/page.tsx      # shell admin (dados + AdminPanel)
web/src/components/*.tsx        # UI parts
web/src/lib/template.ts         # HTML assinatura email (NÃO é layout da app)
web/data/people.json            # dados
```

---

## 10. Prompt sugerido para a IA de design

> Redesenha a UI desta app Next.js de assinaturas ComparaJá conforme a arquitetura acima.
> Entrega: novos layouts para `/login`, `/`, `/s/[slug]`, `/admin` (e CSS/tokens).
> Mantém rotas, auth, props, APIs e o HTML da assinatura de email intactos.
> Prioriza usabilidade com ~120 pessoas (pesquisa, densidade boa, mobile).
> Visual: profissional, marca `#45668E`, tipografia expressiva (não Inter/Roboto/Arial no chrome da app), fundo com atmosfera subtil.
> Português PT. Sem mudar a lógica de negócio.

---

## 11. Critérios de aceitação do novo layout

- [ ] Login claro com marca ComparaJá
- [ ] Home pesquisável; “a tua assinatura” destacada quando existir
- [ ] Página `/s/[slug]` com copy + preview + passos Gmail
- [ ] Admin com CRUD, CSV e settings acessíveis
- [ ] Desktop + mobile
- [ ] Sem regressões de auth/admin
- [ ] Preview da assinatura continua a copiar HTML válido para Gmail
