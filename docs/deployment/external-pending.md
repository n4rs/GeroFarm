# Lote final de intervenções externas

Estado em 2026-08-24:

- Pulverização, commit `4dae1ec`: implementada, validada localmente e enviada para `main`, mas **não validada em produção**. `farm.gero.pt` continuava a servir `index-Cu_xKhGT.js`, não o build esperado `index-D9Ew0xNo.js`.
- Rega/fertirrega, commit `4a70489`: implementada, validada localmente e enviada para `main`, mas **não validada em produção**. Depois do push, health respondeu `200`/`ok`, mas a homepage continuava a servir `index-Cu_xKhGT.js`; o build local final combinado gerou `index-BJaJHDeQ.js` e `IrrigationModule-BShV0Aj9.js`.
- A sessão Core disponível na verificação automática redirecionou `/app/irrigation` para o seletor com `Sem aplicações disponíveis`; falta um contexto QA ativo para validar formulários e consola dentro do GeroFarm publicado.
- A validação de produção depende de o App Platform publicar o commit e aplicar `0015_irrigation.sql` com a ligação de migração autorizada.
- Programação semanal sem qualquer tráfego: ligar o invocador periódico autenticado ao endpoint `schedules/finalize-due`. Sem ele, o fecho ocorre automaticamente na primeira consulta posterior ao fim da semana.
- Dependências futuras não bloqueantes: contratos do GeroCore para catálogo/stock central, integração GeroGrid apenas para horários, credenciais e acessos QA.

Não declarar estes pontos validados até existirem evidências separadas de migração, asset atual, health, DOM/UI e consola.
