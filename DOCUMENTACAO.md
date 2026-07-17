# ComparaMail — Documentação do Projeto

Sistema interno da **ComparaJá** para gerir, pré-visualizar e instalar assinaturas de email (substituto do WiseStamp). Deploy na **Vercel** com Root Directory `web/`.

**Repositório:** [Daniel-WorkTi/ComparaMail](https://github.com/Daniel-WorkTi/ComparaMail)

---

## 1. Visão do produto

| Público | O que faz |
|---------|-----------|
| Colaborador `@comparaja.pt` | Vê a lista, abre a sua assinatura, copia HTML para o Gmail |
| Admin (`ADMIN_EMAILS`) | CRUD de pessoas, import CSV, settings empresa, sync Workspace, publicar MailCJ2026 no Gmail |

**Marca:** cor `#45668E`, nome ComparaJá, UI em português (PT).

---

## 2. Stack e estrutura

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 15 (App Router, Turbopack em dev) |
| UI | React 19, Tailwind CSS 4, CSS custom (`globals.css`) |
| Auth | Auth.js / next-auth v5 (Google OAuth) |
| Storage | Ficheiro local (`data/people.json`) ou Vercel Blob |
| Workspace | Google Service Account + Admin SDK + Gmail API |

```
/
├── DOCUMENTACAO.md          ← este ficheiro
├── ARQUITETURA-UI.md        ← wireframes e critérios de UI
├── web/                     ← aplicação Next.js (root Vercel)
│   ├── src/
│   │   ├── app/             ← páginas e Route Handlers
│   │   ├── components/      ← UI React
│   │   ├── lib/             ← lógica (auth, template, storage, workspace…)
│   │   └── middleware.ts
│   ├── data/people.json     ← seed local (não commitar dados sensíveis em prod)
│   ├── .env.example
│   └── .secrets/            ← SA JSON local (gitignored)
└── modelo-01.html           ← referência do template de assinatura
```

---

## 3. Rotas

| Rota | Auth | Função |
|------|------|--------|
| `/login` | Pública | Entrar (Google; password só non-prod) |
| `/` | Privada | Diretório de assinaturas |
| `/s/[slug]` | Privada | Pré-visualização + copiar para Gmail |
| `/admin` | Admin | Gestão completa |
| `/aviso-legal` | Pública | Texto legal completo (site) |
| `/api/html/[slug]` | Privada | HTML cru da assinatura |
| `/api/people` | Admin (GET/POST) | Lista + criar pessoa/settings |
| `/api/people/[id]` | Admin | Editar/apagar |
| `/api/people/import` | Admin | Import CSV |
| `/api/workspace/sync` | Admin | Sync email/cargo/telefone/foto |
| `/api/workspace/publish` | Admin | Instalar assinatura no Gmail |

---

## 4. Autenticação e autorização

### Google OAuth (produção)

- Domínio permitido: `ALLOWED_EMAIL_DOMAIN` (default `comparaja.pt`)
- **Validação no servidor:** `email_verified === true` **e** `profile.hd === comparaja.pt`
- Não confiar só em `email.endsWith("@comparaja.pt")` nem no parâmetro visual `hd=` do OAuth

### Admin — fail-closed

```ts
// ADMIN_EMAILS vazio → NINGUÉM é admin (dev e produção)
isAdminEmail(email) // só true se email está na lista
```

- Login por **password** (só desenvolvimento): **nunca** concede admin
- Password em **produção**: desativada (`ACCESS_PASSWORD` ignorada)
- `requireAdmin()` em **todas** as APIs administrativas — esconder o botão Admin na UI não basta

### Acesso às assinaturas

- Utilizador normal: só vê/copia a assinatura do **próprio email**
- Admin: vê todas (incluindo inativas no painel)

### Sessão

- Cookie HttpOnly, SameSite=Lax, Secure em produção
- `isAdmin` recalculado por pedido a partir de `ADMIN_EMAILS` (não fica stale no JWT)

---

## 5. Dados e storage

### Modelo

```ts
Person { id, slug, name, title, email?, phone?, photoUrl, active, createdAt, updatedAt }
CompanySettings { logoUrl, website, websiteLabel, address, addressMapsUrl, companyName, brandColor, instagramUrl, facebookUrl, linkedinUrl }
```

- `id`, `slug`, `createdAt`, `updatedAt`: **só o servidor** cria
- ~122 pessoas no seed; match Workspace por **email** (nomes locais intactos)

### Persistência

| Modo | Quando |
|------|--------|
| `file` | Dev local (`data/people.json`) |
| `blob` | Produção Vercel (`BLOB_READ_WRITE_TOKEN`) |

**Importante:** em Vercel sem Blob, alterações no admin **não persistem** entre deploys.

### Fotos

- URLs Google Drive / `lh3.googleusercontent.com`
- Proxy assinado: `/api/photo/[id]` com `AUTH_SECRET` (evita hotlink e controla origem)
- Sync Workspace: fotos podem ir para Blob ou `public/workspace-photos/` em dev

---

## 6. Assinatura HTML (`template.ts`)

- Template **table-based** ~500px para Gmail (Arial, inline styles)
- **Não alterar** estrutura de tabelas sem pedido explícito
- Todos os textos passam por `escapeHtml()`
- URLs validadas com `safeHref` / `safeImageUrl`
- **Saiba mais:** `<details>/<summary>` expande o aviso legal **na assinatura** (não abre `/aviso-legal` no email)
- Link “aqui” no 1.º parágrafo → Banco de Portugal

### Pré-visualização (app)

- `SignaturePreview`: **iframe** `sandbox=""` + `srcDoc` (sem scripts, sem same-origin)
- Copiar usa a **string HTML original**, não o DOM do iframe
- `/api/html/[slug]`: CSP estrita, `Cache-Control: private, no-store`

---

## 7. Google Workspace

### Configuração

1. Service Account + chave JSON (preferir `web/.secrets/google-sa.json`)
2. APIs: Admin SDK + Gmail API
3. Delegação em todo o domínio (Super Admin) com scopes:
   - `admin.directory.user.readonly`
   - `gmail.settings.basic`
4. `GOOGLE_WORKSPACE_ADMIN_EMAIL` = email Super Admin `@comparaja.pt` (não o email da SA)

### Sync (`POST /api/workspace/sync`)

Atualiza por match de **email**: cargo, email, telemóvel, foto. **Nunca** sobrescreve nomes nem cria pessoas novas automaticamente.

### Publish (`POST /api/workspace/publish`)

- Instala HTML como assinatura **ativa** do send-as principal no Gmail
- Marca: `GMAIL_SIGNATURE_NAME` (default `MailCJ2026`) via comentário HTML `<!-- ComparaMail:MailCJ2026 -->`
- **Limitação:** Gmail API não cria entradas nomeadas na lista de assinaturas do utilizador

---

## 8. Variáveis de ambiente

Ver `web/.env.example`. Resumo:

| Variável | Obrigatório prod | Notas |
|----------|------------------|-------|
| `AUTH_URL` | Sim | URL pública da app |
| `AUTH_SECRET` | Sim | Sessão + assinatura de fotos |
| `GOOGLE_CLIENT_ID/SECRET` | Sim | OAuth |
| `ALLOWED_EMAIL_DOMAIN` | Sim | `comparaja.pt` |
| `ADMIN_EMAILS` | **Sim** | Fail-closed se vazio |
| `BLOB_READ_WRITE_TOKEN` | Recomendado | Persistência admin |
| `GOOGLE_WORKSPACE_*` | Opcional | Sync/publish |
| `GMAIL_SIGNATURE_NAME` | Opcional | Default MailCJ2026 |
| `ACCESS_PASSWORD` | Não (prod) | Só dev local |

**Nunca** usar `NEXT_PUBLIC_*` para secrets.

---

## 9. Desenvolvimento local

```bash
cd web
cp .env.example .env.local
# Preenche AUTH_SECRET, GOOGLE_*, ADMIN_EMAILS=teu@comparaja.pt
npm install
npm run dev
```

Workspace (opcional):

```bash
node scripts/extract-sa-json.cjs   # se JSON estiver no .env
# Coloca SA em web/.secrets/google-sa.json
```

---

## 10. Deploy Vercel — checklist

- [ ] Root Directory = `web`
- [ ] `AUTH_URL` = URL de produção
- [ ] `AUTH_SECRET` gerado e marcado Sensitive
- [ ] `ADMIN_EMAILS` com emails reais (pelo menos um)
- [ ] Google OAuth redirect URIs de produção
- [ ] Blob Store criado + `BLOB_READ_WRITE_TOKEN`
- [ ] Service Account: env JSON ou ficheiro via secrets
- [ ] `ACCESS_PASSWORD` **não** definida em produção
- [ ] Confirmar que `people.json` não está exposto em `/public`

---

## 11. Segurança (v3.0)

| Área | Medida |
|------|--------|
| Admin | Fail-closed, `requireAdmin` em APIs |
| OAuth | `email_verified` + `hd` |
| XSS | Escape HTML, iframe sandbox, CSP em `/api/html` |
| Validação | Zod `.strict()` em people/settings |
| CSV | Máx. 500KB, 500 linhas, validação antes de gravar |
| CSRF | `assertMutatingOrigin` em mutações |
| Cache | `private, no-store` em rotas privadas |
| Password | Rate-limit 5/15min, desativada em prod |
| URLs imagem | Bloqueio `javascript:`, IPs privados, `data:` |

### Testes manuais recomendados

- Utilizador sem `ADMIN_EMAILS` → 403 em `/admin` e `POST /api/people`
- CSV com `<img onerror=...>` no nome → rejeitado ou escapado
- Preview iframe → script não executa
- Sessão terminada → dados não aparecem em janela anónima

### Pendente (fase seguinte)

- Logs de auditoria estruturados
- CSP com nonce em toda a app
- Dependabot/CodeQL ativos no GitHub
- Soft-delete + confirmação para apagar permanente
- Atualização Next.js (verificar advisory 20 Jul 2026)

---

## 12. Changelog

| Versão | Conteúdo |
|--------|----------|
| **v1** | App base: lista, preview, copy Gmail, admin CRUD, OAuth Google |
| **v2.0** | Workspace sync/publish MailCJ2026, aviso legal expansível, fotos assinadas, hardening inicial |
| **v3.0** | Fail-closed admin, OAuth Workspace claims, XSS isolation, Zod/CSV, loading/feedback UI, documentação |

---

## 13. Contacto e manutenção

- Repo: `Daniel-WorkTi/ComparaMail`
- Branch estável: `main` (v2.0+)
- Desenvolvimento: `APRIMORAMENTO-v3.0`

Para UI/redesign, ver `ARQUITETURA-UI.md` e critérios de aceitação na secção 11 desse documento.
