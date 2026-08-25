# Validação final independente — GeroFarm

Data: 2026-08-25

Revisor: Tarefa 5 (revisão independente e adversarial)

Branch local: `codex/final-validation-2026-08-25`

Base confirmada: `origin/main` = `3cf8ad8022f12f316e88e5207dc59c4fa4cb7988`

Commit inicial de correções: `fc66816` (`fix: close final validation gaps`)

Correção arquitetural read-only: incluída no commit corretivo separado que contém esta atualização.

## Âmbito e método

Esta revisão partiu diretamente do `origin/main` indicado. Os relatórios das Tarefas 1–4 em `docs/audits` e `docs/i18n-audit-2026-08-25.md` foram tratados como pistas, não como prova. A confirmação foi feita no código, migrações, testes e num build local servido por `script/frontend-smoke-server.ts` com dados sintéticos.

Não foram consultados nem alterados o Gero Core ou o GeroCampo. Não se usaram dados ou bases de dados de produção, não se contactaram APIs reais do Core e não houve deploy, push ou merge.

## Resultado executivo

Foram confirmados e corrigidos três grupos de defeitos:

1. **Alto — separação incompleta entre leitura e escrita meteorológica.** Os endpoints originais podiam sincronizar/persistir durante um `GET`. A primeira correção moveu a sincronização para `POST`, mas manteve por engano `context(req)` (`farm.view`, `write=false`), permitindo persistência a utilizadores read-only. A correção final separa os contratos: `POST` usa `context(req, true)`, same-origin e idempotência; `GET` lê exclusivamente séries já persistidas, calcula a resposta apenas em memória e nunca chama Core, sincronização, `persistSeries` ou `saveResult`. Sem dados persistidos responde explicitamente `{ data: null, state: "not_persisted" }`.
2. **Médio — formatação visível desligada da língua escolhida.** Havia datas ISO cruas, datas no locale implícito do browser e números/moeda sem o locale selecionado em ciclos, operações, rega, planos, recursos, inventário/custos, privacidade e meteorologia. Foi introduzida formatação explícita e segura para datas sem desvio de dia, propagado o locale e adicionada regressão contra chamadas implícitas.
3. **Baixo — numeração repetida na navegação.** Rega, Planos e Meteorologia mostravam todos `06`, deslocando os módulos seguintes. A sequência é agora única de `01` a `15`, com teste e confirmação visual.

Depois das correções, não ficou qualquer defeito residual confirmado dentro do âmbito e dos meios locais disponíveis. Os limites de validação encontram-se no fim deste documento.

## Matriz requisito → evidência → estado

