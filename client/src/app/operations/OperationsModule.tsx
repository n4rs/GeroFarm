import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { FieldDto } from "@shared/fields";
import type { PlantationDto } from "@shared/crop-lifecycle";
import type { ContractorDto, EquipmentDto, WorkerDto } from "@shared/resources";
import { culturalWorkActionIds, soilPreparationActionIds, type OperationDto } from "@shared/operations";
import type { CultureCatalogEntry, VarietyDto } from "@shared/crops";
import { useI18n } from "../../i18n";
import { operationCopies, type OperationCopy } from "./operation-locales.generated";
import "./operations.css";
import "./cultural-work.css";
import "./fertilization.css";
import SprayingFields, { blankSpraying, type SprayingForm } from "./SprayingFields";
import { sprayingCopies } from "./spraying-locales.generated";
type Data = {
    operations: OperationDto[];
    fields: FieldDto[];
    plantations: PlantationDto[];
    workers: WorkerDto[];
    equipment: EquipmentDto[];
    contractors: ContractorDto[];
    cultures: readonly CultureCatalogEntry[];
    varieties: VarietyDto[];
};
type DestinationForm = {
    fieldId: string;
    plantationId: string;
    areaHa: string;
    percentage: string;
};
type MaterialLotForm = {
    varietyId: string;
    lotNumber: string;
    quantity: string;
    unit: string;
    origin: string;
    supplier: string;
};
type InstallationForm = {
    plantationName: string;
    cultureId: string;
    varietyIds: string[];
    varietyDensities: Record<string, string>;
    kind: "permanent" | "temporary";
    endedOn: string;
    method: "sowing" | "transplanting" | "planting" | "other";
    customMethod: string;
    densityPlantsHa: string;
    rowSpacingCm: string;
    plantSpacingCm: string;
    materialLots: MaterialLotForm[];
    predecessor: string;
    preparatoryOperationIds: string[];
};
type CulturalMaterialForm = {
    name: string;
    quantity: string;
    unit: string;
    lotNumber: string;
};
type CulturalForm = {
    actions: string[];
    customAction: string;
    method: "manual" | "mechanical" | "thermal" | "other";
    customMethod: string;
    intensity: "" | "light" | "medium" | "severe";
    intensityPercentage: string;
    biomassDestination: string;
    plantPercentage: string;
    plantCount: string;
    materials: CulturalMaterialForm[];
    originalDensityPlantsHa: string;
    plantsReplaced: string;
    plantsPlaced: string;
    estimatedCurrentDensityPlantsHa: string;
};
type FertilizerProductForm = {
    name: string;
    category: "fertilizer" | "amendment" | "organic";
    quantitySource: "dose_per_ha" | "total";
    dosePerHa: string;
    totalQuantity: string;
    unit: "kg" | "l" | "t";
    densityKgL: string;
    lotNumber: string;
    compositionKnown: boolean;
    dryMatterPercent: string;
    nTotal: string;
    nNitrate: string;
    nAmmonium: string;
    nUreic: string;
    nOrganic: string;
    p2o5: string;
    k2o: string;
    cao: string;
    mgo: string;
    so3: string;
    organicMatter: string;
    carbon: string;
    micronutrients: string;
    destinationDoses: Record<string, string>;
};
type FertilizationForm = {
    mode: "base" | "top_dressing" | "foliar" | "amendment" | "organic_matter" | "cover_crop_incorporation" | "other";
    customMode: string;
    products: FertilizerProductForm[];
};
const empty: Data = { operations: [], fields: [], plantations: [], workers: [], equipment: [], contractors: [], cultures: [], varieties: [] };
export default function OperationsModule() {
    const { locale } = useI18n();
    const t = operationCopies[locale];
    const [data, setData] = useState(empty);
    const [adding, setAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const load = useCallback(async () => { setLoading(true); setFailed(false); try {
        const responses = await Promise.all(["/api/farm/operations", "/api/farm/fields", "/api/farm/crop-lifecycle", "/api/farm/resources", "/api/farm/crop-catalog", "/api/farm/varieties"].map(url => fetch(url, { credentials: "include" })));
        if (responses.some(response => !response.ok))
            throw new Error();
        const [operations, fields, lifecycle, resources, cultures, varieties] = await Promise.all(responses.map(response => response.json()));
        setData({ operations: operations.data, fields: fields.data, plantations: lifecycle.data.plantations, workers: resources.data.workers, equipment: resources.data.equipment, contractors: resources.data.contractors, cultures: cultures.data, varieties: varieties.data });
    }
    catch {
        setFailed(true);
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => { void load(); }, [load]);
    const fields = useMemo(() => new Map(data.fields.map(item => [item.id, item.name])), [data.fields]);
    const plantations = useMemo(() => new Map(data.plantations.map(item => [item.id, item.name])), [data.plantations]);
    return <>
      <section className="page-heading">
        <div>
          <p>{t.kicker}</p>
          <h1>{t.title}</h1>
          <span>{t.description}</span>
        </div>
        <button className="primary-action" disabled={!data.fields.length} onClick={() => setAdding(true)}>
          ＋ {t.add}
        </button>
      </section>
      <aside className="operation-notice">{t.sharedNotice}</aside>
      <FertilizationSummary data={data} locale={locale} t={t}/>
      <section className="panel operation-panel">
        {loading ? <div className="module-state">
            <span className="spinner"/>
          </div> : failed ? <div className="module-state error-state">
            <p>{t.loadError}</p>
            <button onClick={() => void load()}>{t.add}</button>
          </div> : data.operations.length ? <div className="operation-table">
            {data.operations.map(operation => <article key={operation.id}>
                <code>{operation.code}</code>
                <div>
                  <b>{typeLabel(t, operation.type, sprayingCopies[locale].productApplication)}</b>
                  <span>
                    {operation.destinations.map(destination => `${fields.get(destination.fieldId)}${destination.plantationId ? ` · ${plantations.get(destination.plantationId)}` : ""}`).join("; ")}
                  </span>
                </div>
                <time>
                  {new Date(operation.performedAt).toLocaleString(locale)}
                </time>
                <em>
                  {operation.destinations.reduce((total, destination) => total + destination.areaHa, 0).toLocaleString(locale)}{" "}
                  ha
                </em>
              </article>)}
          </div> : <div className="module-state">
            <p>{t.empty}</p>
          </div>}
      </section>
      {adding && <OperationDialog data={data} t={t} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await load(); }}/>}
    </>;
}
const typeLabel = (t: OperationCopy, type: OperationDto["type"], productApplication = "Product application") => ({ soil_preparation: t.soilPreparation, crop_installation: t.cropInstallation, cultural_work: t.culturalWork, fertilization: t.fertilization, spraying: t.spraying, product_application: productApplication, irrigation: t.irrigation, fertigation: t.fertigation, monitoring: t.monitoring, harvest: t.harvest, other: t.other })[type];
function serializeSpraying(form:SprayingForm,destinations:DestinationForm[],data:Data){const optionalNumber=(value:string)=>value?Number(value):undefined;return{method:form.method,...(form.customMethod?{customMethod:form.customMethod}:{}),...(form.method==="spray"?{sprayVolumeLHa:Number(form.sprayVolumeLHa)}:{}),...(form.legalApplicatorWorkerId?{legalApplicatorWorkerId:form.legalApplicatorWorkerId}:{}),auxiliaryWorkerIds:[],products:form.products.map(product=>({name:product.name,category:product.category,unit:product.unit,quantitySource:product.quantitySource,...(product.dosePerHa?{dosePerHa:Number(product.dosePerHa)}:{}),...(product.dosePerHl?{dosePerHl:Number(product.dosePerHl)}:{}),...(product.totalQuantity?{totalQuantity:Number(product.totalQuantity)}:{}),...(product.lotNumber?{lotNumber:product.lotNumber}:{}),activeSubstances:product.activeSubstances.split(/[;,]/).map(value=>value.trim()).filter(Boolean),...(product.registrationNumber?{registrationNumber:product.registrationNumber}:{}),...(product.fracGroup?{fracGroup:product.fracGroup}:{}),targets:product.targets.split(/[;,]/).map(value=>value.trim()).filter(Boolean),authorizations:destinations.map(destination=>{const key=`${destination.fieldId}:${destination.plantationId}`,plantation=data.plantations.find(item=>item.id===destination.plantationId),field=data.fields.find(item=>item.id===destination.fieldId);return{fieldId:destination.fieldId,...(destination.plantationId?{plantationId:destination.plantationId}:{}),...(plantation?{cultureId:plantation.cultureId}:{}),destinationLabel:plantation?.name||field?.name||destination.fieldId,authorized:product.authorized[key]??false,...(product.authorizationReference[key]?{authorizationReference:product.authorizationReference[key]}:{}),...(product.authorizedUse[key]?{authorizedUse:product.authorizedUse[key]}:{}),...(product.validFrom[key]?{validFrom:product.validFrom[key]}:{}),...(product.validUntil[key]?{validUntil:product.validUntil[key]}:{}),...(product.safetyIntervalDays[key]?{safetyIntervalDays:Number(product.safetyIntervalDays[key])}:{}),...(product.reentryHours[key]?{reentryHours:Number(product.reentryHours[key])}:{})};}),legalLimitExceeded:product.legalLimitExceeded,applicationLimitExceeded:product.applicationLimitExceeded,antiResistanceWarning:product.antiResistanceWarning,...(product.compositionKnown?{nutrientSnapshot:{compositionKnown:true,...(product.densityKgL?{densityKgL:Number(product.densityKgL)}:{}),composition:Object.fromEntries(product.composition.split(/[;,]/).map(item=>item.split("=").map(part=>part.trim())).filter(parts=>parts.length===2&&parts[0]&&Number(parts[1])>=0).map(([key,value])=>[key,Number(value)]))}}:{})})),weather:{source:form.weatherSource,...(optionalNumber(form.temperatureC)!==undefined?{temperatureC:optionalNumber(form.temperatureC)}:{}),...(optionalNumber(form.relativeHumidityPercent)!==undefined?{relativeHumidityPercent:optionalNumber(form.relativeHumidityPercent)}:{}),...(optionalNumber(form.windSpeedKmh)!==undefined?{windSpeedKmh:optionalNumber(form.windSpeedKmh)}:{}),...(optionalNumber(form.windDirectionDegrees)!==undefined?{windDirectionDegrees:optionalNumber(form.windDirectionDegrees)}:{}),...(optionalNumber(form.precipitationMm)!==undefined?{precipitationMm:optionalNumber(form.precipitationMm)}:{}),...(form.condition?{condition:form.condition}:{}),manuallyOverridden:form.manuallyOverridden},equipmentInspectionValid:form.equipmentInspectionValid,equipmentCalibrationValid:form.equipmentCalibrationValid,warningsAccepted:form.warningsAccepted};}
function OperationDialog({ data, t, onClose, onSaved }: {
    data: Data;
    t: OperationCopy;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const { locale } = useI18n();
    const st = sprayingCopies[locale];
    const blank = (): DestinationForm => ({ fieldId: data.fields[0]?.id || "", plantationId: "", areaHa: "", percentage: "100" });
    const blankInstallation = (): InstallationForm => ({ plantationName: "", cultureId: data.cultures[0]?.id || "", varietyIds: [], varietyDensities: {}, kind: "temporary", endedOn: "", method: "sowing", customMethod: "", densityPlantsHa: "", rowSpacingCm: "", plantSpacingCm: "", materialLots: [], predecessor: "", preparatoryOperationIds: [] });
    const blankCultural = (): CulturalForm => ({ actions: [], customAction: "", method: "manual", customMethod: "", intensity: "", intensityPercentage: "", biomassDestination: "", plantPercentage: "", plantCount: "", materials: [], originalDensityPlantsHa: "", plantsReplaced: "", plantsPlaced: "", estimatedCurrentDensityPlantsHa: "" });
    const blankFertilizer = (): FertilizerProductForm => ({ name: "", category: "fertilizer", quantitySource: "dose_per_ha", dosePerHa: "", totalQuantity: "", unit: "kg", densityKgL: "", lotNumber: "", compositionKnown: true, dryMatterPercent: "", nTotal: "", nNitrate: "", nAmmonium: "", nUreic: "", nOrganic: "", p2o5: "", k2o: "", cao: "", mgo: "", so3: "", organicMatter: "", carbon: "", micronutrients: "", destinationDoses: {} });
    const blankFertilization = (): FertilizationForm => ({ mode: "base", customMode: "", products: [blankFertilizer()] });
    const [values, setValues] = useState({ destinations: [blank()], type: "cultural_work", performedAt: new Date().toISOString().slice(0, 16), durationMinutes: "", notes: "", workerIds: [] as string[], equipmentIds: [] as string[], contractorIds: [] as string[], soilActions: [] as string[], customSoilAction: "", depthCm: "", passes: "", soilCondition: "", residueDestination: "", installation: blankInstallation(), cultural: blankCultural(), fertilizationForm: blankFertilization(), includeFertilization: false, sprayingForm: blankSpraying() });
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const customSoilActions = [...new Set(data.operations.flatMap(operation => operation.soilPreparation?.actions || []).filter(action => !soilPreparationActionIds.includes(action as (typeof soilPreparationActionIds)[number])))].sort((a, b) => a.localeCompare(b));
    const set = (key: string, value: unknown) => setValues(current => ({ ...current, [key]: value }));
    const setInstallation = <K extends keyof InstallationForm,>(key: K, value: InstallationForm[K]) => setValues(current => ({ ...current, installation: { ...current.installation, [key]: value } }));
    const setCultural = <K extends keyof CulturalForm,>(key: K, value: CulturalForm[K]) => setValues(current => ({ ...current, cultural: { ...current.cultural, [key]: value } }));
    const setFertilization = <K extends keyof FertilizationForm,>(key: K, value: FertilizationForm[K]) => setValues(current => ({ ...current, fertilizationForm: { ...current.fertilizationForm, [key]: value } }));
    const setSpraying = <K extends keyof SprayingForm,>(key: K, value: SprayingForm[K]) => setValues(current => ({ ...current, sprayingForm: { ...current.sprayingForm, [key]: value } }));
    const setDestination = (index: number, key: keyof DestinationForm, value: string) => setValues(current => ({ ...current, destinations: current.destinations.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value, ...(key === "fieldId" ? { plantationId: "" } : {}) } : row) }));
    const toggle = (key: "workerIds" | "equipmentIds" | "contractorIds", id: string) => set(key, values[key].includes(id) ? values[key].filter(item => item !== id) : [...values[key], id]);
    const toggleSoilAction = (id: string) => set("soilActions", values.soilActions.includes(id) ? values.soilActions.filter(item => item !== id) : [...values.soilActions, id]);
    async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setFailed(false); const { soilActions, customSoilAction, depthCm, passes, soilCondition, residueDestination, installation, cultural, fertilizationForm, includeFertilization, ...common } = values; const actions = [...soilActions, ...(customSoilAction.trim() ? [customSoilAction.trim()] : [])]; const culturalActions = [...cultural.actions, ...(cultural.customAction.trim() ? [cultural.customAction.trim()] : [])]; const payload = { ...common, destinations: values.destinations.map(destination => ({ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), areaHa: Number(destination.areaHa), percentage: Number(destination.percentage) })), performedAt: new Date(values.performedAt).toISOString(), ...(values.durationMinutes ? { durationMinutes: Number(values.durationMinutes) } : { durationMinutes: undefined }), ...(values.type === "soil_preparation" ? { soilPreparation: { actions, ...(depthCm ? { depthCm: Number(depthCm) } : {}), ...(passes ? { passes: Number(passes) } : {}), ...(soilCondition ? { soilCondition } : {}), ...(residueDestination ? { residueDestination } : {}) } } : {}), ...(values.type === "crop_installation" ? { cropInstallation: { plantationName: installation.plantationName, cultureId: installation.cultureId, varietyIds: installation.varietyIds, varietyDensities: Object.entries(installation.varietyDensities).filter(([, density]) => density).map(([varietyId, density]) => ({ varietyId, densityPlantsHa: Number(density) })), kind: installation.kind, ...(installation.endedOn ? { endedOn: installation.endedOn } : {}), method: installation.method, ...(installation.customMethod ? { customMethod: installation.customMethod } : {}), densityPlantsHa: Number(installation.densityPlantsHa), ...(installation.rowSpacingCm ? { rowSpacingCm: Number(installation.rowSpacingCm) } : {}), ...(installation.plantSpacingCm ? { plantSpacingCm: Number(installation.plantSpacingCm) } : {}), materialLots: installation.materialLots.filter(lot => lot.lotNumber.trim()).map(lot => ({ ...(lot.varietyId ? { varietyId: lot.varietyId } : {}), lotNumber: lot.lotNumber, quantity: Number(lot.quantity), unit: lot.unit, ...(lot.origin ? { origin: lot.origin } : {}), ...(lot.supplier ? { supplier: lot.supplier } : {}) })), ...(installation.predecessor ? { predecessor: installation.predecessor } : {}), preparatoryOperationIds: installation.preparatoryOperationIds } } : {}), ...(values.type === "cultural_work" ? { culturalWork: { actions: culturalActions, method: cultural.method, ...(cultural.customMethod ? { customMethod: cultural.customMethod } : {}), ...(cultural.intensity ? { intensity: cultural.intensity } : {}), ...(cultural.intensityPercentage ? { intensityPercentage: Number(cultural.intensityPercentage) } : {}), ...(cultural.biomassDestination ? { biomassDestination: cultural.biomassDestination } : {}), ...(cultural.plantPercentage ? { plantPercentage: Number(cultural.plantPercentage) } : {}), ...(cultural.plantCount ? { plantCount: Number(cultural.plantCount) } : {}), materials: cultural.materials.filter(item => item.name.trim()).map(item => ({ name: item.name, quantity: Number(item.quantity), unit: item.unit, ...(item.lotNumber ? { lotNumber: item.lotNumber } : {}) })), ...(culturalActions.includes("replanting") ? { replanting: { originalDensityPlantsHa: Number(cultural.originalDensityPlantsHa), plantsReplaced: Number(cultural.plantsReplaced), plantsPlaced: Number(cultural.plantsPlaced), ...(cultural.estimatedCurrentDensityPlantsHa ? { estimatedCurrentDensityPlantsHa: Number(cultural.estimatedCurrentDensityPlantsHa) } : {}) } } : {}) } } : {}), ...(values.type === "fertilization" || values.type === "soil_preparation" && includeFertilization ? { fertilization: { mode: fertilizationForm.mode, ...(fertilizationForm.customMode ? { customMode: fertilizationForm.customMode } : {}), products: fertilizationForm.products.map(product => ({ name: product.name, category: product.category, quantitySource: product.quantitySource, dosePerHa: Number(product.dosePerHa), totalQuantity: Number(product.totalQuantity), unit: product.unit, ...(product.densityKgL ? { densityKgL: Number(product.densityKgL) } : {}), ...(product.lotNumber ? { lotNumber: product.lotNumber } : {}), compositionKnown: product.compositionKnown, ...(product.dryMatterPercent ? { dryMatterPercent: Number(product.dryMatterPercent) } : {}), composition: product.compositionKnown ? { ...Object.fromEntries((["nTotal", "nNitrate", "nAmmonium", "nUreic", "nOrganic", "p2o5", "k2o", "cao", "mgo", "so3", "organicMatter", "carbon"] as const).flatMap(key => product[key] ? [[key, Number(product[key])]] : [])), micronutrients: Object.fromEntries(product.micronutrients.split(/[;,]/).map(item => item.split("=").map(part => part.trim())).filter(item => item.length === 2 && item[0] && Number(item[1]) >= 0).map(([name, value]) => [name, Number(value)])) } : { micronutrients: {} }, destinationApplications: values.destinations.flatMap(destination => { const key = `${destination.fieldId}:${destination.plantationId}`; const dose = product.destinationDoses[key]; return dose ? [{ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), dosePerHa: Number(dose), totalQuantity: Number(dose) * Number(destination.areaHa) }] : []; }), nutrientTotalsKg: {} })) } } : {}) }; try {
        const serializedSpraying=["spraying","product_application"].includes(values.type)?serializeSpraying(values.sprayingForm,values.destinations,data):undefined;
        if(serializedSpraying)serializedSpraying.products=serializedSpraying.products.map((product,index)=>({...product,...(values.sprayingForm.products[index].unitCost?{unitCost:Number(values.sprayingForm.products[index].unitCost),currency:"EUR"}:{})}));
        const operationPayload={...payload,...(serializedSpraying?{spraying:serializedSpraying}:{})};
        const response = await fetch("/api/farm/operations", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(operationPayload) });
        if (!response.ok)
            throw new Error();
        await onSaved();
    }
    catch {
        setFailed(true);
        setSaving(false);
    } }
    return <div className="modal-backdrop">
      <section className="holding-dialog field-dialog">
        <header>
          <h2>{values.type === "crop_installation" ? t.installCrop : t.add}</h2>
          <button onClick={onClose} aria-label={t.cancel}>
            ×
          </button>
        </header>
        <form className="holding-form operation-form" onSubmit={event => void submit(event)}>
          <div className="operation-destinations">
            {values.destinations.map((destination, index) => {
            const compatible = data.plantations.filter(item => item.fieldId === destination.fieldId && item.status === "active");
            return <fieldset key={index}>
                  <label>
                    <span>{t.field}</span>
                    <select value={destination.fieldId} onChange={event => setDestination(index, "fieldId", event.target.value)}>
                      {data.fields.map(item => <option key={item.id} value={item.id}>
                          {item.name}
                        </option>)}
                    </select>
                  </label>
                  <label>
                    <span>{t.plantation}</span>
                    <select disabled={values.type === "crop_installation"} value={destination.plantationId} onChange={event => setDestination(index, "plantationId", event.target.value)}>
                      <option value="">{t.noPlantation}</option>
                      {compatible.map(item => <option key={item.id} value={item.id}>
                          {item.name}
                        </option>)}
                    </select>
                  </label>
                  <Input label={`${t.area} (ha)`} type="number" value={destination.areaHa} onChange={value => setDestination(index, "areaHa", value)}/>
                  <Input label="%" type="number" value={destination.percentage} onChange={value => setDestination(index, "percentage", value)}/>
                  {values.destinations.length > 1 && <button type="button" className="danger-link" aria-label={t.cancel} onClick={() => set("destinations", values.destinations.filter((_, rowIndex) => rowIndex !== index))}>
                      ×
                    </button>}
                </fieldset>;
        })}
            {values.type !== "crop_installation" && <button type="button" className="subtle-button" onClick={() => set("destinations", [...values.destinations, { ...blank(), percentage: "" }])}>
                ＋ {t.field}
              </button>}
          </div>
          <label>
            <span>{t.type}</span>
            <select value={values.type} onChange={event => { const type = event.target.value; setValues(current => ({ ...current, type, ...(type === "crop_installation" ? { destinations: [{ ...current.destinations[0], plantationId: "", percentage: "100" }] } : {}),...(type==="spraying"?{sprayingForm:{...current.sprayingForm,method:"spray" as const}}:type==="product_application"&&current.sprayingForm.method==="spray"?{sprayingForm:{...current.sprayingForm,method:"granules" as const}}:{}) })); }}>
              {(["soil_preparation", "crop_installation", "cultural_work", "fertilization", "spraying", "product_application", "irrigation", "fertigation", "monitoring", "harvest", "other"] as OperationDto["type"][]).map(type => <option key={type} value={type}>
                  {typeLabel(t, type, st.productApplication)}
                </option>)}
            </select>
          </label>
          <Input label={t.performedAt} type="datetime-local" value={values.performedAt} onChange={value => set("performedAt", value)}/>
          {values.type === "soil_preparation" && <fieldset className="soil-preparation-fields">
              <legend>{t.soilActions}</legend>
              <div className="soil-action-grid">
                {soilPreparationActionIds.map(id => <label key={id}>
                    <input type="checkbox" checked={values.soilActions.includes(id)} onChange={() => toggleSoilAction(id)}/>
                    <span>{soilActionLabel(t, id)}</span>
                  </label>)}
                {customSoilActions.map(action => <label key={action}>
                    <input type="checkbox" checked={values.soilActions.includes(action)} onChange={() => toggleSoilAction(action)}/>
                    <span>{action}</span>
                  </label>)}
              </div>
              <Input label={t.customAction} required={false} value={values.customSoilAction} onChange={value => set("customSoilAction", value)}/>
              <div className="soil-detail-grid">
                <Input label={t.depthCm} required={false} type="number" value={values.depthCm} onChange={value => set("depthCm", value)}/>
                <Input label={t.passes} required={false} type="number" value={values.passes} onChange={value => set("passes", value)}/>
                <label>
                  <span>{t.soilCondition}</span>
                  <select value={values.soilCondition} onChange={event => set("soilCondition", event.target.value)}>
                    <option value="">—</option>
                    {(["dry", "moist", "wet"] as const).map(id => <option key={id} value={id}>
                        {t[id]}
                      </option>)}
                  </select>
                </label>
                <label>
                  <span>{t.residueDestination}</span>
                  <select value={values.residueDestination} onChange={event => set("residueDestination", event.target.value)}>
                    <option value="">—</option>
                    {(["left", "shredded", "incorporated", "removed", "burned", "other"] as const).map(id => <option key={id} value={id}>
                        {t[id]}
                      </option>)}
                  </select>
                </label>
              </div>
            </fieldset>}
          {values.type === "crop_installation" && <CropInstallationFields data={data} t={t} value={values.installation} set={setInstallation} toggleAction={id => setInstallation("preparatoryOperationIds", values.installation.preparatoryOperationIds.includes(id) ? values.installation.preparatoryOperationIds.filter(item => item !== id) : [...values.installation.preparatoryOperationIds, id])}/>}
          {values.type === "cultural_work" && <CulturalWorkFields data={data} t={t} value={values.cultural} set={setCultural}/>}
          {values.type === "soil_preparation" && <label>
              <input type="checkbox" checked={values.includeFertilization} onChange={event => set("includeFertilization", event.target.checked)}/>
              <span>{t.fertilizationDetails}</span>
            </label>}
          {(values.type === "fertilization" || values.type === "soil_preparation" && values.includeFertilization) && <FertilizationFields data={data} t={t} value={values.fertilizationForm} set={setFertilization} destinations={values.destinations} totalArea={values.destinations.reduce((sum, item) => sum + Number(item.areaHa || 0), 0)}/>}
          {(["spraying","product_application"] as string[]).includes(values.type) && <SprayingFields t={st} value={values.sprayingForm} set={setSpraying} workers={data.workers} isSpraying={values.type==="spraying"} destinations={values.destinations.map(destination=>({key:`${destination.fieldId}:${destination.plantationId}`,label:data.plantations.find(item=>item.id===destination.plantationId)?.name||data.fields.find(item=>item.id===destination.fieldId)?.name||destination.fieldId}))}/>}
          <Input label={t.duration} required={false} type="number" value={values.durationMinutes} onChange={value => set("durationMinutes", value)}/>
          <ResourceChecks title={t.workers} rows={data.workers.filter(item => item.status === "active")} selected={values.workerIds} toggle={id => toggle("workerIds", id)}/>
          <ResourceChecks title={t.equipment} rows={data.equipment.filter(item => item.status === "active")} selected={values.equipmentIds} toggle={id => toggle("equipmentIds", id)}/>
          <ResourceChecks title={t.contractors} rows={data.contractors.filter(item => item.status === "active")} selected={values.contractorIds} toggle={id => toggle("contractorIds", id)}/>
          <label>
            <span>{t.notes}</span>
            <textarea value={values.notes} onChange={event => set("notes", event.target.value)} maxLength={2000}/>
          </label>
          {failed && <p className="form-error">{t.saveError}</p>}
          <footer>
            <button type="button" className="subtle-button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="primary-action" disabled={saving || values.type === "soil_preparation" && !values.soilActions.length && !values.customSoilAction.trim() || values.type === "crop_installation" && (!values.installation.plantationName.trim() || !values.installation.cultureId || !values.installation.densityPlantsHa) || values.type === "cultural_work" && !values.cultural.actions.length && !values.cultural.customAction.trim() || (values.type === "fertilization" || values.type === "soil_preparation" && values.includeFertilization) && values.fertilizationForm.products.some(product => !product.name.trim() || !product.dosePerHa || !product.totalQuantity)}>
              {t.save}
            </button>
          </footer>
        </form>
      </section>
    </div>;
}
function FertilizationFields({ data, t, value, set, destinations, totalArea }: {
    data: Data;
    t: OperationCopy;
    value: FertilizationForm;
    set: <K extends keyof FertilizationForm>(key: K, value: FertilizationForm[K]) => void;
    destinations: DestinationForm[];
    totalArea: number;
}) {
    const update = (index: number, key: keyof FertilizerProductForm, next: string | boolean) => set("products", value.products.map((product, itemIndex) => { if (itemIndex !== index)
        return product; const changed = { ...product, [key]: next }; if (key === "dosePerHa" && typeof next === "string") {
        changed.quantitySource = "dose_per_ha";
        changed.totalQuantity = totalArea && next ? String(Number(next) * totalArea) : "";
    } if (key === "totalQuantity" && typeof next === "string") {
        changed.quantitySource = "total";
        changed.dosePerHa = totalArea && next ? String(Number(next) / totalArea) : "";
    } return changed; }));
    const updateDestinationDose = (index: number, key: string, dose: string) => set("products", value.products.map((product, itemIndex) => itemIndex === index ? { ...product, destinationDoses: { ...product.destinationDoses, [key]: dose } } : product));
    return <fieldset className="fertilization-fields">
      <legend>{t.fertilizationDetails}</legend>
      <div className="fertilization-grid">
        <label>
          <span>{t.applicationMode}</span>
          <select value={value.mode} onChange={event => { const mode = event.target.value as FertilizationForm["mode"]; set("mode", mode); if (mode !== "other")
        set("customMode", ""); }}>
            {(["base", "top_dressing", "foliar", "amendment", "organic_matter", "cover_crop_incorporation", "other"] as const).map(mode => <option key={mode} value={mode}>
                {t[`fertilizationMode_${mode}`]}
              </option>)}
          </select>
        </label>
        {value.mode === "other" && <Input label={t.customMethod} value={value.customMode} onChange={next => set("customMode", next)}/>}
      </div>
      <div className="fertilizer-products">
        <header>
          <b>{t.products}</b>
          <button type="button" className="subtle-button" onClick={() => set("products", [...value.products, { name: "", category: "fertilizer", quantitySource: "dose_per_ha", dosePerHa: "", totalQuantity: "", unit: "kg", densityKgL: "", lotNumber: "", compositionKnown: true, dryMatterPercent: "", nTotal: "", nNitrate: "", nAmmonium: "", nUreic: "", nOrganic: "", p2o5: "", k2o: "", cao: "", mgo: "", so3: "", organicMatter: "", carbon: "", micronutrients: "", destinationDoses: {} }])}>
            ＋ {t.products}
          </button>
        </header>
        {value.products.map((product, index) => <fieldset key={index}>
            <Input label={t.productName} value={product.name} onChange={next => update(index, "name", next)}/>
            <label>
              <span>{t.productCategory}</span>
              <select value={product.category} onChange={event => update(index, "category", event.target.value)}>
                <option value="fertilizer">{t.productFertilizer}</option>
                <option value="amendment">{t.productAmendment}</option>
                <option value="organic">{t.productOrganic}</option>
              </select>
            </label>
            <Input label={t.dosePerHa} type="number" value={product.dosePerHa} onChange={next => update(index, "dosePerHa", next)}/>
            <Input label={t.totalQuantity} type="number" value={product.totalQuantity} onChange={next => update(index, "totalQuantity", next)}/>
            {destinations.length > 1 && <fieldset className="destination-doses">
                <legend>{t.dosePerHa}</legend>
                {destinations.map(destination => { const key = `${destination.fieldId}:${destination.plantationId}`; const field = data.fields.find(item => item.id === destination.fieldId); return <Input key={key} label={field?.name || t.field} type="number" value={product.destinationDoses[key] ?? product.dosePerHa} onChange={next => updateDestinationDose(index, key, next)}/>; })}
              </fieldset>}
            <label>
              <span>{t.unit}</span>
              <select value={product.unit} onChange={event => update(index, "unit", event.target.value)}>
                <option value="kg">kg</option>
                <option value="l">L</option>
                <option value="t">t</option>
              </select>
            </label>
            {product.unit === "l" && <Input label={t.densityKgL} type="number" required={false} value={product.densityKgL} onChange={next => update(index, "densityKgL", next)}/>}
            <Input label={t.lotNumber} required={false} value={product.lotNumber} onChange={next => update(index, "lotNumber", next)}/>
            <label>
              <input type="checkbox" checked={product.compositionKnown} onChange={event => update(index, "compositionKnown", event.target.checked)}/>
              <span>{t.knownComposition}</span>
            </label>
            {product.compositionKnown && <div className="nutrient-grid">
                {product.category === "organic" && <Input label={t.dryMatterPercent} type="number" value={product.dryMatterPercent} onChange={next => update(index, "dryMatterPercent", next)}/>}
                {([["nTotal", t.nTotal], ["nNitrate", "N-NO₃"], ["nAmmonium", "N-NH₄"], ["nUreic", "N-CO(NH₂)₂"], ["nOrganic", "N-org"], ["p2o5", t.p2o5], ["k2o", t.k2o], ["cao", t.cao], ["mgo", t.mgo], ["so3", t.so3], ["organicMatter", t.productOrganic], ["carbon", "C"]] as const).map(([key, label]) => <Input key={key} label={`${label} (%)`} type="number" required={false} value={product[key]} onChange={next => update(index, key, next)}/>)}
                <Input label={`${t.knownComposition} · Fe=…; Zn=… (%)`} required={false} value={product.micronutrients} onChange={next => update(index, "micronutrients", next)}/>
              </div>}
            {!product.compositionKnown && <p>{t.unknownCompositionNotice}</p>}
            {value.products.length > 1 && <button type="button" className="danger-link" onClick={() => set("products", value.products.filter((_, itemIndex) => itemIndex !== index))}>
                ×
              </button>}
          </fieldset>)}
      </div>
    </fieldset>;
}
function CulturalWorkFields({ data, t, value, set }: {
    data: Data;
    t: OperationCopy;
    value: CulturalForm;
    set: <K extends keyof CulturalForm>(key: K, value: CulturalForm[K]) => void;
}) {
    const customActions = [...new Set(data.operations.flatMap(item => item.culturalWork?.actions || []).filter(action => !culturalWorkActionIds.includes(action as (typeof culturalWorkActionIds)[number])))].sort((a, b) => a.localeCompare(b));
    const customMethods = [...new Set(data.operations.map(item => item.culturalWork?.customMethod).filter((item): item is string => Boolean(item)))];
    const toggleAction = (id: string) => set("actions", value.actions.includes(id) ? value.actions.filter(item => item !== id) : [...value.actions, id]);
    const updateMaterial = (index: number, key: keyof CulturalMaterialForm, next: string) => set("materials", value.materials.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: next } : item));
    const replanting = value.actions.includes("replanting");
    return <fieldset className="cultural-work-fields">
      <legend>{t.culturalWork}</legend>
      <div className="soil-action-grid">
        {culturalWorkActionIds.map(id => <label key={id}>
            <input type="checkbox" checked={value.actions.includes(id)} onChange={() => toggleAction(id)}/>
            <span>{culturalActionLabel(t, id)}</span>
          </label>)}
        {customActions.map(action => <label key={action}>
            <input type="checkbox" checked={value.actions.includes(action)} onChange={() => toggleAction(action)}/>
            <span>{action}</span>
          </label>)}
      </div>
      <Input label={t.customAction} required={false} value={value.customAction} onChange={next => set("customAction", next)}/>
      <div className="cultural-detail-grid">
        <label>
          <span>{t.executionMethod}</span>
          <select value={value.method} onChange={event => { const method = event.target.value as CulturalForm["method"]; set("method", method); if (method !== "other")
        set("customMethod", ""); }}>
            <option value="manual">{t.manual}</option>
            <option value="mechanical">{t.mechanical}</option>
            <option value="thermal">{t.thermal}</option>
            <option value="other">{t.other}</option>
          </select>
        </label>
        {value.method === "other" && <label>
            <span>{t.customMethod}</span>
            <input required list="cultural-methods" value={value.customMethod} onChange={event => set("customMethod", event.target.value)}/>
            <datalist id="cultural-methods">
              {customMethods.map(method => <option key={method} value={method}/>)}
            </datalist>
          </label>}
        <label>
          <span>{t.intensity}</span>
          <select value={value.intensity} onChange={event => set("intensity", event.target.value as CulturalForm["intensity"])}>
            <option value="">—</option>
            <option value="light">{t.light}</option>
            <option value="medium">{t.medium}</option>
            <option value="severe">{t.severe}</option>
          </select>
        </label>
        <Input label={t.intensityPercentage} type="number" required={false} value={value.intensityPercentage} onChange={next => set("intensityPercentage", next)}/>
        <label>
          <span>{t.biomassDestination}</span>
          <select value={value.biomassDestination} onChange={event => set("biomassDestination", event.target.value)}>
            <option value="">—</option>
            {(["left", "shredded", "incorporated", "removed", "burned", "other"] as const).map(id => <option key={id} value={id}>
                {t[id]}
              </option>)}
          </select>
        </label>
        <Input label={t.plantPercentage} type="number" required={false} value={value.plantPercentage} onChange={next => set("plantPercentage", next)}/>
        <Input label={t.plantCount} type="number" required={false} value={value.plantCount} onChange={next => set("plantCount", next)}/>
      </div>
      {replanting && <fieldset className="replanting-fields">
          <legend>{t.replantingDetails}</legend>
          <Input label={t.originalDensity} type="number" value={value.originalDensityPlantsHa} onChange={next => set("originalDensityPlantsHa", next)}/>
          <Input label={t.plantsReplaced} type="number" value={value.plantsReplaced} onChange={next => set("plantsReplaced", next)}/>
          <Input label={t.plantsPlaced} type="number" value={value.plantsPlaced} onChange={next => set("plantsPlaced", next)}/>
          <Input label={t.estimatedCurrentDensity} type="number" required={false} value={value.estimatedCurrentDensityPlantsHa} onChange={next => set("estimatedCurrentDensityPlantsHa", next)}/>
        </fieldset>}
      <div className="material-lots">
        <header>
          <b>{t.materials}</b>
          <button type="button" className="subtle-button" onClick={() => set("materials", [...value.materials, { name: "", quantity: "", unit: "unit", lotNumber: "" }])}>
            ＋ {t.materials}
          </button>
        </header>
        {value.materials.map((item, index) => <fieldset key={index}>
            <Input label={t.materialName} value={item.name} onChange={next => updateMaterial(index, "name", next)}/>
            <Input label={t.quantity} type="number" value={item.quantity} onChange={next => updateMaterial(index, "quantity", next)}/>
            <Input label={t.unit} value={item.unit} onChange={next => updateMaterial(index, "unit", next)}/>
            <Input label={t.lotNumber} required={false} value={item.lotNumber} onChange={next => updateMaterial(index, "lotNumber", next)}/>
            <button type="button" className="danger-link" aria-label={t.cancel} onClick={() => set("materials", value.materials.filter((_, itemIndex) => itemIndex !== index))}>
              ×
            </button>
          </fieldset>)}
      </div>
    </fieldset>;
}
function CropInstallationFields({ data, t, value, set, toggleAction }: {
    data: Data;
    t: OperationCopy;
    value: InstallationForm;
    set: <K extends keyof InstallationForm>(key: K, value: InstallationForm[K]) => void;
    toggleAction: (id: string) => void;
}) {
    const compatibleVarieties = data.varieties.filter(item => item.cultureId === value.cultureId);
    const preparationOperations = data.operations.filter(item => item.type === "soil_preparation" && item.status === "performed");
    const customMethods = [...new Set(data.operations.map(item => item.cropInstallation?.customMethod).filter((item): item is string => Boolean(item)))];
    const toggleVariety = (id: string) => { if (value.varietyIds.includes(id)) {
        set("varietyIds", value.varietyIds.filter(item => item !== id));
        const densities = { ...value.varietyDensities };
        delete densities[id];
        set("varietyDensities", densities);
    }
    else
        set("varietyIds", [...value.varietyIds, id]); };
    const updateLot = (index: number, key: keyof MaterialLotForm, next: string) => set("materialLots", value.materialLots.map((lot, lotIndex) => lotIndex === index ? { ...lot, [key]: next } : lot));
    const addLot = () => set("materialLots", [...value.materialLots, { varietyId: "", lotNumber: "", quantity: "", unit: "kg", origin: "", supplier: "" }]);
    return <fieldset className="crop-installation-fields">
      <legend>{t.installCrop}</legend>
      <p>{t.createPlantationNotice}</p>
      <div className="installation-grid">
        <Input label={t.plantationName} value={value.plantationName} onChange={next => set("plantationName", next)}/>
        <label>
          <span>{t.culture}</span>
          <select required value={value.cultureId} onChange={event => { set("cultureId", event.target.value); set("varietyIds", []); set("varietyDensities", {}); }}>
            {data.cultures.map(item => <option key={item.id} value={item.id}>
                {item.sourceName}
              </option>)}
          </select>
        </label>
        <label>
          <span>{t.cropKind}</span>
          <select value={value.kind} onChange={event => set("kind", event.target.value as InstallationForm["kind"])}>
            <option value="temporary">{t.temporary}</option>
            <option value="permanent">{t.permanent}</option>
          </select>
        </label>
        <label>
          <span>{t.installationMethod}</span>
          <select value={value.method} onChange={event => { const method = event.target.value as InstallationForm["method"]; set("method", method); if (method !== "other")
        set("customMethod", ""); }}>
            <option value="sowing">{t.sowing}</option>
            <option value="transplanting">{t.transplanting}</option>
            <option value="planting">{t.planting}</option>
            <option value="other">{t.other}</option>
          </select>
        </label>
        {value.method === "other" && <label>
            <span>{t.customMethod}</span>
            <input required list="installation-methods" value={value.customMethod} onChange={event => set("customMethod", event.target.value)}/>
            <datalist id="installation-methods">
              {customMethods.map(method => <option key={method} value={method}/>)}
            </datalist>
          </label>}
        <Input label={t.densityPlantsHa} type="number" value={value.densityPlantsHa} onChange={next => set("densityPlantsHa", next)}/>
        <Input label={t.rowSpacingCm} type="number" required={false} value={value.rowSpacingCm} onChange={next => set("rowSpacingCm", next)}/>
        <Input label={t.plantSpacingCm} type="number" required={false} value={value.plantSpacingCm} onChange={next => set("plantSpacingCm", next)}/>
        <Input label={t.installationEndDate} type="date" required={false} value={value.endedOn} onChange={next => set("endedOn", next)}/>
        <Input label={t.predecessor} required={false} value={value.predecessor} onChange={next => set("predecessor", next)}/>
      </div>
      {compatibleVarieties.length > 0 && <fieldset className="variety-density-list">
          <legend>{t.varieties}</legend>
          {compatibleVarieties.map(item => <div key={item.id}>
              <label>
                <input type="checkbox" checked={value.varietyIds.includes(item.id)} onChange={() => toggleVariety(item.id)}/>
                <span>{item.name}</span>
              </label>
              {value.varietyIds.includes(item.id) && <Input label={t.densityPlantsHa} type="number" required={false} value={value.varietyDensities[item.id] || ""} onChange={density => set("varietyDensities", { ...value.varietyDensities, [item.id]: density })}/>}
            </div>)}
        </fieldset>}
      {preparationOperations.length > 0 && <ResourceChecks title={t.preparatoryOperations} rows={preparationOperations.map(item => ({ id: item.id, name: `${item.code} · ${new Date(item.performedAt).toLocaleDateString()}` }))} selected={value.preparatoryOperationIds} toggle={toggleAction}/>}
      <div className="material-lots">
        <header>
          <b>{t.materialLots}</b>
          <button type="button" className="subtle-button" onClick={addLot}>
            ＋ {t.addLot}
          </button>
        </header>
        {value.materialLots.map((lot, index) => <fieldset key={index}>
            {compatibleVarieties.length > 0 && <label>
                <span>{t.varieties}</span>
                <select value={lot.varietyId} onChange={event => updateLot(index, "varietyId", event.target.value)}>
                  <option value="">—</option>
                  {compatibleVarieties.filter(item => value.varietyIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>
                        {item.name}
                      </option>)}
                </select>
              </label>}
            <Input label={t.lotNumber} value={lot.lotNumber} onChange={next => updateLot(index, "lotNumber", next)}/>
            <Input label={t.quantity} type="number" value={lot.quantity} onChange={next => updateLot(index, "quantity", next)}/>
            <Input label={t.unit} value={lot.unit} onChange={next => updateLot(index, "unit", next)}/>
            <Input label={t.origin} required={false} value={lot.origin} onChange={next => updateLot(index, "origin", next)}/>
            <Input label={t.supplier} required={false} value={lot.supplier} onChange={next => updateLot(index, "supplier", next)}/>
            <button type="button" className="danger-link" aria-label={t.cancel} onClick={() => set("materialLots", value.materialLots.filter((_, lotIndex) => lotIndex !== index))}>
              ×
            </button>
          </fieldset>)}
      </div>
    </fieldset>;
}
function culturalActionLabel(t: OperationCopy, id: (typeof culturalWorkActionIds)[number]) { return { training_pruning: t.actionTrainingPruning, production_pruning: t.actionProductionPruning, renewal_pruning: t.actionRenewalPruning, sanitary_pruning: t.actionSanitaryPruning, green_pruning: t.actionGreenPruning, topping: t.actionTopping, defoliation: t.actionDefoliation, sucker_removal: t.actionSuckerRemoval, manual_weeding: t.actionManualWeeding, mechanical_weeding: t.actionMechanicalWeeding, thermal_weeding: t.actionThermalWeeding, plant_thinning: t.actionPlantThinning, flower_thinning: t.actionFlowerThinning, fruit_thinning: t.actionFruitThinning, mowing: t.actionMowing, cover_crop_cutting: t.actionCoverCropCutting, staking: t.actionStaking, tying: t.actionTying, trellis_maintenance: t.actionTrellisMaintenance, manual_pollination: t.actionManualPollination, cleaning: t.actionCleaning, residue_removal: t.actionResidueRemoval, mulching: t.actionMulching, replanting: t.actionReplanting }[id]; }
function soilActionLabel(t: OperationCopy, id: (typeof soilPreparationActionIds)[number]) { return { subsoiling: t.actionSubsoiling, ploughing: t.actionPloughing, scarifying: t.actionScarifying, harrowing: t.actionHarrowing, rotary_tilling: t.actionRotaryTilling, levelling: t.actionLevelling, bed_forming: t.actionBedForming, furrow_opening: t.actionFurrowOpening, stone_removal: t.actionStoneRemoval, residue_shredding: t.actionResidueShredding, residue_incorporation: t.actionResidueIncorporation, solarisation: t.actionSolarisation }[id]; }
function ResourceChecks({ title, rows, selected, toggle }: {
    title: string;
    rows: Array<{
        id: string;
        name: string;
    }>;
    selected: string[];
    toggle: (id: string) => void;
}) {
    return rows.length ? <fieldset className="resource-checks">
      <legend>{title}</legend>
      {rows.map(item => <label key={item.id}>
          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)}/>
          <span>{item.name}</span>
        </label>)}
    </fieldset> : null;
}
function Input({ label, value, onChange, type = "text", required = true }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return <label>
      <span>{label}</span>
      <input required={required} type={type} step={type === "number" ? "0.0001" : undefined} value={value} onChange={event => onChange(event.target.value)}/>
    </label>;
}
function FertilizationSummary({ data, locale, t }: {
    data: Data;
    locale: string;
    t: OperationCopy;
}) {
    const [fieldId, setFieldId] = useState("");
    const [plantationId, setPlantationId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const fertilizations = useMemo(() => data.operations.filter(operation => operation.fertilization && (!from || operation.performedAt.slice(0, 10) >= from) && (!to || operation.performedAt.slice(0, 10) <= to) && (!fieldId || operation.destinations.some(destination => destination.fieldId === fieldId)) && (!plantationId || operation.destinations.some(destination => destination.plantationId === plantationId))), [data.operations, fieldId, plantationId, from, to]);
    const totals = useMemo(() => {
        const products = new Map<string, {
            name: string;
            unit: string;
            quantity: number;
        }>();
        const nutrients = new Map<string, number>();
        for (const operation of fertilizations)
            for (const product of operation.fertilization!.products) {
                const applications = product.destinationApplications.filter(application => (!fieldId || application.fieldId === fieldId) && (!plantationId || application.plantationId === plantationId));
                const selectedQuantity = fieldId || plantationId ? applications.reduce((sum, application) => sum + application.totalQuantity, 0) : product.totalQuantity;
                if (selectedQuantity <= 0)
                    continue;
                const productKey = `${product.name}:${product.unit}`;
                const current = products.get(productKey);
                products.set(productKey, { name: product.name, unit: product.unit, quantity: (current?.quantity || 0) + selectedQuantity });
                const share = selectedQuantity / product.totalQuantity;
                for (const [key, value] of Object.entries(product.nutrientTotalsKg))
                    nutrients.set(key, (nutrients.get(key) || 0) + value * share);
            }
        return { products: [...products.values()], nutrients: [...nutrients.entries()] };
    }, [fertilizations, fieldId, plantationId]);
    if (!data.operations.some(operation => operation.fertilization))
        return null;
    const nutrientLabel = (key: string) => key.startsWith("micro:") ? key.slice(6) : ({ nTotal: t.nTotal, p2o5: t.p2o5, k2o: t.k2o, cao: t.cao, mgo: t.mgo, so3: t.so3 }[key as "nTotal" | "p2o5" | "k2o" | "cao" | "mgo" | "so3"] || key);
    return <section className="panel fertilization-summary">
    <header><div><p>{t.fertilization}</p><h2>{t.fertilizationDetails}</h2></div><strong>{fertilizations.length.toLocaleString(locale)}</strong></header>
    <div className="fertilization-filters">
      <label><span>{t.field}</span><select value={fieldId} onChange={event => { setFieldId(event.target.value); setPlantationId(""); }}><option value="">—</option>{data.fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
      <label><span>{t.plantation}</span><select value={plantationId} onChange={event => setPlantationId(event.target.value)}><option value="">—</option>{data.plantations.filter(plantation => !fieldId || plantation.fieldId === fieldId).map(plantation => <option key={plantation.id} value={plantation.id}>{plantation.name}</option>)}</select></label>
      <label><span>{t.performedAt}</span><input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)}/></label>
      <label><span>{t.performedAt}</span><input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)}/></label>
    </div>
    <div className="fertilization-totals">
      <article><h3>{t.products}</h3>{totals.products.length ? totals.products.map(product => <p key={`${product.name}:${product.unit}`}><span>{product.name}</span><b>{product.quantity.toLocaleString(locale, { maximumFractionDigits: 3 })} {product.unit}</b></p>) : <p>{t.empty}</p>}</article>
      <article><h3>{t.knownComposition}</h3>{totals.nutrients.length ? totals.nutrients.sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => <p key={key}><span>{nutrientLabel(key)}</span><b>{value.toLocaleString(locale, { maximumFractionDigits: 3 })} kg</b></p>) : <p>{t.unknownCompositionNotice}</p>}</article>
    </div>
  </section>;
}
