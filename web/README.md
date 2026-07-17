# ComparaMail — Assinaturas ComparaJá

Sistema web interno para gerar, hospedar, copiar e publicar assinaturas de email corporativas (substituto do WiseStamp). Deploy na **Vercel**, pasta `web/` como Root Directory.

> **Documentação completa:** [DOCUMENTACAO.md](../DOCUMENTACAO.md) — arquitetura, segurança, env vars, APIs, Workspace, changelog.  
> **UI/layout:** [ARQUITETURA-UI.md](../ARQUITETURA-UI.md)

## O que faz

| Rota | Função |
|------|--------|
| `/` | Diretório de assinaturas (auth obrigatória) + destaque "A tua assinatura" |
| `/s/[slug]` | Pré-visualização + copiar HTML para o Gmail |
| `/api/html/[slug]` | HTML cru da assinatura |
| `/admin` | CRUD pessoas, CSV, settings, sync/publish Google Workspace |
| `/login` | Google OAuth `@comparaja.pt` (+ password só em dev) |

Template: **modelo 01** (table-based, compatível Gmail). Assinatura instalada via API: **MailCJ2026**.

## Quick start local

```bash
cd web
cp .env.example .env.local
# AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, ADMIN_EMAILS (obrigatório para admin)
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Auth

- **Produção:** Google OAuth obrigatório. Só `@comparaja.pt` com `email_verified` + claim `hd`.
- **Admin:** emails em `ADMIN_EMAILS` (lista vazia = **ninguém** admin — fail-closed).
- **Dev:** `ACCESS_PASSWORD` opcional; **nunca** concede admin.

Ver [secção Auth](../DOCUMENTACAO.md#4-autenticação-e-autorização) na documentação completa.

## Deploy Vercel (resumo)

1. Root Directory = `web`
2. Env: `AUTH_URL`, `AUTH_SECRET`, Google OAuth, `ADMIN_EMAILS`, `BLOB_READ_WRITE_TOKEN`
3. Redirect URIs Google Cloud com domínio final
4. Criar Blob Store

Checklist detalhado: [DOCUMENTACAO.md § Deploy](../DOCUMENTACAO.md#10-deploy-na-vercel--checklist)

## Como colar no Gmail (colaborador)

1. Abrir `/s/nome-da-pessoa` (ou "A tua assinatura" na home)
2. **Copiar assinatura para o Gmail**
3. Gmail → Definições → Geral → Assinatura → Ctrl+V → Guardar

## Dados

| Modo | Onde |
|------|------|
| Local | `data/people.json` |
| Produção | Vercel Blob privado (`assinaturas-data.json`) |
