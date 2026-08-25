import type { WorkerDto } from "@shared/resources";
import type { SprayingCopy } from "./spraying-copy-source";
export type SprayProductForm = {
    name: string;
    category: "phytopharmaceutical" | "foliar_fertilizer" | "biostimulant" | "adjuvant" | "corrective" | "other";
    unit: "kg" | "g" | "l" | "ml";
    quantitySource: "dose_per_ha" | "dose_per_hl" | "total";
    dosePerHa: string;
    dosePerHl: string;
    totalQuantity: string;
    lotNumber: string;
    unitCost?: string;
    activeSubstances: string;
    registrationNumber: string;
    fracGroup: string;
    targets: string;
    authorized: Record<string, boolean>;
    authorizationReference: Record<string, string>;
    authorizedUse: Record<string, string>;
    validFrom: Record<string, string>;
    validUntil: Record<string, string>;
    safetyIntervalDays: Record<string, string>;
    reentryHours: Record<string, string>;
    compositionKnown: boolean;
    densityKgL: string;
    composition: string;
    legalLimitExceeded: boolean;
    applicationLimitExceeded: boolean;
    antiResistanceWarning: boolean;
};
export type SprayingForm = {
    method: "spray" | "granules" | "bait" | "injection" | "other";
    customMethod: string;
    sprayVolumeLHa: string;
    legalApplicatorWorkerId: string;
    products: SprayProductForm[];
    weatherSource: "gero_core" | "manual" | "unavailable";
    temperatureC: string;
    relativeHumidityPercent: string;
    windSpeedKmh: string;
    windDirectionDegrees: string;
    precipitationMm: string;
    condition: string;
    manuallyOverridden: boolean;
    equipmentInspectionValid: boolean;
    equipmentCalibrationValid: boolean;
    warningsAccepted: boolean;
};
export const blankSprayProduct = (): SprayProductForm => ({ name: "", category: "phytopharmaceutical", unit: "l", quantitySource: "dose_per_ha", dosePerHa: "", dosePerHl: "", totalQuantity: "", lotNumber: "", activeSubstances: "", registrationNumber: "", fracGroup: "", targets: "", authorized: {}, authorizationReference: {}, authorizedUse: {}, validFrom: {}, validUntil: {}, safetyIntervalDays: {}, reentryHours: {}, compositionKnown: false, densityKgL: "", composition: "", legalLimitExceeded: false, applicationLimitExceeded: false, antiResistanceWarning: false });
export const blankSpraying = (): SprayingForm => ({ method: "spray", customMethod: "", sprayVolumeLHa: "", legalApplicatorWorkerId: "", products: [blankSprayProduct()], weatherSource: "unavailable", temperatureC: "", relativeHumidityPercent: "", windSpeedKmh: "", windDirectionDegrees: "", precipitationMm: "", condition: "", manuallyOverridden: false, equipmentInspectionValid: true, equipmentCalibrationValid: true, warningsAccepted: false });
type Destination = {
    key: string;
    label: string;
};
type Props = {
    t: SprayingCopy;
    value: SprayingForm;
    set: <K extends keyof SprayingForm>(key: K, value: SprayingForm[K]) => void;
    workers: WorkerDto[];
    validApplicatorIds: Set<string>;
    destinations: Destination[];
    isSpraying: boolean;
};
const Input = ({ label, value, onChange, type = "text", required = true }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) => <label><span>{label}</span><input type={type} value={value} required={required} onChange={event => onChange(event.target.value)}/></label>;
export default function SprayingFields({ t, value, set, workers, validApplicatorIds, destinations, isSpraying }: Props) {
    const update = (index: number, key: keyof SprayProductForm, next: unknown) => set("products", value.products.map((product, i) => i === index ? { ...product, [key]: next } : product));
    const perDestination = (index: number, key: keyof Pick<SprayProductForm, "authorized" | "authorizationReference" | "authorizedUse" | "validFrom" | "validUntil" | "safetyIntervalDays" | "reentryHours">, destination: string, next: string | boolean) => set("products", value.products.map((product, i) => i === index ? { ...product, [key]: { ...product[key], [destination]: next } } : product));
    return <fieldset className="spraying-fields"><legend>{t.applicationDetails}</legend><p className="projection-notice">{t.projectionNotice}</p>
  <div className="fertilization-grid"><label><span>{t.applicationMethod}</span><select value={value.method} disabled={isSpraying} onChange={event => set("method", event.target.value as SprayingForm["method"])}>{(["spray", "granules", "bait", "injection", "other"] as const).map(method => <option key={method} value={method}>{t[`method${method[0].toUpperCase()}${method.slice(1)}` as keyof SprayingCopy]}</option>)}</select></label>{value.method === "other" && <Input label={t.methodOther} value={value.customMethod} onChange={next => set("customMethod", next)}/>} {value.method === "spray" && <Input label={t.sprayVolume} type="number" value={value.sprayVolumeLHa} onChange={next => set("sprayVolumeLHa", next)}/>}</div>
  <label><span>{t.legalApplicator}</span><select required={value.products.some(product=>product.category==="phytopharmaceutical")} value={value.legalApplicatorWorkerId} onChange={event => set("legalApplicatorWorkerId", event.target.value)}><option value="">{t.noLegalApplicator}</option>{workers.filter(worker => validApplicatorIds.has(worker.id)).map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select><small>{t.applicatorNotice}</small>{!validApplicatorIds.size&&value.products.some(product=>product.category==="phytopharmaceutical")&&<strong className="legal-blocker" role="alert">{t.applicatorNotice}</strong>}</label>
  <div className="fertilizer-products"><header><b>{t.applicationDetails}</b><button type="button" className="subtle-button" onClick={() => set("products", [...value.products, blankSprayProduct()])}>＋ {t.addProduct}</button></header>{value.products.map((product, index) => <fieldset key={index}>
   <Input label={t.addProduct} value={product.name} onChange={next => update(index, "name", next)}/><label><span>{t.productType}</span><select value={product.category} onChange={event => update(index, "category", event.target.value)}>{(["phytopharmaceutical", "foliar_fertilizer", "biostimulant", "adjuvant", "corrective", "other"] as const).map(category => <option key={category} value={category}>{t[category === "foliar_fertilizer" ? "foliarFertilizer" : category === "other" ? "otherProduct" : category]}</option>)}</select></label>
   <label><span>{t.quantitySource}</span><select value={product.quantitySource} onChange={event => update(index, "quantitySource", event.target.value)}><option value="dose_per_ha">kg/L/ha</option><option value="dose_per_hl">{t.dosePerHl}</option><option value="total">{t.quantitySource}</option></select></label>{product.quantitySource === "dose_per_ha" && <Input label="Dose/ha" type="number" value={product.dosePerHa} onChange={next => update(index, "dosePerHa", next)}/>} {product.quantitySource === "dose_per_hl" && <Input label={t.dosePerHl} type="number" value={product.dosePerHl} onChange={next => update(index, "dosePerHl", next)}/>} {product.quantitySource === "total" && <Input label={t.quantitySource} type="number" value={product.totalQuantity} onChange={next => update(index, "totalQuantity", next)}/>}<label><span>kg / g / L / ml</span><select value={product.unit} onChange={event => update(index, "unit", event.target.value)}>{["kg", "g", "l", "ml"].map(unit => <option key={unit}>{unit}</option>)}</select></label>
   <Input label="Lot" required={false} value={product.lotNumber} onChange={next => update(index, "lotNumber", next)}/><Input label="€/unit" type="number" required={false} value={product.unitCost||""} onChange={next=>update(index,"unitCost",next)}/><Input label={t.activeSubstances} required={false} value={product.activeSubstances} onChange={next => update(index, "activeSubstances", next)}/>{product.category === "phytopharmaceutical" && <><Input label={t.registrationNumber} value={product.registrationNumber} onChange={next => update(index, "registrationNumber", next)}/><Input label={t.fracGroup} required={false} value={product.fracGroup} onChange={next => update(index, "fracGroup", next)}/></>}<Input label={t.targets} required={false} value={product.targets} onChange={next => update(index, "targets", next)}/>
   <fieldset className="destination-doses"><legend>{t.authorizationSnapshot}</legend>{destinations.map(destination => <div className="authorization-destination" key={destination.key}><b>{destination.label}</b><label><input type="checkbox" checked={product.authorized[destination.key] ?? false} onChange={event => perDestination(index, "authorized", destination.key, event.target.checked)}/><span>{t.authorized}</span></label><Input label={t.authorizationReference} required={false} value={product.authorizationReference[destination.key] || ""} onChange={next => perDestination(index, "authorizationReference", destination.key, next)}/><Input label={t.authorizedUse} required={false} value={product.authorizedUse[destination.key] || ""} onChange={next => perDestination(index, "authorizedUse", destination.key, next)}/><Input label={t.validFrom} type="date" required={false} value={product.validFrom[destination.key] || ""} onChange={next => perDestination(index, "validFrom", destination.key, next)}/><Input label={t.validUntil} type="date" required={false} value={product.validUntil[destination.key] || ""} onChange={next => perDestination(index, "validUntil", destination.key, next)}/><Input label={t.safetyInterval} type="number" required={false} value={product.safetyIntervalDays[destination.key] || ""} onChange={next => perDestination(index, "safetyIntervalDays", destination.key, next)}/><Input label={t.reentryInterval} type="number" required={false} value={product.reentryHours[destination.key] || ""} onChange={next => perDestination(index, "reentryHours", destination.key, next)}/></div>)}</fieldset>
   {(product.category === "foliar_fertilizer" || product.category === "corrective") && <><label><input type="checkbox" checked={product.compositionKnown} onChange={event => update(index, "compositionKnown", event.target.checked)}/><span>Composition known</span></label>{product.compositionKnown && <><Input label="Nutrient composition (nTotal=10; p2o5=5)" value={product.composition} onChange={next => update(index, "composition", next)}/>{product.unit === "l" && <Input label="Density (kg/L)" type="number" value={product.densityKgL} onChange={next => update(index, "densityKgL", next)}/>}</>}</>}
   {value.products.length > 1 && <button type="button" className="danger-link" onClick={() => set("products", value.products.filter((_, i) => i !== index))}>×</button>}
  </fieldset>)}</div>
  <fieldset className="weather-fields"><legend>{t.weatherSnapshot}</legend><label><span>{t.weatherSource}</span><select value={value.weatherSource} onChange={event => set("weatherSource", event.target.value as SprayingForm["weatherSource"])}><option value="gero_core">{t.sourceCore}</option><option value="manual">{t.sourceManual}</option><option value="unavailable">{t.sourceUnavailable}</option></select></label>{value.weatherSource !== "unavailable" && <div className="nutrient-grid"><Input label={t.temperature} type="number" required={false} value={value.temperatureC} onChange={next => set("temperatureC", next)}/><Input label={t.humidity} type="number" required={false} value={value.relativeHumidityPercent} onChange={next => set("relativeHumidityPercent", next)}/><Input label={t.windSpeed} type="number" required={false} value={value.windSpeedKmh} onChange={next => set("windSpeedKmh", next)}/><Input label={t.windDirection} type="number" required={false} value={value.windDirectionDegrees} onChange={next => set("windDirectionDegrees", next)}/><Input label={t.precipitation} type="number" required={false} value={value.precipitationMm} onChange={next => set("precipitationMm", next)}/><Input label={t.weatherCondition} required={false} value={value.condition} onChange={next => set("condition", next)}/></div>}</fieldset>
  <label><input type="checkbox" checked={value.equipmentInspectionValid} onChange={event => set("equipmentInspectionValid", event.target.checked)}/><span>{t.inspectionValid}</span></label><label><input type="checkbox" checked={value.equipmentCalibrationValid} onChange={event => set("equipmentCalibrationValid", event.target.checked)}/><span>{t.calibrationValid}</span></label><label><input type="checkbox" checked={value.warningsAccepted} onChange={event => set("warningsAccepted", event.target.checked)}/><span>{t.acceptWarnings}</span></label><p>{t.intervalNotice} {t.warningNotice}</p>
 </fieldset>;
}
