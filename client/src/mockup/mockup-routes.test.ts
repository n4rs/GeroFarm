import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mockup routes contain concrete screens and specialist operation forms", async () => {
  const source = await readFile(new URL("./MockupWorkspace.tsx", import.meta.url), "utf8");
  for (const screen of ["inicio", "exploracao", "operacoes", "planos", "meteorologia", "colheitas", "caderno", "gestao", "inventario", "custos", "configuracoes"]) assert.match(source, new RegExp(`\\b${screen}\\b`), screen);
  for (const operation of ["Instalar cultura", "Preparação do solo", "Pulverização", "Aplicação de produtos", "Fertilização", "Rega ou fertirrega", "Trabalho cultural", "Monitorização", "Colheita"]) assert.match(source, new RegExp(operation), operation);
  assert.doesNotMatch(source, /PendingModule|\bTODO\b|\bFIXME\b/u);
  assert.doesNotMatch(source, /Estrutura visual preparada|seria aberto/iu);
  assert.match(source, /selectedOperation/u);
});
