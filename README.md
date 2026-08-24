# GeroFarm

Fundação técnica do GeroFarm, uma aplicação nova que corre em paralelo com o GeroCampo. Esta etapa contém servidor, shell web, integração central de identidade e acesso e a fundação isolada de persistência; ainda não contém a plataforma agrícola.

## Incluído nesta etapa

- Node.js 22, TypeScript, Express, React e Vite.
- Health check em `GET /api/health`.
- Login e registo redirecionados para `account.gero.pt`.
- Validação server-side da cookie HttpOnly `gero_session` no GeroCore.
- Contexto e troca segura de organização através de cookie local assinada.
- Autorização fail-closed para a aplicação Core com código `farm`.
- Planos e entitlements recebidos do GeroCore, sem os simular no frontend.
- Logout e preferência de idioma encaminhados com a proteção CSRF do GeroCore.
- Shell pública e área autenticada em `/app`.
- Área autenticada baseada no mockup, com navegação responsiva, RTL e catálogo inicial nas mesmas 28 línguas da homepage.
- Portão linguístico próprio para paridade de chaves, placeholders, frases por idioma e regras plurais com `Intl.PluralRules`.
- PostgreSQL/Drizzle com credenciais separadas de runtime e migrations.
- Schema `farm`, projeção local mínima da organização e Row-Level Security forçada.
- Explorações agrícolas locais com código estável, fuso horário, estado, isolamento por organização e auditoria imutável.
- Talhões com código de quatro caracteres, mapa editável, importação KML/KMZ processada localmente, áreas cartográfica/útil e bloqueio de geometrias inválidas ou sobrepostas.
- Inicializador seguro para a base lógica `gero_farm`, sem acesso à base do GeroCore.
- Job `db-migrate` executado antes de cada deployment.
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
npm.cmd run db:check
```

## Configuração

As variáveis estão documentadas em `.env.example`. `FARM_TENANT_SECRET` assina apenas a seleção local da organização; deve ser aleatória, ter pelo menos 32 caracteres e ser guardada como variável encriptada na DigitalOcean. Nunca deve ser reutilizada como segredo do GeroCore.

O GeroFarm não acede à base lógica do GeroCore. Partilha apenas o cluster PostgreSQL gerido, mantendo a base `gero_farm`, schema `farm` e utilizadores `gero_farm_app`/`gero_farm_migrator` independentes.

- `DATABASE_URL`: ligação do utilizador de runtime; nunca é usada para migrations.
- `DATABASE_MIGRATION_URL`: ligação exclusiva do migrador; o servidor web não a recebe.
- `DATABASE_CA_CERT`: CA do cluster gerido, usada com validação TLS estrita.
- `npm run db:check`: valida o journal e os ficheiros SQL revistos das migrations.
- `npm run db:migrate:prod`: aplica migrations já compiladas no job pré-deploy.
- `npm run db:bootstrap-production -- --ca-file <certificate.crt>`: recria apenas a base vazia `gero_farm`, após confirmação explícita, e aplica a fronteira migrador/runtime.

Cada operação futura de produto deve decorrer dentro de `withOrganizationTransaction`, que define `app.organization_id` apenas durante a transação. A política RLS falha fechada quando esse contexto não existe.

## DigitalOcean App Platform

O ficheiro `.do/app.yaml` descreve o Web Service e o job pré-deploy `db-migrate`, ambos ligados a `n4rs/GeroFarm`, branch `main`. O serviço mantém build `npm ci && npm run build`, arranque `npm start`, porta `8080` e health check `/api/health`. O job usa `npm run db:migrate:prod`.

Antes de disponibilizar o login em produção:

1. Criar a app `gero-farm` na região europeia pretendida e selecionar este repositório/branch.
2. Confirmar que o componente é um **Web Service**, não um Static Site.
3. Adicionar `FARM_TENANT_SECRET` como variável **RUN_TIME**, marcada **Encrypt**, com pelo menos 32 caracteres aleatórios.
4. Confirmar as restantes variáveis do App Spec e que `FARM_PUBLIC_URL` resolve para o URL público da app.
5. Após o primeiro deployment saudável, adicionar `farm.gero.pt` como domínio principal e configurar o registo DNS indicado pela DigitalOcean.
6. Confirmar no GeroCore que a aplicação `farm` aponta para `https://farm.gero.pt` e que este origin está autorizado para cookies/CORS e para `returnTo` do login.
7. Validar `https://farm.gero.pt/api/health`, login, retorno a `/app`, troca de organização e logout.

A preparação da base de produção está descrita em [`docs/deployment/database.md`](docs/deployment/database.md). Não criar uma Dev Database nem um cluster novo: deve ser anexado o cluster gerido existente, mantendo uma base lógica e credenciais exclusivas do GeroFarm.
