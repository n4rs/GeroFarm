# Base de dados de produção do GeroFarm

## Arquitetura

O GeroFarm segue a fronteira usada pelo GeroGrid:

- cluster DigitalOcean gerido existente: `gero-core-db`;
- base lógica exclusiva: `gero_farm`;
- schema de produto: `farm`;
- owner/migrator: `gero_farm_migrator`;
- runtime com privilégios mínimos: `gero_farm_app`;
- migrations num job `PRE_DEPLOY`, antes da entrada do novo Web Service;
- certificado CA validado estritamente por ambos os componentes.

Partilhar o cluster não significa partilhar dados. Nenhuma ligação do GeroFarm deve apontar para `gero_core`, `gero_grid` ou `gero_hydro`.

## Sequência segura

1. No cluster gerido, criar os utilizadores `gero_farm_migrator` e `gero_farm_app` com palavras-passe distintas.
2. Na mesma página **Users & Databases**, criar a base lógica vazia `gero_farm`.
3. Descarregar o certificado CA do cluster para uma localização temporária fora do repositório.
4. Copiar uma ligação administrativa para `defaultdb` como `doadmin` e uma ligação do migrador para `gero_farm`.
5. Num terminal interativo local, executar:

   ```powershell
   npm.cmd run db:bootstrap-production -- --ca-file "C:\caminho\ca-certificate.crt"
   ```

6. Introduzir as duas ligações apenas nos prompts ocultos. O inicializador valida cluster, porta, base e utilizadores antes de pedir `RESET gero_farm`.
7. A confirmação recria exclusivamente a base vazia `gero_farm` com `gero_farm_migrator` como proprietário; as restantes bases do cluster nunca são referenciadas pelo caminho destrutivo.
8. Depois do bootstrap, construir as ligações finais de runtime e migração para `gero_farm` e adicioná-las apenas aos componentes corretos da App Platform.

Nunca colocar ligações em argumentos, scripts, ficheiros `.env`, screenshots, mensagens ou histórico da shell.

## Variáveis na App Platform

### Web Service `gerofarm`

| Chave | Scope | Encrypt | Valor |
| --- | --- | --- | --- |
| `DATABASE_URL` | Run Time | Sim | ligação de `gero_farm_app` à base `gero_farm` |
| `DATABASE_CA_CERT` | Run Time | Sim | conteúdo PEM do certificado CA |

O Web Service não recebe `DATABASE_MIGRATION_URL`.

### Job `db-migrate`

| Chave | Scope | Encrypt | Valor |
| --- | --- | --- | --- |
| `DATABASE_MIGRATION_URL` | Run Time | Sim | ligação de `gero_farm_migrator` à base `gero_farm` |
| `DATABASE_CA_CERT` | Run Time | Sim | conteúdo PEM do certificado CA |

O job não recebe `DATABASE_URL`.

Configuração do job:

- nome: `db-migrate`;
- tipo/trigger: **Before every deploy**;
- source: `n4rs/GeroFarm`, branch `main`, diretório `/`;
- tamanho: 512 MB, 1 Shared vCPU;
- build command: `npm ci && npm run build`;
- run command: `npm run db:migrate:prod`.

## Verificação

Um deployment só deve ser considerado válido quando:

1. o job `db-migrate` termina com sucesso;
2. o Web Service fica Healthy;
3. `https://farm.gero.pt/api/health` responde `200`;
4. o utilizador de runtime consegue usar `farm.organizations`, mas não consegue criar schemas/tabelas nem ler `drizzle.__drizzle_migrations`;
5. uma consulta sem `app.organization_id` não devolve linhas protegidas por RLS.
