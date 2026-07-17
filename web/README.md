# Assinaturas ComparaJá (ComparaMail)

Sistema web interno para gerar, hospedar e instalar assinaturas de email da ComparaJá.

**Documentação completa:** [../DOCUMENTACAO.md](../DOCUMENTACAO.md)  
**Arquitetura UI:** [../ARQUITETURA-UI.md](../ARQUITETURA-UI.md)

## Início rápido

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## O que faz

- Lista de assinaturas (autenticado `@comparaja.pt`)
- Página individual com pré-visualização + copiar para Gmail: `/s/[slug]`
- Admin (`ADMIN_EMAILS`): CRUD, CSV, settings, sync Google Workspace, publicar MailCJ2026
- HTML cru: `/api/html/[slug]`

## Auth (produção)

- **Google OAuth** obrigatório — só contas Workspace verificadas (`hd=comparaja.pt`)
- **`ADMIN_EMAILS` obrigatório** — lista vazia = ninguém admin (fail-closed)
- Password local: **só desenvolvimento**, sem privilégios admin

## Deploy Vercel

1. Root Directory = `web`
2. Env: `AUTH_URL`, `AUTH_SECRET`, `GOOGLE_*`, `ADMIN_EMAILS`, `BLOB_READ_WRITE_TOKEN`
3. Redirect URIs Google para o domínio de produção
4. Ver checklist em [DOCUMENTACAO.md](../DOCUMENTACAO.md#10-deploy-vercel--checklist)

## Gmail (colaborador)

1. Abre `/s/nome-da-pessoa` ou “A tua assinatura” na home
2. **Copiar assinatura**
3. Gmail → Definições → Assinatura → Colar → Guardar
