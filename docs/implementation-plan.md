# GeroFarm implementation sequence

## Rega e fertirrega

A fase autónoma de setores completos, contadores, leituras, análises de água, rega multi-setor, programação semanal, reconciliação e fertirrega usa a migração `0015_irrigation.sql`, a API `/api/farm/irrigation` e a interface `/app/irrigation`. O contrato detalhado está em `docs/irrigation.md`.

Every completed module includes the database model and tenant isolation, server API, authenticated interface, audit rules, tests, production build and reviewed translations for all 28 homepage locales. A module is only pushed to `main` after those checks pass.

1. [Complete] Authenticated workspace, navigation and shared application internationalisation.
2. [Complete] Farms and fields: agricultural holdings, stable field codes, editable geometry, local KML/KMZ import, usable area, overlap validation and occupancy closure.
3. [Complete] Agronomic catalogue, varieties, plantations, permanent campaigns, temporary cycles, uprooting, fallow and rotation.
4. [Complete] Workers, certificates, contractors, equipment and the shared performed-operation model.
5. Soil preparation, crop installation and cultural work.
6. Fertilisation records and plans.
7. Spraying, product applications, safety intervals and FRAC.
8. Irrigation, fertigation, sectors, meters and weekly scheduling.
9. Monitoring, samples and laboratory analyses.
10. Harvests, immutable lots, quality, allocation and destinations.
11. Optional inventory and cost modules.
12. Current field record, closed PDF versions, XLSX export and integrity history.
13. Privacy by Design adapted from GeroHydro: minimisation, pseudonymisation, Privacy Center, data-subject requests, category retention, immutable minimised audit and safe export.
14. GeroCore changes and external integrations only after all standalone work. Any account, credential or third-party API intervention is collected for the final user-intervention block.

GeroFarm remains a separate product running alongside the unchanged legacy GeroCampo application.
