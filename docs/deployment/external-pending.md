# Intervenções externas finais

Estado do código em 2026-08-25: a implementação autónoma está concluída. Esta lista contém apenas ações que exigem acesso explícito a contas, painel, credenciais ou infraestrutura externa. Não contém lacunas de código.

## 1. Base de dados e migrações de produção

- Confirmar no painel que o Web Service usa exclusivamente `DATABASE_URL` do utilizador runtime `gero_farm_app` para a base `gero_farm`, e que o job `db-migrate` usa exclusivamente `DATABASE_MIGRATION_URL` do utilizador `gero_farm_migrator` para a mesma base.
- Confirmar `DATABASE_CA_CERT` nos dois componentes e `FARM_TENANT_SECRET` no Web Service, sempre como segredos encriptados. Se a base dedicada ainda não tiver sido inicializada, executar uma única vez o bootstrap interativo descrito em `docs/deployment/database.md` com acesso administrativo autorizado.
- Aplicar de forma controlada as migrações ordenadas `0000`–`0019` através do job `PRE_DEPLOY`. A migração `0019_single_holding.sql` interrompe com erro explícito se já existirem várias explorações na mesma organização; qualquer reconciliação desses dados exige decisão do titular antes de repetir a migração.

Nenhuma migração, bootstrap, seed ou inspeção de credenciais é executada por esta auditoria.

## 2. Contexto e contas QA autorizados

- Disponibilizar uma organização QA GeroFarm e contas autorizadas que cubram owner/admin, perfis operacionais, acesso temporário, read-only e os níveis comerciais efetivos necessários.
- Configurar nessa organização os entitlements reais para Meteorologia, Privacy by Design, Inventário, Custos e exportação de Caderno, incluindo limites de área, talhões, plantações e estações virtuais.
- Só com esse contexto executar uma validação de produção separada pelos formulários visíveis, cobrindo isolamento entre tenants, consola, persistência, PDF/XLSX e estados de entitlement. A presente auditoria não observa deploy nem faz QA de produção.

## 3. Invocador periódico

- Configurar um invocador autenticado e autorizado para `POST /api/farm/irrigation/schedules/finalize-due` no fuso da exploração. Sem o invocador, o fecho continua a ocorrer de forma segura na primeira consulta posterior ao fim da semana, mas não existe execução sem tráfego.

## Fora desta lista

- Não é necessária configuração meteorológica de fornecedor no GeroFarm: o produto consome apenas as séries base provider-independent publicadas pelo GeroCore.
- Não é necessária configuração Stripe no GeroFarm: catálogo, compatibilidade, subscrição, checkout e billing permanecem contratos centrais do GeroCore.
- Contratos futuros de unidades/regras organizacionais, GeroGrid, ERP, stock central ou outros terceiros são evolução de produto e código, não intervenção externa necessária para concluir o objetivo atual.
