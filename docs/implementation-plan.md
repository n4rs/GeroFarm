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
9. [Complete] Monitoring, samples and laboratory analyses. Automatic observation weather reuses the tenant-safe, persisted Core Weather v2 base series for the selected plantation and cultural period. The immutable provider-independent snapshot remains separate from justified user corrections; explicit unavailability never blocks the physical observation.
10. [Complete] Harvests, immutable lots, quality, allocation and destinations.
11. [Complete] Optional inventory and cost modules. Migration `0017_optional_inventory_costs.sql`, API `/api/farm/economics`, and interfaces `/app/inventory` and `/app/costs` retain one consumption/cost projection per physical operation. Missing stock remains pending and never blocks the operation.
12. [Complete] Current field record, closed PDF versions, XLSX analysis export contract and integrity history. Economic data remains excluded from the official notebook.
13. [Complete] Privacy by Design adapted from GeroHydro: minimisation, pseudonymisation, Privacy Center, data-subject requests, category retention, immutable minimised audit and safe export.
14. [Complete consumer] GeroCore identity, selected organisation, membership/profile/permissions, access, subscription/entitlements and central preferred language. `/app/settings` projects those authoritative contracts, persists all 28 supported locales through `PATCH /api/v1/me/profile`, and links safely to central profile, organisation, security and administration surfaces without copying Core data locally.
15. [Complete] Local agronomic weather. GeroFarm consumes only the provider-independent Core Weather v2 plantation base-series endpoint, persists normalized hourly/daily samples idempotently, and owns versioned, auditable ET₀, energy, PAR/DLI, degree-day, chill and leaf-wetness calculations.

16. [Complete] Historical station periods, sample coverage/gaps, measured/estimated and observed/forecast classifications, versioned profiles and reproducible result hashes are local. GeroCore remains only the credential-protected provider gateway, cache, technical provenance and base-weather normalizer.
17. [External only] Production migration/release validation, QA access, periodic jobs, future organisation-level unit/rule contracts and third-party integrations. These are isolated in `docs/deployment/external-pending.md`.

## Autonomous completion audit

As of 2026-08-24, the monitoring correction is complete and the standalone domain modules contain no placeholder application routes. The global autonomous sequence is not complete: step 16 remains mandatory to align weather history and agronomic calculations with the approved Core/Farm boundary. Configurações contains no local projection of identity, organisation, permissions, subscription or entitlements.

GeroFarm remains a separate product running alongside the unchanged legacy GeroCampo application.
