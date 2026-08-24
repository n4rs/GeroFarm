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
14. [External only] GeroCore identity, membership and commercial entitlements; Core-backed agronomic weather; production migration/release validation; QA access; and third-party integrations. These are isolated in `docs/deployment/external-pending.md`.

## Autonomous completion audit

As of 2026-08-24, the approved standalone domain sequence is implemented. The remaining placeholder routes (`weather` and `settings`) depend on GeroCore sources of truth and must not be replaced by local duplicate identity, membership, entitlement, subscription or weather data. No further autonomous product phase is opened until those external contracts are available.

GeroFarm remains a separate product running alongside the unchanged legacy GeroCampo application.
