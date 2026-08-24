# GeroFarm entitlement enforcement

GeroFarm consumes the effective `access-v1` result from Gero Core. It does not store plan catalogues, prices, add-on compatibility, subscriptions or billing state.

Local limits are enforced inside the same PostgreSQL transaction as the capacity-increasing mutation. A tenant advisory transaction lock serializes competing field and plantation creations. Active area is the geographic union of active field polygons. Existing over-limit data remains readable and actions that keep or reduce usage remain available.

`applicationUsers` is owned and mutated in Gero Core. GeroFarm reports its usage as unavailable until Core exposes an authoritative usage value; it never creates a second counter or lock. Plan changes are managed centrally because the current Core checkout rejects a second active plan. Eligible add-on checkout is proxied to Core and all displayed prices and compatibility rules come from the live Core catalog.

Start trial's `fieldNotebookExport: "after_trial"` denies real PDF/XLSX issuance and downloads. No tenant data is placed in a demonstration export. The separate demonstration presentation remains UI-only until a reviewed, fictitious-data artifact is supplied.

Agronomic weather and virtual-station persistence are intentionally left for the sequential meteorology task. The effective `agronomicWeather` feature and `virtualStations` limit are already exposed to the consumer UI and enforcement helpers.