| Requisito | Evidência independente | Estado |
|---|---|---|
| Base e isolamento de âmbito | `HEAD` pré-alterações e `origin/main` iguais ao SHA requerido; commits posteriores descendem dessa base e o diff permanece limitado ao GeroFarm | Conforme |
| Autenticação, autorização e entitlements | `server/core-client.test.ts`, `server/entitlement-gates.test.ts`, gates de permissões/write/export em `server/farm-routes.ts`; contratos Core validados em runtime | Conforme localmente |
| Tenant isolation, RLS e grants | Testes das migrações, repositórios com contexto de organização, RLS e grants no conjunto `migrations/0000`–`0022` | Conforme estaticamente |
| CSRF/origin, cookies, redirects e headers | `server/origin.test.ts`, `server/core-client.test.ts`, `server/index.test.ts`; `POST` meteorológico usa same-origin e `context(req, true)`; cookies encaminhados por allowlist e redirects Core fail-closed | Conforme |
| Input/output Core, erros e segredos | Zod/runtime validation nos consumidores Core, testes de respostas malformadas e estados 422/429; varreduras por casts/confianças, URLs credenciadas e padrões de segredo | Conforme; nenhum segredo encontrado |
| Idempotência, concorrência e transações | `shared/idempotency.ts`, middleware/testes de replay/conflito/in-progress; advisory locks de quota; transações de operação/colheita/caderno | Conforme |
| Ausência de mutações em GET | Regressões executam condições e série agronómica por `GET` com e sem dados persistidos e provam zero chamadas Core/`persistSeries`/`saveResult`; cálculo agronómico GET é apenas em memória | Corrigido e conforme |
| Cadeia PostgreSQL de 23 migrações | `npm.cmd run db:check`: 23 migrações; testes de constraints, FKs, RLS, grants, invariantes e migração destrutiva pinned | Validado estaticamente; execução real limitada pelo ambiente |
| Frontend API/persistência e estados | O consumidor escolhe `POST` apenas com `writeAllowed`; em read-only usa `GET` puro e aceita `data: null`; teste de contrato cobre condições e série agronómica; fixture usa apenas endpoints locais e dados sintéticos | Conforme localmente |
| `exportAllowed` e read-only | Testes de exportação de caderno e `Start trial`; downloads exigem export access, mutações agravam capacidade apenas com write access | Conforme |
| Responsividade, RTL e acessibilidade | Smoke final 1280×800 e 390×844; árabe com `lang=ar`, `dir=rtl`, body RTL, sem overflow; diálogo 366 px dentro de viewport 390 px; foco inicial no diálogo e retorno ao botão com `aria-label`; testes do diálogo partilhado | Conforme no smoke e testes |
| Uma operação física sem dupla contagem | Testes `shared/operations`, `operation-resources`, `cost-allocation`, migrações e projeções; recursos, nutrientes, água, custos e caderno referenciam a operação única | Conforme |
| Exploração, talhões, culturas e ciclos | Testes de holdings, geometria/área, lifecycle, rotações, pousio, catálogo de 106 culturas e variedades | Conforme |
| Catálogos e operações especializadas | Testes de catálogo tenant-scoped/deativável e formulários de preparação do solo, instalação, trabalhos culturais, fertilização, pulverização e rega | Conforme |
| Pulverização e aplicador | Validade temporal do aplicador, certificado ativo, mistura com vários produtos numa operação e classificação legal testadas | Conforme |
| Fertilização e planos | Composição conhecida/desconhecida, matéria seca, nutrientes, incorporação, versões/snapshots e ativação explícita testados | Conforme |
| Rega e fertirrega | Relações mm↔m³/ha, hidráulica, contador, setores, planos semanais, nitratos e endpoint físico dedicado testados | Conforme |
| Monitorização agronómica | Correções justificadas, proibição de clima automático forjado e estados Core indisponível/sem estação testados | Conforme |
| Colheita e lotes | Alocação por área, segmentos de lote, totais e transação operação-registo testados | Conforme |
| Recursos, inventário e custos | Recursos partilhados sem duplicação; projeções tenant-scoped, imutáveis e separadas; permissões e regularização testadas | Conforme |
| Caderno PDF/XLSX | PDF estrutural, XLSX válido, timezone/DST, exclusão de dados económicos e snapshot repeatable-read testados | Conforme localmente |
| Meteorologia | `POST` de sync/cálculo exige `farm.manage` e escrita; regressão prova `403 ACCESS_READ_ONLY` e zero writes/Core para `farm.view`; `GET` consulta séries completas ou parciais já persistidas e calcula sem guardar resultados | Corrigido e conforme |
| Homepage, legal, cookies e SEO | Testes de 28 homepages indexáveis, metadata/hreflang/RTL, sitemap/robots, rotas legais e consentimento versionado | Conforme estruturalmente |
| 28 línguas | Revisores automáticos de homepage, app, culturas, lifecycle, recursos, operações, planos, rega, weather e settings; paridade/placeholders/termos críticos; smoke árabe | Conforme estruturalmente; sem alegar revisão humana nativa |
| Hardcodes, TODO/FIXME, casts e testes frágeis | `rg` direcionado em server/client/shared/script/migrations; revisão dos casts meteorológicos restantes (dados primeiro validados e sanitizados); testes novos validam comportamento, não só snapshots | Sem achado residual confirmado |
| Documentação sem sobreafirmação | Relatórios anteriores confrontados com código/testes; este relatório distingue prova estática, testes, smoke e limites ambientais | Conforme |

