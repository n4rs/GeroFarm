# GeroFarm

Fundação técnica do GeroFarm, uma aplicação nova que corre em paralelo com o GeroCampo. Esta etapa contém apenas servidor, shell web e integração central de identidade e acesso; ainda não contém a plataforma agrícola nem uma base de dados de produto.

## Incluído nesta etapa

- Node.js 22, TypeScript, Express, React e Vite.
- Health check em `GET /api/health`.
- Login e registo redirecionados para `account.gero.pt`.
- Validação server-side da cookie HttpOnly `gero_session` no GeroCore.
- Contexto e troca segura de organização através de cookie local assinada.
- Autorização fail-closed para a aplicação Core com código `farm`.
- Planos e entitlements recebidos do GeroCore, sem os simular no frontend.
- Logout e preferência de idioma encaminhados com a proteção CSRF do GeroCore.
- Shell pública e área autenticada temporária em `/app`.
- App Spec de referência para DigitalOcean em `.do/app.yaml`.

## Desenvolvimento local

Requer Node.js 22 ou superior.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

A aplicação fica em `http://127.0.0.1:5000` e o health check em `http://127.0.0.1:5000/api/health`.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
```

## Configuração

As variáveis não secretas estão documentadas em `.env.example`. `FARM_TENANT_SECRET` assina apenas a seleção local da organização; deve ser aleatória, ter pelo menos 32 caracteres e ser guardada como variável encriptada na DigitalOcean. Nunca deve ser reutilizada como segredo do GeroCore.

O GeroFarm não acede à base de dados do GeroCore. Quando os primeiros domínios agrícolas forem implementados, terá uma base PostgreSQL própria e isolamento por organização, seguindo o padrão das outras aplicações Gero.

## DigitalOcean App Platform

O ficheiro `.do/app.yaml` descreve um único Web Service ligado a `n4rs/GeroFarm`, branch `main`, com build `npm ci && npm run build`, arranque `npm start`, porta `8080` e health check `/api/health`.

Antes de disponibilizar o login em produção:

1. Criar a app `gero-farm` na região europeia pretendida e selecionar este repositório/branch.
2. Confirmar que o componente é um **Web Service**, não um Static Site.
3. Adicionar `FARM_TENANT_SECRET` como variável **RUN_TIME**, marcada **Encrypt**, com pelo menos 32 caracteres aleatórios.
4. Confirmar as restantes variáveis do App Spec e que `FARM_PUBLIC_URL` resolve para o URL público da app.
5. Após o primeiro deployment saudável, adicionar `farm.gero.pt` como domínio principal e configurar o registo DNS indicado pela DigitalOcean.
6. Confirmar no GeroCore que a aplicação `farm` aponta para `https://farm.gero.pt` e que este origin está autorizado para cookies/CORS e para `returnTo` do login.
7. Validar `https://farm.gero.pt/api/health`, login, retorno a `/app`, troca de organização e logout.

Não é necessária uma base de dados nesta etapa. Não adicionar PostgreSQL à App Platform até existir o primeiro modelo persistente e a respetiva estratégia de migrations/RLS.
