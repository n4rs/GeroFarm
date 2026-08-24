# GeroFarm implementation sequence

Every completed module includes the database model and tenant isolation, server API, authenticated interface, audit rules, tests, production build and reviewed translations for all 28 homepage locales. A module is only pushed to `main` after those checks pass.

1. [Complete] Authenticated workspace, navigation and shared application internationalisation.
2. [Complete] Farms and fields: agricultural holdings, stable field codes, editable geometry, local KML/KMZ import, usable area, overlap validation and occupancy closure.
3. [Complete] Agronomic catalogue, varieties, plantations, permanent campaigns, temporary cycles, uprooting, fallow and rotation.
4. [Complete] Workers, certificates, contractors, equipment and the shared performed-operation model.
5. [Complete] Soil preparation, crop installation and cultural work.
6. [Complete] Fertilisation records and plans.
7. [Complete] Spraying, product applications, safety intervals and FRAC.
8. [Complete] Irrigation, fertigation, sectors, meters and weekly scheduling.
9. [Complete] Monitoring, samples and laboratory analyses.
10. [Complete] Harvests, immutable lots, quality, allocation and destinations.
11. [Complete] Optional inventory and cost modules. Migration `0017_optional_inventory_costs.sql`, API `/api/farm/economics`, and interfaces `/app/inventory` and `/app/costs` retain one consumption/cost projection per physical operation. Missing stock remains pending and never blocks the operation.
12. [Complete] Current field record, closed PDF versions, XLSX analysis export contract and integrity history. Economic data remains excluded from the official notebook.
13. [Complete] Privacy by Design adapted from GeroHydro: minimisation, pseudonymisation, Privacy Center, data-subject requests, category retention, immutable minimised audit and safe export.
14. [Complete consumer] GeroCore identity, selected organisation, membership/profile/permissions, access, subscription/entitlements and central preferred language. `/app/settings` projects those authoritative contracts, persists all 28 supported locales through `PATCH /api/v1/me/profile`, and links safely to central profile, organisation, security and administration surfaces without copying Core data locally.
15. [Complete consumer] Core-backed agronomic weather. Commit `364c94c` consumes canonical, provider-independent accumulations, coverage, provenance, profiles, warnings and indicators from GeroCore; GeroFarm neither contacts the weather provider nor recalculates those values.
16. [External only] Production migration/release validation, QA access, periodic jobs, future organisation-level unit/rule contracts and third-party integrations. These are isolated in `docs/deployment/external-pending.md`.

## Autonomous completion audit

As of 2026-08-24, the approved standalone domain sequence and both final Core-backed routes are implemented. Meteorology is based on the canonical Core contract at `364c94c`; Configurações contains no local projection of identity, organisation, permissions, subscription or entitlements. There are no remaining placeholder application routes and `PendingModule` has been removed.

GeroFarm remains a separate product running alongside the unchanged legacy GeroCampo application.
