# Fertilization plans and nutrient balance

## Implemented boundary

- A general plan belongs to one crop and one required period; it creates one frozen individual plan per selected field.
- Individual plans preserve their agronomic target, effective area, requirements, planned nutrient sources, optional irrigation forecast, optional irrigation-sector/nitrate-analysis snapshots, and the explicit cover-crop decision.
- Plans are separate from operations. Saving or activating a plan never creates, prepares, or changes a physical operation.
- Delivered nutrients are calculated at read time from completed fertilization components already attached to physical operations. Destination allocations are used once; workers, equipment, products, inventory, costs and nutrient quantities are not copied into plan tables.
- Versions progress from `draft` to `in_force` and then `superseded`. Only one version per crop and organization can be in force. Activated history cannot be edited or deleted, and creation/activation are audited.
- Balances expose requirements, planned sources, actually applied nutrients and the remaining amount in kg/ha. The display can switch from declared oxide forms to elemental P, K, Ca, Mg and S without altering stored historical values.

## Non-blocking dependencies reserved for final phases

- Gero Core remains the authority for identity, organization and access only. This phase requires no Core change.
- Irrigation sectors and nitrate analyses exist in GeroFarm. Plans preserve the selected sector/analysis snapshots and issue non-blocking warnings when they are absent or older than one year; activated plans are never rewritten by later source changes.
- Nutrients delivered by irrigation products use the single fertigation operation projection. Nitrates delivered by water are calculated once from performed irrigation volume and its frozen analysis, and remain a separate indicator in the balance.
- The oxide/elemental choice is currently a per-view presentation toggle. Persisting an organization preference belongs to the later settings phase.
- The crop selector deliberately preserves the stable imported source designations used by the existing crop catalogue. Translating the 106 concrete catalogue records is a shared catalogue phase, separate from the fully translated plan interface.
