# Lote final de intervenções externas

Estado em 2026-08-24:

- Pulverização, commit `4dae1ec`: implementada, validada localmente e enviada para `main`, mas **não validada em produção**. `farm.gero.pt` continuava a servir `index-Cu_xKhGT.js`, não o build esperado `index-D9Ew0xNo.js`.
- Rega/fertirrega, commit `4a70489`: implementada, validada localmente e enviada para `main`, mas **não validada em produção**. Depois do push, health respondeu `200`/`ok`, mas a homepage continuava a servir `index-Cu_xKhGT.js`; o build local final combinado gerou `index-BJaJHDeQ.js` e `IrrigationModule-BShV0Aj9.js`.
- A sessão Core disponível na verificação automática redirecionou `/app/irrigation` para o seletor com `Sem aplicações disponíveis`; falta um contexto QA ativo para validar formulários e consola dentro do GeroFarm publicado.
- A validação de produção depende de o App Platform publicar o commit e aplicar `0015_irrigation.sql` com a ligação de migração autorizada.
- Programação semanal sem qualquer tráfego: ligar o invocador periódico autenticado ao endpoint `schedules/finalize-due`. Sem ele, o fecho ocorre automaticamente na primeira consulta posterior ao fim da semana.
- Dependências futuras não bloqueantes: contratos do GeroCore para catálogo/stock central, integração GeroGrid apenas para horários, credenciais e acessos QA.

Não declarar estes pontos validados até existirem evidências separadas de migração, asset atual, health, DOM/UI e consola.

## Monitorização, colheita e caderno de campo

- A meteorologia automática de uma observação continua dependente do contrato meteorológico do GeroCore. O GeroFarm preserva `automaticWeather`, a correção do utilizador e a justificação separadamente, mas a chamada real ao Core deve ser ligada apenas na fase final de dependências GeroCore.
- A inspeção visual local desta fase usou a rota de desenvolvimento sem organização persistida. A validação publicada dos formulários requer uma organização QA com contexto GeroFarm; fica reservada para a tarefa exclusiva de intervenções e não bloqueia a implementação autónoma.
- Não foi observado nem aguardado qualquer deploy nesta fase, por regra explícita. Health, assets do DigitalOcean, migração publicada e UI de produção permanecem sem validação até uma intervenção separada.

## Inventário e custos opcionais

- Aplicar a migração aditiva `0017_optional_inventory_costs.sql` na base GeroFarm através da ligação de migração autorizada. Não foi aplicada localmente nem em produção nesta fase.
- Confirmar no GeroCore os direitos comerciais separados para ativar/ocultar Inventário, Custos e acesso a receita/margem. O domínio local está funcional, mas o GeroFarm não deve inventar esses entitlements nem duplicar perfis/roles do Core.
- Ligar, quando existir contrato aprovado, o catálogo/stock partilhado do GeroCore. Até lá, o catálogo GeroFarm é local à organização e opcional; consumos sem existência ficam `pending` e podem ser regularizados posteriormente.
- Validar em organização QA os fluxos visíveis de produto, entrada, consumo, regularização e custo ligado a operação conjunta. A validação publicada deve confirmar que uma operação produz um único consumo/custo e apenas imputações por destino.
- Esta fase não observou deploys. O commit, a migração publicada, os assets, a UI e a consola de produção ficam deliberadamente para a tarefa externa exclusiva.

## Dependências GeroCore que encerram a sequência autónoma

- Primeiro acesso/onboarding, organização única, memberships, roles, acessos temporários, permissões económicas, planos, subscrições e limites continuam fontes de verdade GeroCore. A rota `/app/settings` apenas projeta os contratos publicados de conta, organização selecionada, acesso e entitlements.
- A rota de Meteorologia consome a estação virtual e o contrato meteorológico Core, incluindo proveniência por período e indicadores derivados. Desde `364c94c`, o GeroFarm usa as acumulações canónicas do Core e não contacta nem recalcula dados do fornecedor.
- O idioma é persistido centralmente, nas mesmas 28 línguas da homepage, através de `PATCH /api/v1/me/profile`; `localStorage`, URL, `lang` e RTL são apenas estado de apresentação sincronizado, não uma segunda preferência de conta.
- **Contrato ainda inexistente para unidades e regras organizacionais:** os contratos Core publicados não expõem uma preferência de sistema de unidades nem regras regionais/agronómicas da organização. Para as tornar configuráveis será necessário um contrato Core explícito, com `GET`/`PATCH` autenticados por organização, esquema e enumerações versionadas, permissões de leitura/escrita e valores efetivos com proveniência. Até esse contrato existir, Configurações não mostra controlos fictícios nem grava estas escolhas localmente.
- GeroGrid, pagamentos, credenciais, jobs externos e qualquer migração/deploy/QA publicado permanecem fora do trabalho autónomo concluído.

## Meteorologia agronómica central

- O consumidor GeroFarm foi revisto contra o contrato Core `78b8b53`, `/openapi/weather-v2.json` e os tipos provider-independent de `@gero/shared`; não existe segredo, SDK, URL autenticado ou formato do fornecedor no GeroFarm.
- As acumulações usam exclusivamente `GET .../weather/subjects/{subjectType}/{subjectId}/agronomic-accumulation`: cobertura, proveniência, perfis, avisos e indicadores chegam calculados e versionados pelo Core; o GeroFarm não agrega nem recalcula dados meteorológicos.
- A utilização publicada depende de o Gero Core disponibilizar `78b8b53` e de a migração aditiva meteorológica Core ser aplicada pelo processo controlado próprio. Esta fase não verificou nem tentou essas intervenções.
- A validação de produção fica reservada para uma organização QA autorizada com níveis Start/Grow/Professional/Custom, incluindo limite efetivo de estações, continuidade da proveniência após mudança de estação, read-only e janelas de 7/30/90 dias.
- Não observar deploy, assets, painéis, credenciais, migrações ou UI publicada como parte da implementação autónoma do consumidor.
