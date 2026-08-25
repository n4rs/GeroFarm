# Auditoria funcional e agronómica — 2026-08-25

Base auditada: `origin/main` em `33b92e1`. Esta matriz precede alterações de implementação e é atualizada apenas quando o fluxo, a persistência e os testes demonstram o requisito.

| Requisito aprovado | Implementação / API / schema | Testes existentes na base | Estado inicial |
| --- | --- | --- | --- |
| Uma organização Core = uma exploração; setup retomável; pessoas sem conta; permissões/read-only/limites do Core; módulos económicos facultativos | `farm_holdings`, migration `0019`, `FarmHoldingsModule`, `farm-context`, `entitlements`, `resources`, `economics` | single-holding, entitlement routes, capacity/read-only, economics routes/migration | cumpre |
| Talhão com código estável de 4 caracteres, KML/KMZ, geometria/área útil e sobreposição | `fields`, `field-geometry`, `/api/farm/fields`, migrations `0002`/`0020`, editor/import local | field geometry/routes/import, foundation integrity | cumpre |
| Permanente/campanha, temporária/ciclo, Arranque, ocupação útil, pousio, datas e rotação informativa | `crop-lifecycle`, `plantations`, `crop_periods`, `field_fallows`, `plantation_uprootings`, `/crop-lifecycle` | schemas e migration; sem prova de datas persistidas/concorrência/coexistência | **parcial** — fecho/arranque aceitam datas anteriores; criação de período não bloqueia concorrência; instalação temporária não cria ciclo; regra permanente vs. temporária não é imposta |
| Apenas operações realizadas; uma operação física multi-destino; anulação auditada, nunca delete; ação global especializada | `operations`, `operation_destinations`, `/api/farm/operations`, `OperationsModule` | multi-destino e projeções especializadas | **ausente** — `status=voided` existe no schema, mas não há contrato, repositório ou rota de anulação |
| Preparação do solo, análises congeladas/aviso, instalação cria Plantação, métodos/densidade, ressementeira/Retancha | `operation_soil_preparations`, `operation_crop_installations`, `operation_cultural_works`, schemas especializados | operations shared/migrations | **parcial** — criação atómica e Retancha cumprem; catálogo extensível/desativável e seleção histórica de análise não têm persistência/fluxo comprovados |
| Pulverização como tanque misto; L/ha; autorizações/intervalos por destino/data; aplicador; warnings auditáveis; FRAC | `spraying`, `operation_sprayings`, projeção de nutrientes no mesmo `operation_id` | spraying shared/server/migration | **parcial** — origem física e snapshots cumprem; aplicador inválido gera apenas warning, contradiz a proibição de submissão; auxiliares não são explicitamente impedidos de coincidir com o aplicador |
| Monitorização multi-achado; amostra e resultado separados; análise válida congelada | `agronomic_monitorings`, `laboratory_samples/results`, monitoring weather | agronomy routes/repository, monitoring weather | **parcial** — separação cumpre; falta seleção/aplicação comprovada da análise válida na data para operações que dela dependem |
| Fertilização multi-produto/destino; dose/total derivados pela última fonte; composição/nutrientes históricos; planos sem operações | `operation_fertilizations`, `fertilization-plans` | operações, planos, balances | cumpre |
| Rega por setores inteiros, conversões, programação semanal, reconciliação/reversão sem duplicação | `irrigation`, migration `0015`, endpoints dedicados | cálculos, timezone, routes, migration | **parcial** — modelo principal cumpre; é necessário provar DST/fim de semana, idempotência concorrente da materialização e efeitos derivados na reversão |
| Colheita conjunta, lote físico/alocações, código e imutabilidade, `0MIX`, totais únicos | `agronomy.createHarvest`, `harvests`, operation transacional | validação de alocações/código, transação, caderno | **parcial** — invariantes principais cumprem; precisa prova de sequência concorrente e origem `0MIX` para talhões inseparáveis |
| Recursos/horas/custos por área efetiva, overrides, preços históricos; caderno/PDF/XLSX/integridade sem economia | `operations`, `economics`, `agronomy`, `field_notebooks` | economics, notebook, repeatable-read, export | **parcial** — custos e caderno cumprem; horas/recursos comuns não guardam alocação por destino e versão emitida pode ser apagada fisicamente (`pdfBase64=null`) |
| Meteorologia apenas Core base-series, derivações locais versionadas e classificadas, histórico/estação/DST/ciclo explícito | `weather-sync/store/routes`, `agronomic-weather-engine`, migration `0018` | contrato Core v2, persistência, FAO-56, DST 25h, perfis, proveniência | cumpre |
| Planos/entitlements Core; Free 30 dias e demo fictícia; expiração 7 dias/read-export; sem offline/email | `entitlements`, Settings/Entitlement UI, Core client | entitlement contracts/routes/UI | cumpre localmente; autoridade e estados reais dependem do Core |
| Catálogo 106; privacidade/auditoria/retenção | catálogo gerado, `privacy`, audit events, migrations | catálogo, privacy, migrations | cumpre |

