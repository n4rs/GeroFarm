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

- A meteorologia automática da monitorização está ligada server-side ao relatório Weather v2 do subject `plantation`, validado contra os talhões e o período cultural local. O cliente não pode enviar `automaticWeather`; o snapshot imutável conserva apenas métricas provider-independent, proveniência da estação, instante, cache e classificação temporal/origem do valor. Indisponibilidade de plantação, estação, histórico do plano, Core ou dados nunca bloqueia a observação e nunca cria valores.
- Nesta fronteira, o GeroCore é o gateway técnico para a API meteorológica e entrega dados normalizados; o GeroFarm é dono da persistência agronómica, das associações a plantações/campanhas/ciclos e dos cálculos próprios do produto. O snapshot de uma observação é deliberadamente uma captura sem cálculo local.
- A fase autónoma sequencial seguinte é obrigatória e não depende de intervenção externa: mover para o GeroFarm a persistência meteorológica histórica por plantação e todos os cálculos derivados dos dados meteorológicos base hoje consumidos pelo dashboard através das acumulações Core, incluindo indicadores agronómicos específicos da aplicação. O GeroCore deve ficar apenas com acesso ao fornecedor, cache/proveniência técnica e normalização dos dados meteorológicos base. Esta fase de Monitorização não antecipa essa migração para manter o commit isolado.
- A inspeção visual local desta fase usou a rota de desenvolvimento sem organização persistida. A validação publicada dos formulários requer uma organização QA com contexto GeroFarm; fica reservada para a tarefa exclusiva de intervenções e não bloqueia a implementação autónoma.
- Não foi observado nem aguardado qualquer deploy nesta fase, por regra explícita. Health, assets do DigitalOcean, migração publicada e UI de produção permanecem sem validação até uma intervenção separada.

## Inventário e custos opcionais

- Aplicar a migração aditiva `0017_optional_inventory_costs.sql` na base GeroFarm através da ligação de migração autorizada. Não foi aplicada localmente nem em produção nesta fase.
- Confirmar no GeroCore os direitos comerciais separados para ativar/ocultar Inventário, Custos e acesso a receita/margem. O domínio local está funcional, mas o GeroFarm não deve inventar esses entitlements nem duplicar perfis/roles do Core.
- Ligar, quando existir contrato aprovado, o catálogo/stock partilhado do GeroCore. Até lá, o catálogo GeroFarm é local à organização e opcional; consumos sem existência ficam `pending` e podem ser regularizados posteriormente.
- Validar em organização QA os fluxos visíveis de produto, entrada, consumo, regularização e custo ligado a operação conjunta. A validação publicada deve confirmar que uma operação produz um único consumo/custo e apenas imputações por destino.
- Esta fase não observou deploys. O commit, a migração publicada, os assets, a UI e a consola de produção ficam deliberadamente para a tarefa externa exclusiva.

## Dependências GeroCore e sequência autónoma restante

- Primeiro acesso/onboarding, organização única, memberships, roles, acessos temporários, permissões económicas, planos, subscrições e limites continuam fontes de verdade GeroCore. A rota `/app/settings` apenas projeta os contratos publicados de conta, organização selecionada, acesso e entitlements.
- A rota de Meteorologia consome a estação virtual e o contrato meteorológico Core, incluindo proveniência por período e indicadores derivados. Desde `364c94c`, o GeroFarm usa as acumulações canónicas do Core e não contacta nem recalcula dados do fornecedor.
- Esse consumo de acumulações descreve o estado atual, não a arquitetura final aprovada. A próxima fase autónoma deve trazer histórico e todos os cálculos derivados dos dados base — incluindo ET₀, radiação integrada, PAR/DLI, graus-dia, frio e molhamento foliar — para o GeroFarm, mantendo no Core somente o gateway, cache/proveniência técnica e normalização meteorológica.
- O idioma é persistido centralmente, nas mesmas 28 línguas da homepage, através de `PATCH /api/v1/me/profile`; `localStorage`, URL, `lang` e RTL são apenas estado de apresentação sincronizado, não uma segunda preferência de conta.
- **Contrato ainda inexistente para unidades e regras organizacionais:** os contratos Core publicados não expõem uma preferência de sistema de unidades nem regras regionais/agronómicas da organização. Para as tornar configuráveis será necessário um contrato Core explícito, com `GET`/`PATCH` autenticados por organização, esquema e enumerações versionadas, permissões de leitura/escrita e valores efetivos com proveniência. Até esse contrato existir, Configurações não mostra controlos fictícios nem grava estas escolhas localmente.
- GeroGrid, pagamentos, credenciais, jobs externos e qualquer migração/deploy/QA publicado permanecem fora do trabalho autónomo concluído.

## Meteorologia agronómica central

- O consumidor GeroFarm foi revisto contra o contrato Core `78b8b53`, `/openapi/weather-v2.json` e os tipos provider-independent de `@gero/shared`; não existe segredo, SDK, URL autenticado ou formato do fornecedor no GeroFarm.
- As acumulações usam exclusivamente `GET .../weather/subjects/{subjectType}/{subjectId}/agronomic-accumulation`: cobertura, proveniência, perfis, avisos e indicadores chegam calculados e versionados pelo Core; o GeroFarm não agrega nem recalcula dados meteorológicos.
- A utilização publicada depende de o Gero Core disponibilizar `78b8b53` e de a migração aditiva meteorológica Core ser aplicada pelo processo controlado próprio. Esta fase não verificou nem tentou essas intervenções.
- A validação de produção fica reservada para uma organização QA autorizada com níveis Start/Grow/Professional/Custom, incluindo limite efetivo de estações, continuidade da proveniência após mudança de estação, read-only e janelas de 7/30/90 dias.
- Não observar deploy, assets, painéis, credenciais, migrações ou UI publicada como parte da implementação autónoma do consumidor.
