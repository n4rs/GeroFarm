# Rega, setores, contadores e fertirrega

## Princípio de origem única

Cada rega realizada tem um `irrigation_records.id` e exatamente um `operation_id`. Esse registo físico é a origem das projeções em Operações, Fertilização realizada, comparação dos planos e Caderno de campo. A fertirrega anexa produtos ao mesmo `operation_id`; não cria uma segunda operação, não repete recursos e não gera totais paralelos.

Uma reversão conserva `irrigation_records`, auditoria, valores programados, leituras e snapshots, marca a operação física como anulada e retira os efeitos derivados dos totais realizados. Nunca se apagam leituras nem regas realizadas.

## Invariantes do domínio

- Um setor contém apenas talhões inteiros. O índice único de `irrigation_sector_fields` impede que um talhão pertença simultaneamente a dois setores.
- Uma rega pode selecionar vários setores e excluir talhões sem mudar a composição permanente do setor.
- `1 mm = 10 m³/ha`. Volume, dotação, profundidade, caudal e duração são derivados e valores independentes têm tolerância máxima de 0,5%.
- Uma cultura de cobertura e a permanente podem projetar a mesma operação nos respetivos históricos, mas a área física é limitada à área do talhão e água/nitratos contam uma vez.
- Leituras são independentes das regas. Reinícios, substituições e rollover são eventos explícitos; uma descida normal não é inferida.
- A reconciliação compara consumo medido e registado. O excedente medido é `Consumo não distribuído`; não é repartido artificialmente pelos setores.
- Uma análise de nitratos é aplicável a todos os setores selecionados, fica congelada no registo e, com mais de um ano, produz aviso sem bloquear.

## Programação semanal

Uma programação guarda de imediato a receita hidráulica e eventual fertirrega, mas ainda não cria operação, consumo de produto, nutrientes, stock ou custos. Depois do fim da semana na timezone da exploração, o serviço `finalizeDue` cria a operação como `Realizada por programação`. A consulta do módulo executa esta reconciliação devida e existe também `POST /api/farm/irrigation/schedules/finalize-due` para um invocador periódico autenticado.

Para execução estritamente à hora mesmo quando nenhum utilizador acede à exploração, falta ligar o invocador periódico da plataforma. Esta dependência operacional fica no lote externo final e não altera o modelo nem o comportamento autónomo após a primeira atividade da exploração.

## API

- `GET /api/farm/irrigation` — setores, contadores, leituras, análises, regas e reconciliações.
- `POST /api/farm/irrigation/sectors`
- `POST /api/farm/irrigation/meters`
- `POST /api/farm/irrigation/meters/:id/readings`
- `POST /api/farm/irrigation/water-analyses`
- `POST /api/farm/irrigation/records`
- `POST /api/farm/irrigation/records/:id/reverse`
- `POST /api/farm/irrigation/schedules/finalize-due`

## Limite GeroGrid

GeroFarm é dono dos setores, necessidades, datas agronómicas, volumes e receitas de fertirrega. Uma integração futura pode fornecer ao GeroGrid identificadores estáveis e necessidades semanais. O GeroGrid só poderá devolver datas/horas otimizadas; produtos e doses permanecem imutáveis no GeroFarm. Não existe chamada GeroGrid nesta fase.

## Migração e auditoria

`0015_irrigation.sql` cria tabelas tenant-scoped com RLS forçado, FKs, índices, validações hidráulicas, bloqueio de eliminação de regas/leituras e proteção de histórico realizado. Toda criação, materialização semanal, leitura especial e reversão gera `farm.audit_events`.