## Critérios de fecho

- Um estado só passa a `cumpre` com validação do input, invariantes no serviço/transação, constraint/índice quando aplicável e teste de regressão.
- Dependências exclusivas do Gero Core ou infraestrutura ficam assinaladas e não são simuladas localmente.
- Não são feitas alterações ao Gero Core, GeroCampo, produção, migrações remotas ou integrações externas.

## Estado após correções

| Área | Estado final | Prova principal |
| --- | --- | --- |
| Organização, setup, Core/entitlements, talhões, catálogo, privacidade | cumpre localmente | contratos existentes, RLS, gates de capacidade/read-only, 106 culturas e testes de geometria/privacidade |
| Ciclo permanente/temporário, ocupação e datas | cumpre | ciclo temporário criado atomicamente; bloqueios e triggers impedem coexistência incompatível, sobreposição e datas fora do ciclo; anulação da instalação liberta a área sem delete |
| Operação física e anulação | cumpre | rota idempotente de anulação, motivo/ator/data imutáveis, projeções excluem anuladas; inventário é reposto por movimento inverso e custos passam a `reversed` |
| Preparação/instalação/trabalhos culturais | cumpre no domínio/API | catálogo organizacional normalizado, reutilizável, desativável, com identidade imutável e sem delete; preparação seleciona por talhão a análise válida mais recente, congela um snapshot por `fieldId` e avisa apenas nos talhões sem cobertura. A escolha singular antiga só é aceite quando o boletim cobre todos os talhões. Gestão visual do catálogo e seletores explícitos pertencem à Tarefa 3 |
| Pulverização/fitofármacos | cumpre no escopo FRAC | tanque único, snapshots por produto/destino, aplicador ativo/certificado obrigatório e auxiliares distintos; restantes alertas ficam congelados/auditados |
| Monitorização e laboratório | cumpre no registo | achados múltiplos, amostra e resultado separados; triggers validam cronologia/validade. A escolha automática da análise aplicável continua fora das operações que não consomem análises |
| Fertilização e planos | cumpre | valores derivados e composição desconhecida explícita; planos por talhão sem operações planeadas; água/nitratos e fertirrega projetados uma vez |
| Rega | cumpre | setores inteiros, conversões, materialização semanal com lock/idempotência, reconciliação e reversão histórica sem apagar |
| Colheita/lotes | cumpre | cultura validada, origens coerentes, segmento de cultura único, sequência atómica por prefixo, mínimo de dois dígitos e `0MIX` |
| Recursos/custos/caderno | cumpre no domínio/API | trabalhadores, equipamento e contratantes continuam ligados uma vez à operação; horas totais e alocações são persistidas, distribuídas por área efetiva por omissão ou integralmente substituídas por destino, com soma única protegida na base. Formulários completos pertencem à Tarefa 3 |
| Meteorologia | cumpre localmente | apenas contrato Core v2, séries persistidas/versionadas, derivações locais e testes de DST/proveniência/ciclo explícito |
| Planos comerciais | cumpre no consumidor local | o GeroFarm respeita o contrato e os gates; catálogo, expiração e entitlements reais só podem ser validados no Core/infra |

Não permanecem requisitos funcionais locais classificados como `parcial`. A Tarefa 3 pode consumir `GET/POST/PATCH /api/farm/operation-catalog`, `soilAnalysisResultIdsByField` (mantendo `soilAnalysisResultId` apenas para compatibilidade segura), os arrays `soilAnalysisSnapshots`/`soilAnalysisWarnings` e os contratos `workerAssignments`, `equipmentAssignments` e `contractorAssignments` para completar a experiência visual sem alterar estes invariantes.
