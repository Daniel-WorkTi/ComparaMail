# Assinaturas ComparaJá

Sistema web para gerar, hospedar e copiar assinaturas de email (substituto do WiseStamp), feito para deploy na **Vercel**.

## O que faz

- Lista pública de pessoas: `/`
- Página individual com pré-visualização + botão **Copiar para o Gmail**: `/s/daniel-silva-maia`
- HTML cru da assinatura: `/api/html/daniel-silva-maia`
- Login com **Google** (só `@comparaja.pt`)
- Admin para criar/editar/apagar pessoas + definições da empresa: `/admin`

O template usado é o **modelo 01** (estilo original, sem WiseStamp).

## Login Google (@comparaja.pt)

1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Cria (ou escolhe) um projeto
3. **APIs & Services → OAuth consent screen**
   - Tipo: Internal (se for Google Workspace ComparaJá) — ideal
   - Ou External, e limita ao domínio
4. **Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://teu-dominio.vercel.app`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://teu-dominio.vercel.app/api/auth/callback/google`
5. Copia **Client ID** e **Client Secret** para `.env.local` / Vercel

### Variáveis

```env
AUTH_SECRET=string-longa-aleatoria
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAIL_DOMAIN=comparaja.pt
ADMIN_EMAILS=ti@comparaja.pt,daniel@comparaja.pt
```

- `ALLOWED_EMAIL_DOMAIN` — só este domínio autentica
- `ADMIN_EMAILS` — quem pode gerir o painel  
  - Se estiver **vazio**, toda a gente `@comparaja.pt` pode administrar

No admin, preenche o **email** de cada pessoa. Assim, ao fazer login, aparece destacado **“A tua assinatura”**.

## Desenvolvimento local

```bash
cd web
cp .env.example .env.local
# preenche GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / AUTH_SECRET
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy na Vercel

1. Projeto com Root Directory = `web`
2. Env vars: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL_DOMAIN`, `ADMIN_EMAILS`
3. No Google Cloud, adiciona os redirect URIs do domínio Vercel
4. Cria um **Blob Store** (para o admin persistir dados)
5. Deploy

## Como cada pessoa põe a assinatura no Gmail

1. Abre o link `/s/nome-da-pessoa` (ou faz login e usa “A tua assinatura”)
2. Clica **Copiar assinatura para o Gmail**
3. Gmail → ⚙️ → Ver todas as definições → Geral → Assinatura
4. Ctrl+V / Cmd+V e Guardar alterações

## Dados

- Seed inicial: `data/people.json`
- Em produção com Blob: `assinaturas-data.json` no Vercel Blob

## Modelo 02

O `modelo-02.html` na pasta raiz fica para evoluíres um segundo template. Este app usa o modelo 01.
