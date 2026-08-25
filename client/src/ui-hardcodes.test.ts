import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = [
  "App.tsx",
  "app/operations/IrrigationModule.tsx",
  "app/operations/OperationsModule.tsx",
  "app/operations/SprayingFields.tsx",
];

const forbidden = [
  "A carregar", "Catálogo de operações", "Análises do solo", "Sem análise válida",
  "missing_valid_analysis", "Horas totais", "Distribuição manual integral",
  "Anular operação", "Confirmar anulação", "Composition known",
  "Nutrient composition", "Density (kg/L)", 'label="Dose/ha"', 'label="Lot"',
  'aria-label="Fechar"', "Nenhuma opção personalizada.",
  "Não foi possível carregar os talhões para a rega.",
];

test("recent public and authenticated surfaces contain no known UI hardcodes", () => {
  const findings: string[] = [];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), "client/src", file), "utf8");
    for (const fragment of forbidden) if (source.includes(fragment)) findings.push(`${file}: ${fragment}`);
  }
  assert.deepEqual(findings, []);
});