## Comandos e resultados finais

| Comando | Resultado |
|---|---|
| `npm.cmd ci` | 181 pacotes instalados a partir do lockfile |
| `npm.cmd run check` | Passou (`tsc --noEmit`) |
| `npm.cmd test` | Passou: **255/255**, 0 falhas, 0 skips |
| `npm.cmd run build` | Passou; apenas aviso não bloqueante de chunks acima de 500 kB |
| `npm.cmd run db:check` | Passou: **23** migrações PostgreSQL validadas |
| `git diff --check` e `git diff --cached --check` | Passaram |
| `npm.cmd audit --omit=dev --offline` | Passou: `found 0 vulnerabilities` para a informação existente na cache/lockfile |
| `npm.cmd audit --omit=dev` | Não executável online: acesso ao registry indisponível; pedido de egress foi recusado pela política por transmitir a árvore privada de dependências. O resultado offline não prova o estado atual do registry |
| `npm.cmd run i18n:review-home` | Passou: 28 locales |
| `npm.cmd run i18n:review-app` | Passou: 28 locales × 17 catálogos |
| `npm.cmd run i18n:review-crops` / `i18n:review-lifecycle` / `i18n:review-resources` | Passaram |
| `npm.cmd run i18n:review-operations` | Passou, incluindo 53 termos de pulverização × 28 locales |
| `npm.cmd run i18n:review-plans` | Passou: 61 strings × 28 locales |
| `npm.cmd run i18n:review-irrigation` | Passou: 43 chaves × 28 locales |
| `npm.cmd run i18n:review-weather` | Passou: 82 chaves × 28 locales |
| `npm.cmd run i18n:review-settings` | Passou: 38 chaves × 28 locales |

## Smokes locais do build de produção

O build final foi servido em loopback com `script/frontend-smoke-server.ts`; a fixture contém apenas dados inventados e não encaminha pedidos para o Core.

- Desktop 1280×800: aplicação autenticada, 15 módulos com numeração `01`–`15`, sem overflow horizontal.
- Móvel RTL 390×844 em árabe: `html[lang=ar][dir=rtl]`, direção computada RTL, sem overflow; datas apresentadas no locale selecionado e sem ISO cru.
- Diálogo global de operação: caixa entre 12 e 378 px (366 px) dentro do viewport, nome acessível, foco inicial interno, Escape fecha e devolve foco ao botão móvel `aria-label="تسجيل عملية"`.
- O smoke mediu botões especializados com 42 px de altura. Isto excede o mínimo de 24 px do critério WCAG 2.2 Target Size (Minimum), mas não é descrito como 44 px.

## Limites e riscos não sobreafirmados

- O ambiente tinha cliente Docker mas não daemon PostgreSQL disponível, nem `psql`; por isso a cadeia das 23 migrações não foi aplicada a uma instância descartável real. A validação aqui é estática e por testes de SQL/invariantes, não uma prova de execução PostgreSQL end-to-end.
- A auditoria online do registry não foi autorizada. `npm audit --offline` só cobre advisories já disponíveis localmente.
- Os 28 catálogos passaram validações de paridade, placeholders, fallback, termos críticos e RTL, mas não houve revisão humana nativa integral das 28 línguas. Não se alega certificação linguística ou agronómica externa.
- Não houve teste contra Gero Core real, produção, dados reais, deploy ou migração real, por requisito de isolamento.
- O build mantém avisos de tamanho para alguns chunks; não foi observado defeito funcional no smoke, mas a otimização de carregamento continua possível fora deste âmbito.

## Conclusão

O resultado consolidado das Tarefas 1–4 ficou localmente consistente depois das correções acima: bateria automatizada integral verde, build e validação estática das migrações verdes, smoke desktop/RTL verde e diff revisto. A conclusão é deliberadamente limitada ao código GeroFarm e aos meios locais descritos; não equivale a validação de produção, do Gero Core, de PostgreSQL real ou a certificação humana das 28 traduções.
