import assert from "node:assert/strict";
import test from "node:test";
import { createPrivacyRequestSchema, farmRetentionPolicies, sanitizePrivacyAuditMetadata } from "./privacy";

test("privacy requests are bounded and use supported GDPR request types", () => { assert.equal(createPrivacyRequestSchema.safeParse({ type: "access", details: "Please provide my personal data." }).success, true); assert.equal(createPrivacyRequestSchema.safeParse({ type: "unknown", details: "Please provide my personal data." }).success, false); });
test("privacy audit metadata removes personal and arbitrary values", () => { assert.deepEqual(sanitizePrivacyAuditMetadata({ status: "submitted", email: "private@example.test", details: "secret", count: 2 }), { status: "submitted", count: 2 }); });
test("agricultural and traceability retention policies preserve legal review", () => { for (const category of ["operational_records", "phytosanitary_records", "traceability_records"]) { const policy = farmRetentionPolicies.find((item) => item.category === category); assert.equal(policy?.legallyControlled, true); assert.equal(policy?.action, "manual_review"); } });
