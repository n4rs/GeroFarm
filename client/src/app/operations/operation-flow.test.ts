import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moduleSource = readFileSync(new URL("./OperationsModule.tsx", import.meta.url), "utf8");
const spraySource = readFileSync(new URL("./SprayingFields.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../AppWorkspace.tsx", import.meta.url), "utf8");

test("global operation action offers specialist forms only and preserves context", () => {
  assert.match(moduleSource, /specialistTypes\s*=\s*\["soil_preparation",\s*"crop_installation",\s*"cultural_work",\s*"fertilization",\s*"spraying",\s*"product_application"\]/);
  assert.match(moduleSource, /query\.get\("fieldId"\)/);
  assert.match(moduleSource, /query\.get\("plantationId"\)/);
  assert.match(workspaceSource, /mobile-register-operation/);
});

test("operation UI integrates catalogue, soil analysis, allocation and audited void contracts", () => {
  assert.match(moduleSource, /\/api\/farm\/operation-catalog/);
  assert.match(moduleSource, /"PATCH",\s*\{ active:/);
  assert.match(moduleSource, /soilAnalysisResultIdsByField/);
  assert.match(moduleSource, /workerAssignments:\s*serializeAssignments/);
  assert.match(moduleSource, /equipmentAssignments:\s*serializeAssignments/);
  assert.match(moduleSource, /contractorAssignments:\s*serializeAssignments/);
  assert.match(moduleSource, /\/operations\/\$\{operation\.id\}\/void/);
  assert.match(moduleSource, /operation\.status === "performed"/);
});

test("phytopharmaceutical UI permits only active certified applicators on the operation date", () => {
  assert.match(moduleSource, /isValidApplicator\(worker\.id,\s*values\.performedAt\.slice\(0,\s*10\)/);
  assert.match(spraySource, /workers\.filter\(worker => validApplicatorIds\.has\(worker\.id\)\)/);
  assert.match(spraySource, /required=\{value\.products\.some\(product\s*=>\s*product\.category\s*===?\s*"phytopharmaceutical"\)\}/);
});
