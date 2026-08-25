# Auditoria funcional do frontend — 2026-08-25

Base auditada: `origin/main` em `047fb63`. Âmbito: GeroFarm local, sem Gero Core, GeroCampo, produção ou serviços externos.

## Matriz resumida

| Fluxo | Entrada UI | API e resultado persistido | Estados e proteção | Evidência |
|---|---|---|---|---|
| Homepage, autenticação e retoma | `/`, handoff, seletor de organização e `/app` | sessão, organizações e preferência de locale | loading/error, retorno ao destino e organização sem exploração encaminhada para onboarding | testes existentes de auth/home/workspace; build SSR |
| Workspace e navegação | lateral, topo e ação móvel central | rotas locais; entitlements da sessão | mutações ocultas/desativadas em read-only; ação central não tapa conteúdo | smoke 390×844, desktop e RTL |
| Exploração, talhões e geometria | `/app/farm`, KML/KMZ, mapa e ação por talhão | `GET/POST/PATCH /api/farm/holdings`, `/fields` | loading/empty/error/success; validação de geometria/overlap; criação bloqueada sem escrita e inativação continua disponível | testes de import/geometria e TypeScript |
| Culturas, variedades e ciclo | `/app/crops` | catálogo, variedades, plantações, campanhas/ciclos, pousio | loading/empty/error; prevenção de double-submit nos diálogos; variedade nova bloqueada em read-only; encerramentos continuam consultáveis | suite de contratos/lifecycle |
| Registar Operação | ação global, botão móvel e ação contextual do talhão | `GET/POST /api/farm/operations` e projeções relacionadas | picker exclusivamente especializado; conserva `fieldId`/`plantationId`; loading/empty/error/success, stale guard e idempotência do servidor | `operation-flow.test.ts` + smoke contextual |
| Catálogo de operações | gestão visual no módulo de operações | `GET/POST/PATCH /api/farm/operation-catalog` | listas ativa/inativa; criar, desativar e reativar sem delete; opções inativas excluídas dos formulários; double-submit bloqueado | regressão de fonte + smoke do diálogo |
| Preparação do solo | formulário especializado | operações + `GET /api/farm/agronomy` | seleção explícita `soilAnalysisResultIdsByField`; auto-seleção visível; `missing_valid_analysis` individual e não bloqueante; snapshot histórico no detalhe | regressão de contrato + smoke |
| Recursos por operação | secção trabalhadores/equipamentos/contratantes | `workerAssignments`, `equipmentAssignments`, `contractorAssignments` | horas totais, distribuição proporcional à área, override integral por destino, soma única e validação antes do POST | regressão de payload/UI |
| Pulverização e aplicações | formulário especializado | operação de pulverização/aplicação | aplicador ativo com certificado válido obrigatório quando há fitofármaco; auxiliares mantidos distintos; warnings legais permanecem auditáveis | teste de aplicador + contratos existentes |
| Fertilização e planos | especialista e `/app/plans` | operações e planos/ativação | planos com loading/error/empty; criar/ativar bloqueado em read-only; totais especialistas excluem anuladas | TypeScript + testes de planos/operações |
| Rega e fertirrega | `/app/irrigation` | setores, contadores, análises, registos e reversão dedicada | loading/error explícito; mutações por permissão; confirmação de reversão; não usa anulação genérica | testes de rega + contrato de rotas |
| Anulação e auditoria | ação numa operação realizada | `POST /api/farm/operations/:id/void` | confirmação, motivo obrigatório, ator/data/motivo no histórico; anuladas não entram nos totais realizados; rega permanece separada | regressão de UI/contrato |
| Monitorização e laboratório | `/app/monitoring` | agronomia, monitorizações e amostras | loading e proteção stale; associação a talhão/cultura e snapshot meteorológico | suite agronómica |
| Colheitas e lotes | `/app/harvests` | colheitas, origens, categorias, destinos e lotes | validação de cultura/origem/peso; totais físicos projetados uma vez | testes agronómicos e de contratos |
| Inventário e custos | `/app/inventory`, `/app/costs` | economia, produtos, receções, consumos e custos | loading/empty/error/success, retry, stale guard e mutações por feature/permissão; custos não são incluídos no Caderno | check + testes de entitlement/economia |
| Caderno atual, PDF e XLSX | `/app/notebook` | current, emissão fechada, PDF e XLSX | versão emitida imutável; XLSX analítico; downloads usam `exportAllowed` sem exigir escrita; delete de versão é libertação permitida | novo teste de entitlement + testes notebook |
| Meteorologia | `/app/weather` | estações, observações e projeções | loading/empty/error, proveniência e estimativas; mutações respeitam `writeAllowed` | suite weather existente |
| Recursos e certificados | `/app/resources` | recursos, trabalhadores, certificados, equipamento e contratantes | loading/empty/error; criação desativada sem `farm.manage`; validade do certificado visível | check + regressão do aplicador |
| Privacidade e configurações | `/app/privacy`, `/app/settings`, centro de acesso | pedidos/exportação, locale e entitlements | estados de carregamento/erro, feedback e flags efetivas de escrita/exportação | testes de privacy/entitlements |

## Achados corrigidos

- **Crítico:** a ação contextual era consumida enquanto os dados ainda carregavam e reabria o formulário sem talhão/plantação. O formulário só é criado depois do carregamento e conserva ambos os identificadores.
- **Alto:** a ação global oferecia categorias genéricas, incluindo rega, em vez de encaminhar exclusivamente para o especialista. O seletor contém apenas os seis fluxos especializados suportados.
- **Alto:** não existia gestão frontend completa do catálogo custom. Foi implementado o ciclo criar/desativar/reativar, sem delete, com filtragem das inativas.
- **Alto:** recursos eram apenas identificadores, sem repartição verificável. Foram adicionadas horas totais, distribuição por área, overrides integrais e verificação das somas.
- **Alto:** anulação não estava exposta no frontend e totais especialistas podiam contar anuladas. Foi acrescentada auditoria completa e filtragem por `performed`.
- **Alto:** PDF/XLSX eram classificados como escrita e ficavam bloqueados em read-only. Downloads são agora autorização de exportação; emissão continua a ser mutação.
- **Médio:** preparação do solo não mostrava a proveniência das análises nem permitia escolha por talhão. A seleção e o snapshot passam a ser explícitos.
- **Médio:** o modal especializado excedia a largura útil em mobile. Foi limitado a `100vw - 24px`, com grelhas colapsadas, scroll vertical interno e targets mínimos.
- **Médio:** economia e carregamento inicial de rega não tinham os quatro estados completos nem proteção stale/cancelamento. Foram acrescentados.
- **Médio:** ações principais de exploração, variedades, planos, recursos, inventário e custos não refletiam read-only/permissões. Passam a ser semanticamente desativadas ou não renderizadas quando proibidas.

## Limitações deliberadas

- A revisão linguística humana das 28 línguas fica fora deste trabalho; foram preservadas as chaves canónicas e validada apenas a estrutura/RTL.
- Não houve acesso a produção, Gero Core ou APIs externas. O smoke visual usa exclusivamente uma fixture local controlada.
- A emissão real de binários PDF/XLSX com armazenamento externo não foi exercitada; os contratos, autorização e caminhos de download foram testados localmente.
