import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { FieldDto } from "@shared/fields";
import type { PlantationDto } from "@shared/crop-lifecycle";
import type { CertificateDto, ContractorDto, EquipmentDto, WorkerDto } from "@shared/resources";
import { isValidApplicator } from "@shared/resources";
import type { OperationCatalogItemDto, OperationResourceAssignment } from "@shared/operation-extensions";
import { culturalWorkActionIds, soilPreparationActionIds, type OperationDto } from "@shared/operations";
import type { CultureCatalogEntry, VarietyDto } from "@shared/crops";
import { useI18n } from "../../i18n";
import { useAuth } from "../../auth";
import { AccessibleDialog, DialogError } from "../../components/AccessibleDialog";
import { operationCopies, type OperationCopy } from "./operation-locales.generated";
import "./operations.css";
import "./cultural-work.css";
import "./fertilization.css";
import SprayingFields, { blankSpraying, type SprayingForm } from "./SprayingFields";
import { sprayingCopies } from "./spraying-locales.generated";
import { resourceCopies } from "../resources/resource-locales.generated";
import { operationExtensionCopies, operationExtensionMessage, type OperationExtensionCopy } from "./operation-extension-locales";
type Data = {
    operations: OperationDto[];
    fields: FieldDto[];
    plantations: PlantationDto[];
    workers: WorkerDto[];
    equipment: EquipmentDto[];
    contractors: ContractorDto[];
    certificates: CertificateDto[];
    catalog: OperationCatalogItemDto[];
    soilSamples: SoilSample[];
    laboratoryResults: LaboratoryResult[];
    cultures: readonly CultureCatalogEntry[];
    varieties: VarietyDto[];
};
type SoilSample = {
    id: string;
    sampledOn: string;
    type: string;
    fieldIds: string[];
};
type LaboratoryResult = {
    id: string;
    sampleId: string;
    resultedOn: string;
    validUntil?: string | null;
    laboratory: string;
    bulletinNumber: string;
    results: Array<{
        parameter: string;
        value: number;
        unit: string;
    }>;
};
type ResourceAssignmentForm = OperationResourceAssignment & {
    totalHoursText: string;
    override: boolean;
    destinationHours: Record<string, string>;
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
const empty: Data = { operations: [], fields: [], plantations: [], workers: [], equipment: [], contractors: [], certificates: [], catalog: [], soilSamples: [], laboratoryResults: [], cultures: [], varieties: [] };
export default function OperationsModule() {
    const { locale } = useI18n();
    const t = operationCopies[locale];
    const x = operationExtensionCopies[locale];
    const { session } = useAuth();
    const permissions = session?.access.applicationMembership.permissions || [];
    const canWrite = Boolean(session?.access.access.writeAllowed && (permissions.includes("*") || permissions.includes("operations.manage") || permissions.includes("operations.create")));
    const [data, setData] = useState(empty);
    const launch = useMemo(() => { const query = new URLSearchParams(window.location.search); return { open: query.get("action") === "register-operation", fieldId: query.get("fieldId") || "", plantationId: query.get("plantationId") || "", type: query.get("operationType") || "" }; }, []);
    const [initialContext, setInitialContext] = useState(launch);
    const [adding, setAdding] = useState(launch.open);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [voiding, setVoiding] = useState<OperationDto | null>(null);
    const loadSequence = useRef(0);
    const load = useCallback(async () => {
        const sequence = ++loadSequence.current;
        setLoading(true);
        setFailed(false);
        try {
            const responses = await Promise.all(["/api/farm/operations", "/api/farm/fields", "/api/farm/crop-lifecycle", "/api/farm/resources", "/api/farm/crop-catalog", "/api/farm/varieties", "/api/farm/operation-catalog", "/api/farm/agronomy"].map(url => fetch(url, { credentials: "include" })));
            if (responses.some(response => !response.ok))
                throw new Error();
            const [operations, fields, lifecycle, resources, cultures, varieties, catalog, agronomy] = await Promise.all(responses.map(response => response.json()));
            if (sequence === loadSequence.current)
                setData({ operations: operations.data, fields: fields.data, plantations: lifecycle.data.plantations, workers: resources.data.workers, equipment: resources.data.equipment, contractors: resources.data.contractors, certificates: resources.data.certificates, catalog: catalog.data, soilSamples: agronomy.data.samples || [], laboratoryResults: agronomy.data.laboratoryResults || [], cultures: cultures.data, varieties: varieties.data });
        }
        catch {
            if (sequence === loadSequence.current)
                setFailed(true);
        }
        finally {
            if (sequence === loadSequence.current)
                setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); return () => { loadSequence.current += 1; }; }, [load]);
    useEffect(() => {
        function openFromWorkspace() {
            const query = new URLSearchParams(window.location.search);
            setInitialContext({ open: true, fieldId: query.get("fieldId") || "", plantationId: query.get("plantationId") || "", type: query.get("operationType") || "" });
            setAdding(true);
        }
        window.addEventListener("gerofarm:register-operation", openFromWorkspace);
        return () => window.removeEventListener("gerofarm:register-operation", openFromWorkspace);
    }, []);
    function closeOperationDialog() {
        setAdding(false);
        const query = new URLSearchParams(window.location.search);
        for (const key of ["action", "fieldId", "plantationId", "operationType"]) query.delete(key);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${query.size ? `?${query}` : ""}`);
    }
    const fields = useMemo(() => new Map(data.fields.map(item => [item.id, item.name])), [data.fields]);
    const plantations = useMemo(() => new Map(data.plantations.map(item => [item.id, item.name])), [data.plantations]);
    return <>
      <section className="page-heading">
        <div>
          <p>{t.kicker}</p>
          <h1>{t.title}</h1>
          <span>{t.description}</span>
        </div>
        <div className="operation-heading-actions"><button className="subtle-button" onClick={() => setCatalogOpen(true)}>{x.catalog}</button><button className="primary-action" disabled={!canWrite || !data.fields.length} onClick={() => setAdding(true)}>
          ＋ {t.add}
        </button></div>
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
            {data.operations.map(operation => <article key={operation.id} className={operation.status === "voided" ? "voided" : ""}>
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
                </em><details><summary aria-label={`${operation.code} · ${x.details}`}>•••</summary><div className="operation-audit"><b>{operation.status === "voided" ? x.voided : t.performed}</b>{operation.status === "voided" && <><span>{operation.voidedAt ? new Date(operation.voidedAt).toLocaleString(locale) : "—"}</span><span>{operation.voidedBy || "—"}</span><p>{operation.voidReason}</p></>}{operation.soilAnalysisWarnings?.map(warning => <p className="operation-warning" key={warning.fieldId}>{fields.get(warning.fieldId)} · {x.noValidAnalysis}</p>)}{operation.soilAnalysisSnapshots?.map(snapshot => <article className="soil-snapshot" key={`${snapshot.fieldId}:${snapshot.resultId}`}><b>{fields.get(snapshot.fieldId)}</b><span>{snapshot.laboratory} · {snapshot.bulletinNumber}</span><small>{formatDate(snapshot.sampledOn, locale)} → {formatDate(snapshot.resultedOn, locale)}{snapshot.validUntil ? ` · ${formatDate(snapshot.validUntil, locale)}` : ""}</small></article>)}{operation.resourceAllocations && <ResourceAudit operation={operation} data={data} locale={locale}/>} {operation.status === "performed" && operation.type !== "irrigation" && <button className="danger-link" disabled={!canWrite} onClick={() => setVoiding(operation)}>{operationExtensionMessage(x.voidOperation, { code: operation.code })}</button>}</div></details>
              </article>)}
          </div> : <div className="module-state">
            <p>{t.empty}</p>
          </div>}
      </section>
      {adding && !loading && !failed && (
        <OperationDialog data={data} t={t} initialContext={initialContext} onClose={closeOperationDialog} onSaved={async () => { closeOperationDialog(); await load(); }}/>
      )}
      {catalogOpen && (
        <OperationCatalogDialog items={data.catalog} canWrite={canWrite} onClose={() => setCatalogOpen(false)} onChanged={load}/>
      )}
      {voiding && <VoidOperationDialog operation={voiding} onClose={() => setVoiding(null)} onSaved={async () => { setVoiding(null); await load(); }}/>}
    </>;
}
const typeLabel = (t: OperationCopy, type: OperationDto["type"], productApplication = "Product application") => ({ soil_preparation: t.soilPreparation, crop_installation: t.cropInstallation, cultural_work: t.culturalWork, fertilization: t.fertilization, spraying: t.spraying, product_application: productApplication, irrigation: t.irrigation, fertigation: t.fertigation, monitoring: t.monitoring, harvest: t.harvest, other: t.other })[type];
function serializeSpraying(form: SprayingForm, destinations: DestinationForm[], data: Data) { const optionalNumber = (value: string) => value ? Number(value) : undefined; return { method: form.method, ...(form.customMethod ? { customMethod: form.customMethod } : {}), ...(form.method === "spray" ? { sprayVolumeLHa: Number(form.sprayVolumeLHa) } : {}), ...(form.legalApplicatorWorkerId ? { legalApplicatorWorkerId: form.legalApplicatorWorkerId } : {}), auxiliaryWorkerIds: [], products: form.products.map(product => ({ name: product.name, category: product.category, unit: product.unit, quantitySource: product.quantitySource, ...(product.dosePerHa ? { dosePerHa: Number(product.dosePerHa) } : {}), ...(product.dosePerHl ? { dosePerHl: Number(product.dosePerHl) } : {}), ...(product.totalQuantity ? { totalQuantity: Number(product.totalQuantity) } : {}), ...(product.lotNumber ? { lotNumber: product.lotNumber } : {}), activeSubstances: product.activeSubstances.split(/[;,]/).map(value => value.trim()).filter(Boolean), ...(product.registrationNumber ? { registrationNumber: product.registrationNumber } : {}), ...(product.fracGroup ? { fracGroup: product.fracGroup } : {}), targets: product.targets.split(/[;,]/).map(value => value.trim()).filter(Boolean), authorizations: destinations.map(destination => { const key = `${destination.fieldId}:${destination.plantationId}`, plantation = data.plantations.find(item => item.id === destination.plantationId), field = data.fields.find(item => item.id === destination.fieldId); return { fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), ...(plantation ? { cultureId: plantation.cultureId } : {}), destinationLabel: plantation?.name || field?.name || destination.fieldId, authorized: product.authorized[key] ?? false, ...(product.authorizationReference[key] ? { authorizationReference: product.authorizationReference[key] } : {}), ...(product.authorizedUse[key] ? { authorizedUse: product.authorizedUse[key] } : {}), ...(product.validFrom[key] ? { validFrom: product.validFrom[key] } : {}), ...(product.validUntil[key] ? { validUntil: product.validUntil[key] } : {}), ...(product.safetyIntervalDays[key] ? { safetyIntervalDays: Number(product.safetyIntervalDays[key]) } : {}), ...(product.reentryHours[key] ? { reentryHours: Number(product.reentryHours[key]) } : {}) }; }), legalLimitExceeded: product.legalLimitExceeded, applicationLimitExceeded: product.applicationLimitExceeded, antiResistanceWarning: product.antiResistanceWarning, ...(product.compositionKnown ? { nutrientSnapshot: { compositionKnown: true, ...(product.densityKgL ? { densityKgL: Number(product.densityKgL) } : {}), composition: Object.fromEntries(product.composition.split(/[;,]/).map(item => item.split("=").map(part => part.trim())).filter(parts => parts.length === 2 && parts[0] && Number(parts[1]) >= 0).map(([key, value]) => [key, Number(value)])) } } : {}) })), weather: { source: form.weatherSource, ...(optionalNumber(form.temperatureC) !== undefined ? { temperatureC: optionalNumber(form.temperatureC) } : {}), ...(optionalNumber(form.relativeHumidityPercent) !== undefined ? { relativeHumidityPercent: optionalNumber(form.relativeHumidityPercent) } : {}), ...(optionalNumber(form.windSpeedKmh) !== undefined ? { windSpeedKmh: optionalNumber(form.windSpeedKmh) } : {}), ...(optionalNumber(form.windDirectionDegrees) !== undefined ? { windDirectionDegrees: optionalNumber(form.windDirectionDegrees) } : {}), ...(optionalNumber(form.precipitationMm) !== undefined ? { precipitationMm: optionalNumber(form.precipitationMm) } : {}), ...(form.condition ? { condition: form.condition } : {}), manuallyOverridden: form.manuallyOverridden }, equipmentInspectionValid: form.equipmentInspectionValid, equipmentCalibrationValid: form.equipmentCalibrationValid, warningsAccepted: form.warningsAccepted }; }
function OperationDialog({ data, t, initialContext, onClose, onSaved }: {
    data: Data;
    t: OperationCopy;
    initialContext: {
        fieldId: string;
        plantationId: string;
        type: string;
    };
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const { locale } = useI18n();
    const st = sprayingCopies[locale];
    const x = operationExtensionCopies[locale];
    const contextualField = data.fields.some(item => item.id === initialContext.fieldId) ? initialContext.fieldId : data.fields[0]?.id || "";
    const contextualPlantation = data.plantations.some(item => item.id === initialContext.plantationId && item.fieldId === contextualField) ? initialContext.plantationId : "";
    const blank = (): DestinationForm => ({ fieldId: contextualField, plantationId: contextualPlantation, areaHa: "", percentage: "100" });
    const blankInstallation = (): InstallationForm => ({ plantationName: "", cultureId: data.cultures[0]?.id || "", varietyIds: [], varietyDensities: {}, kind: "temporary", endedOn: "", method: "sowing", customMethod: "", densityPlantsHa: "", rowSpacingCm: "", plantSpacingCm: "", materialLots: [], predecessor: "", preparatoryOperationIds: [] });
    const blankCultural = (): CulturalForm => ({ actions: [], customAction: "", method: "manual", customMethod: "", intensity: "", intensityPercentage: "", biomassDestination: "", plantPercentage: "", plantCount: "", materials: [], originalDensityPlantsHa: "", plantsReplaced: "", plantsPlaced: "", estimatedCurrentDensityPlantsHa: "" });
    const blankFertilizer = (): FertilizerProductForm => ({ name: "", category: "fertilizer", quantitySource: "dose_per_ha", dosePerHa: "", totalQuantity: "", unit: "kg", densityKgL: "", lotNumber: "", compositionKnown: true, dryMatterPercent: "", nTotal: "", nNitrate: "", nAmmonium: "", nUreic: "", nOrganic: "", p2o5: "", k2o: "", cao: "", mgo: "", so3: "", organicMatter: "", carbon: "", micronutrients: "", destinationDoses: {} });
    const blankFertilization = (): FertilizationForm => ({ mode: "base", customMode: "", products: [blankFertilizer()] });
    const specialistTypes = ["soil_preparation", "crop_installation", "cultural_work", "fertilization", "spraying", "product_application"] as const;
    const initialType = specialistTypes.includes(initialContext.type as typeof specialistTypes[number]) ? initialContext.type : "";
    const [values, setValues] = useState({ destinations: [blank()], type: initialType, performedAt: new Date().toISOString().slice(0, 16), durationMinutes: "", notes: "", workerAssignments: [] as ResourceAssignmentForm[], equipmentAssignments: [] as ResourceAssignmentForm[], contractorAssignments: [] as ResourceAssignmentForm[], soilActions: [] as string[], customSoilAction: "", soilAnalysisResultIdsByField: {} as Record<string, string>, depthCm: "", passes: "", soilCondition: "", residueDestination: "", installation: blankInstallation(), cultural: blankCultural(), fertilizationForm: blankFertilization(), includeFertilization: false, sprayingForm: blankSpraying() });
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const customSoilActions = data.catalog.filter(item => item.kind === "soil_action" && item.status === "active").map(item => item.label);
    const set = (key: string, value: unknown) => setValues(current => ({ ...current, [key]: value }));
    const setInstallation = <K extends keyof InstallationForm,>(key: K, value: InstallationForm[K]) => setValues(current => ({ ...current, installation: { ...current.installation, [key]: value } }));
    const setCultural = <K extends keyof CulturalForm,>(key: K, value: CulturalForm[K]) => setValues(current => ({ ...current, cultural: { ...current.cultural, [key]: value } }));
    const setFertilization = <K extends keyof FertilizationForm,>(key: K, value: FertilizationForm[K]) => setValues(current => ({ ...current, fertilizationForm: { ...current.fertilizationForm, [key]: value } }));
    const setSpraying = <K extends keyof SprayingForm,>(key: K, value: SprayingForm[K]) => setValues(current => ({ ...current, sprayingForm: { ...current.sprayingForm, [key]: value } }));
    const setDestination = (index: number, key: keyof DestinationForm, value: string) => setValues(current => ({ ...current, destinations: current.destinations.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value, ...(key === "fieldId" ? { plantationId: "" } : {}) } : row) }));
    const setAssignments = (key: "workerAssignments" | "equipmentAssignments" | "contractorAssignments", next: ResourceAssignmentForm[]) => set(key, next);
    const toggleSoilAction = (id: string) => set("soilActions", values.soilActions.includes(id) ? values.soilActions.filter(item => item !== id) : [...values.soilActions, id]);
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setFailed(false);
        const { soilActions, customSoilAction, depthCm, passes, soilCondition, residueDestination, installation, cultural, fertilizationForm, includeFertilization, ...common } = values;
        const actions = [...soilActions, ...(customSoilAction.trim() ? [customSoilAction.trim()] : [])];
        const culturalActions = [...cultural.actions, ...(cultural.customAction.trim() ? [cultural.customAction.trim()] : [])];
        const payload = { ...common, destinations: values.destinations.map(destination => ({ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), areaHa: Number(destination.areaHa), percentage: Number(destination.percentage) })), performedAt: new Date(values.performedAt).toISOString(), ...(values.durationMinutes ? { durationMinutes: Number(values.durationMinutes) } : { durationMinutes: undefined }), ...(values.type === "soil_preparation" ? { soilPreparation: { actions, ...(depthCm ? { depthCm: Number(depthCm) } : {}), ...(passes ? { passes: Number(passes) } : {}), ...(soilCondition ? { soilCondition } : {}), ...(residueDestination ? { residueDestination } : {}) } } : {}), ...(values.type === "crop_installation" ? { cropInstallation: { plantationName: installation.plantationName, cultureId: installation.cultureId, varietyIds: installation.varietyIds, varietyDensities: Object.entries(installation.varietyDensities).filter(([, density]) => density).map(([varietyId, density]) => ({ varietyId, densityPlantsHa: Number(density) })), kind: installation.kind, ...(installation.endedOn ? { endedOn: installation.endedOn } : {}), method: installation.method, ...(installation.customMethod ? { customMethod: installation.customMethod } : {}), densityPlantsHa: Number(installation.densityPlantsHa), ...(installation.rowSpacingCm ? { rowSpacingCm: Number(installation.rowSpacingCm) } : {}), ...(installation.plantSpacingCm ? { plantSpacingCm: Number(installation.plantSpacingCm) } : {}), materialLots: installation.materialLots.filter(lot => lot.lotNumber.trim()).map(lot => ({ ...(lot.varietyId ? { varietyId: lot.varietyId } : {}), lotNumber: lot.lotNumber, quantity: Number(lot.quantity), unit: lot.unit, ...(lot.origin ? { origin: lot.origin } : {}), ...(lot.supplier ? { supplier: lot.supplier } : {}) })), ...(installation.predecessor ? { predecessor: installation.predecessor } : {}), preparatoryOperationIds: installation.preparatoryOperationIds } } : {}), ...(values.type === "cultural_work" ? { culturalWork: { actions: culturalActions, method: cultural.method, ...(cultural.customMethod ? { customMethod: cultural.customMethod } : {}), ...(cultural.intensity ? { intensity: cultural.intensity } : {}), ...(cultural.intensityPercentage ? { intensityPercentage: Number(cultural.intensityPercentage) } : {}), ...(cultural.biomassDestination ? { biomassDestination: cultural.biomassDestination } : {}), ...(cultural.plantPercentage ? { plantPercentage: Number(cultural.plantPercentage) } : {}), ...(cultural.plantCount ? { plantCount: Number(cultural.plantCount) } : {}), materials: cultural.materials.filter(item => item.name.trim()).map(item => ({ name: item.name, quantity: Number(item.quantity), unit: item.unit, ...(item.lotNumber ? { lotNumber: item.lotNumber } : {}) })), ...(culturalActions.includes("replanting") ? { replanting: { originalDensityPlantsHa: Number(cultural.originalDensityPlantsHa), plantsReplaced: Number(cultural.plantsReplaced), plantsPlaced: Number(cultural.plantsPlaced), ...(cultural.estimatedCurrentDensityPlantsHa ? { estimatedCurrentDensityPlantsHa: Number(cultural.estimatedCurrentDensityPlantsHa) } : {}) } } : {}) } } : {}), ...(values.type === "fertilization" || values.type === "soil_preparation" && includeFertilization ? { fertilization: { mode: fertilizationForm.mode, ...(fertilizationForm.customMode ? { customMode: fertilizationForm.customMode } : {}), products: fertilizationForm.products.map(product => ({ name: product.name, category: product.category, quantitySource: product.quantitySource, dosePerHa: Number(product.dosePerHa), totalQuantity: Number(product.totalQuantity), unit: product.unit, ...(product.densityKgL ? { densityKgL: Number(product.densityKgL) } : {}), ...(product.lotNumber ? { lotNumber: product.lotNumber } : {}), compositionKnown: product.compositionKnown, ...(product.dryMatterPercent ? { dryMatterPercent: Number(product.dryMatterPercent) } : {}), composition: product.compositionKnown ? { ...Object.fromEntries((["nTotal", "nNitrate", "nAmmonium", "nUreic", "nOrganic", "p2o5", "k2o", "cao", "mgo", "so3", "organicMatter", "carbon"] as const).flatMap(key => product[key] ? [[key, Number(product[key])]] : [])), micronutrients: Object.fromEntries(product.micronutrients.split(/[;,]/).map(item => item.split("=").map(part => part.trim())).filter(item => item.length === 2 && item[0] && Number(item[1]) >= 0).map(([name, value]) => [name, Number(value)])) } : { micronutrients: {} }, destinationApplications: values.destinations.flatMap(destination => { const key = `${destination.fieldId}:${destination.plantationId}`; const dose = product.destinationDoses[key]; return dose ? [{ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), dosePerHa: Number(dose), totalQuantity: Number(dose) * Number(destination.areaHa) }] : []; }), nutrientTotalsKg: {} })) } } : {}) };
        const serializeAssignments = (rows: ResourceAssignmentForm[]) => rows.map(row => ({ resourceId: row.resourceId, totalHours: Number(row.totalHoursText), destinationOverrides: row.override ? values.destinations.map(destination => ({ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), hours: Number(row.destinationHours[`${destination.fieldId}:${destination.plantationId}`] || 0) })) : [] }));
        try {
            const serializedSpraying = ["spraying", "product_application"].includes(values.type) ? serializeSpraying(values.sprayingForm, values.destinations, data) : undefined;
            if (serializedSpraying)
                serializedSpraying.products = serializedSpraying.products.map((product, index) => ({ ...product, ...(values.sprayingForm.products[index].unitCost ? { unitCost: Number(values.sprayingForm.products[index].unitCost), currency: "EUR" } : {}) }));
            const operationPayload = { ...payload, workerIds: [], equipmentIds: [], contractorIds: [], workerAssignments: serializeAssignments(values.workerAssignments), equipmentAssignments: serializeAssignments(values.equipmentAssignments), contractorAssignments: serializeAssignments(values.contractorAssignments), ...(payload.soilPreparation ? { soilPreparation: { ...payload.soilPreparation, soilAnalysisResultIdsByField: Object.entries(values.soilAnalysisResultIdsByField).filter(([, resultId]) => resultId).map(([fieldId, resultId]) => ({ fieldId, resultId })) } } : {}), ...(serializedSpraying ? { spraying: serializedSpraying } : {}) };
            const response = await fetch("/api/farm/operations", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(operationPayload) });
            if (!response.ok)
                throw new Error();
            await onSaved();
        }
        catch {
            setFailed(true);
            setSaving(false);
        }
    }
    const allAssignments = [...values.workerAssignments, ...values.equipmentAssignments, ...values.contractorAssignments];
    const invalidResourceTotals = allAssignments.some(row => !Number(row.totalHoursText) || row.override && Math.abs(Object.values(row.destinationHours).reduce((sum, value) => sum + Number(value || 0), 0) - Number(row.totalHoursText)) > .0001);
    const needsApplicator = ["spraying", "product_application"].includes(values.type) && values.sprayingForm.products.some(product => product.category === "phytopharmaceutical");
    const validApplicatorIds = new Set(data.workers.filter(worker => isValidApplicator(worker.id, values.performedAt.slice(0, 10), data.workers, data.certificates)).map(worker => worker.id));
    if (!values.type)
        return <AccessibleDialog key="specialist-picker" labelledBy="specialist-title" onClose={onClose} className="holding-dialog specialist-picker"><header><h2 id="specialist-title">{t.add}</h2><button type="button" data-dialog-close onClick={onClose} aria-label={t.cancel}>×</button></header><div className="specialist-grid">{specialistTypes.map(type => <button type="button" key={type} onClick={() => set("type", type)}>{typeLabel(t, type, st.productApplication)}</button>)}</div></AccessibleDialog>;
    return <AccessibleDialog key="operation-form" labelledBy="operation-dialog-title" onClose={onClose} busy={saving} className="holding-dialog field-dialog">
        <header>
          <h2 id="operation-dialog-title">{values.type === "crop_installation" ? t.installCrop : typeLabel(t, values.type as OperationDto["type"], st.productApplication)}</h2>
          <button type="button" data-dialog-close onClick={onClose} disabled={saving} aria-label={t.cancel}>
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
            <select value={values.type} onChange={event => { const type = event.target.value; setValues(current => ({ ...current, type, ...(type === "crop_installation" ? { destinations: [{ ...current.destinations[0], plantationId: "", percentage: "100" }] } : {}), ...(type === "spraying" ? { sprayingForm: { ...current.sprayingForm, method: "spray" as const } } : type === "product_application" && current.sprayingForm.method === "spray" ? { sprayingForm: { ...current.sprayingForm, method: "granules" as const } } : {}) })); }}>
              {specialistTypes.map(type => <option key={type} value={type}>
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
              <SoilAnalysisFields data={data} destinations={values.destinations} operationDate={values.performedAt.slice(0, 10)} selected={values.soilAnalysisResultIdsByField} setSelected={next => set("soilAnalysisResultIdsByField", next)} locale={locale} copy={x}/>
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
          {values.type === "crop_installation" && <CropInstallationFields data={data} t={t} locale={locale} value={values.installation} set={setInstallation} toggleAction={id => setInstallation("preparatoryOperationIds", values.installation.preparatoryOperationIds.includes(id) ? values.installation.preparatoryOperationIds.filter(item => item !== id) : [...values.installation.preparatoryOperationIds, id])}/>}
          {values.type === "cultural_work" && <CulturalWorkFields data={data} t={t} value={values.cultural} set={setCultural}/>}
          {values.type === "soil_preparation" && <label>
              <input type="checkbox" checked={values.includeFertilization} onChange={event => set("includeFertilization", event.target.checked)}/>
              <span>{t.fertilizationDetails}</span>
            </label>}
          {(values.type === "fertilization" || values.type === "soil_preparation" && values.includeFertilization) && <FertilizationFields data={data} t={t} value={values.fertilizationForm} set={setFertilization} destinations={values.destinations} totalArea={values.destinations.reduce((sum, item) => sum + Number(item.areaHa || 0), 0)}/>}
          {(["spraying", "product_application"] as string[]).includes(values.type) && <SprayingFields t={st} value={values.sprayingForm} set={setSpraying} workers={data.workers} validApplicatorIds={validApplicatorIds} isSpraying={values.type === "spraying"} destinations={values.destinations.map(destination => ({ key: `${destination.fieldId}:${destination.plantationId}`, label: data.plantations.find(item => item.id === destination.plantationId)?.name || data.fields.find(item => item.id === destination.fieldId)?.name || destination.fieldId }))}/>}
          <Input label={t.duration} required={false} type="number" value={values.durationMinutes} onChange={value => set("durationMinutes", value)}/>
          <ResourceAssignmentFields title={t.workers} rows={data.workers.filter(item => item.status === "active")} destinations={values.destinations} assignments={values.workerAssignments} setAssignments={next => setAssignments("workerAssignments", next)} data={data} locale={locale} copy={x}/>
          <ResourceAssignmentFields title={t.equipment} rows={data.equipment.filter(item => item.status === "active")} destinations={values.destinations} assignments={values.equipmentAssignments} setAssignments={next => setAssignments("equipmentAssignments", next)} data={data} locale={locale} copy={x}/>
          <ResourceAssignmentFields title={t.contractors} rows={data.contractors.filter(item => item.status === "active")} destinations={values.destinations} assignments={values.contractorAssignments} setAssignments={next => setAssignments("contractorAssignments", next)} data={data} locale={locale} copy={x}/>
          <label>
            <span>{t.notes}</span>
            <textarea value={values.notes} onChange={event => set("notes", event.target.value)} maxLength={2000}/>
          </label>
          {failed && <DialogError>{t.saveError}</DialogError>}
          <footer>
              <button type="button" className="subtle-button" onClick={onClose} disabled={saving}>
              {t.cancel}
            </button>
            <button className="primary-action" disabled={saving || invalidResourceTotals || needsApplicator && !validApplicatorIds.has(values.sprayingForm.legalApplicatorWorkerId) || values.type === "soil_preparation" && !values.soilActions.length && !values.customSoilAction.trim() || values.type === "crop_installation" && (!values.installation.plantationName.trim() || !values.installation.cultureId || !values.installation.densityPlantsHa) || values.type === "cultural_work" && !values.cultural.actions.length && !values.cultural.customAction.trim() || (values.type === "fertilization" || values.type === "soil_preparation" && values.includeFertilization) && values.fertilizationForm.products.some(product => !product.name.trim() || !product.dosePerHa || !product.totalQuantity)}>
              {t.save}
            </button>
          </footer>
        </form>
    </AccessibleDialog>;
}
function FertilizationFields({ data, t, value, set, destinations, totalArea }: {
    data: Data;
    t: OperationCopy;
    value: FertilizationForm;
    set: <K extends keyof FertilizationForm>(key: K, value: FertilizationForm[K]) => void;
    destinations: DestinationForm[];
    totalArea: number;
}) {
    const update = (index: number, key: keyof FertilizerProductForm, next: string | boolean) => set("products", value.products.map((product, itemIndex) => {
        if (itemIndex !== index)
            return product;
        const changed = { ...product, [key]: next };
        if (key === "dosePerHa" && typeof next === "string") {
            changed.quantitySource = "dose_per_ha";
            changed.totalQuantity = totalArea && next ? String(Number(next) * totalArea) : "";
        }
        if (key === "totalQuantity" && typeof next === "string") {
            changed.quantitySource = "total";
            changed.dosePerHa = totalArea && next ? String(Number(next) / totalArea) : "";
        }
        return changed;
    }));
    const updateDestinationDose = (index: number, key: string, dose: string) => set("products", value.products.map((product, itemIndex) => itemIndex === index ? { ...product, destinationDoses: { ...product.destinationDoses, [key]: dose } } : product));
    return <fieldset className="fertilization-fields">
      <legend>{t.fertilizationDetails}</legend>
      <div className="fertilization-grid">
        <label>
          <span>{t.applicationMode}</span>
          <select value={value.mode} onChange={event => {
            const mode = event.target.value as FertilizationForm["mode"];
            set("mode", mode);
            if (mode !== "other")
                set("customMode", "");
        }}>
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
    const customActions = data.catalog.filter(item => item.kind === "cultural_work_action" && item.status === "active").map(item => item.label);
    const customMethods = data.catalog.filter(item => item.kind === "cultural_work_method" && item.status === "active").map(item => item.label);
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
          <select value={value.method} onChange={event => {
            const method = event.target.value as CulturalForm["method"];
            set("method", method);
            if (method !== "other")
                set("customMethod", "");
        }}>
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
function CropInstallationFields({ data, t, locale, value, set, toggleAction }: {
    data: Data;
    t: OperationCopy;
    locale: string;
    value: InstallationForm;
    set: <K extends keyof InstallationForm>(key: K, value: InstallationForm[K]) => void;
    toggleAction: (id: string) => void;
}) {
    const compatibleVarieties = data.varieties.filter(item => item.cultureId === value.cultureId);
    const preparationOperations = data.operations.filter(item => item.type === "soil_preparation" && item.status === "performed");
    const customMethods = data.catalog.filter(item => item.kind === "crop_installation_method" && item.status === "active").map(item => item.label);
    const toggleVariety = (id: string) => {
        if (value.varietyIds.includes(id)) {
            set("varietyIds", value.varietyIds.filter(item => item !== id));
            const densities = { ...value.varietyDensities };
            delete densities[id];
            set("varietyDensities", densities);
        }
        else
            set("varietyIds", [...value.varietyIds, id]);
    };
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
          <select value={value.method} onChange={event => {
            const method = event.target.value as InstallationForm["method"];
            set("method", method);
            if (method !== "other")
                set("customMethod", "");
        }}>
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
      {preparationOperations.length > 0 && <ResourceChecks title={t.preparatoryOperations} rows={preparationOperations.map(item => ({ id: item.id, name: `${item.code} · ${formatDate(item.performedAt.slice(0, 10), locale)}` }))} selected={value.preparatoryOperationIds} toggle={toggleAction}/>}
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
function SoilAnalysisFields({ data, destinations, operationDate, selected, setSelected, locale, copy }: { data: Data; destinations: DestinationForm[]; operationDate: string; selected: Record<string, string>; setSelected: (next: Record<string, string>) => void; locale: string; copy: OperationExtensionCopy }) {
    const fieldIds = [...new Set(destinations.map(row => row.fieldId).filter(Boolean))];
    const candidates = (fieldId: string) => data.laboratoryResults.filter(result => { const sample = data.soilSamples.find(row => row.id === result.sampleId); return sample?.type === "soil" && sample.fieldIds.includes(fieldId) && sample.sampledOn <= operationDate && result.resultedOn <= operationDate && (!result.validUntil || result.validUntil >= operationDate); }).sort((left, right) => right.resultedOn.localeCompare(left.resultedOn));
    return <fieldset className="soil-analysis-fields"><legend>{copy.soilAnalyses}</legend>{fieldIds.map(fieldId => { const rows = candidates(fieldId), field = data.fields.find(row => row.id === fieldId); return <label key={fieldId}><span>{field?.name || fieldId}</span><select value={selected[fieldId] || ""} onChange={event => setSelected({ ...selected, [fieldId]: event.target.value })}><option value="">{rows[0] ? `${copy.automatic} · ${rows[0].laboratory} · ${rows[0].bulletinNumber}` : copy.noValidAnalysis}</option>{rows.map(result => <option key={result.id} value={result.id}>{result.laboratory} · {result.bulletinNumber} · {formatDate(result.resultedOn, locale)}{result.validUntil ? ` → ${formatDate(result.validUntil, locale)}` : ""}</option>)}</select>{!rows.length && <small className="operation-warning" role="status">{copy.noValidAnalysis}</small>}</label>; })}</fieldset>;
}
function ResourceAssignmentFields({ title, rows, destinations, assignments, setAssignments, data, locale, copy }: { title: string; rows: Array<{ id: string; name: string }>; destinations: DestinationForm[]; assignments: ResourceAssignmentForm[]; setAssignments: (next: ResourceAssignmentForm[]) => void; data: Data; locale: string; copy: OperationExtensionCopy }) {
    const selected = new Map(assignments.map(row => [row.resourceId, row]));
    const toggle = (resourceId: string) => { const existing = selected.get(resourceId); setAssignments(existing ? assignments.filter(row => row.resourceId !== resourceId) : [...assignments, { resourceId, totalHours: 1, destinationOverrides: [], totalHoursText: "1", override: false, destinationHours: {} }]); };
    const update = (resourceId: string, patch: Partial<ResourceAssignmentForm>) => setAssignments(assignments.map(row => row.resourceId === resourceId ? { ...row, ...patch } : row));
    return <fieldset className="resource-assignments"><legend>{title}</legend>{rows.map(item => { const assignment = selected.get(item.id); const sum = assignment ? Object.values(assignment.destinationHours).reduce((total, value) => total + Number(value || 0), 0) : 0; return <div key={item.id} className={assignment ? "selected" : ""}><label className="resource-select"><input type="checkbox" checked={Boolean(assignment)} onChange={() => toggle(item.id)}/><span>{item.name}</span></label>{assignment && <><label><span>{copy.totalHours}</span><input type="number" min="0.0001" step="0.0001" required value={assignment.totalHoursText} onChange={event => update(item.id, { totalHoursText: event.target.value, totalHours: Number(event.target.value) })}/></label>{destinations.length > 1 && <label className="resource-select"><input type="checkbox" checked={assignment.override} onChange={event => update(item.id, { override: event.target.checked, destinationHours: event.target.checked ? Object.fromEntries(destinations.map(destination => [`${destination.fieldId}:${destination.plantationId}`, ""])) : {} })}/><span>{copy.manualAllocation}</span></label>}{assignment.override && <fieldset className="resource-overrides"><legend>{sum.toLocaleString(locale)} / {Number(assignment.totalHoursText || 0).toLocaleString(locale)} h</legend>{destinations.map(destination => { const key = `${destination.fieldId}:${destination.plantationId}`, label = data.plantations.find(row => row.id === destination.plantationId)?.name || data.fields.find(row => row.id === destination.fieldId)?.name || key; return <label key={key}><span>{label}</span><input type="number" min="0" step="0.0001" required value={assignment.destinationHours[key] || ""} onChange={event => update(item.id, { destinationHours: { ...assignment.destinationHours, [key]: event.target.value } })}/></label>; })}</fieldset>}</>}</div>; })}</fieldset>;
}
function ResourceAudit({ operation, data, locale }: { operation: OperationDto; data: Data; locale: string }) {
    const labels = resourceCopies[locale as keyof typeof resourceCopies];
    const groups = [[labels.workers, operation.resourceAllocations?.workers || [], data.workers], [labels.equipment, operation.resourceAllocations?.equipment || [], data.equipment], [labels.contractors, operation.resourceAllocations?.contractors || [], data.contractors]] as const;
    return <div className="resource-audit">{groups.flatMap(([label, rows, resources]) => rows.map(row => <p key={`${label}:${row.resourceId}`}><b>{label} · {resources.find(item => item.id === row.resourceId)?.name || row.resourceId}</b><span>{row.totalHours.toLocaleString(locale)} h</span><small>{row.allocations.map(allocation => `${data.fields.find(field => field.id === allocation.fieldId)?.name || allocation.fieldId}: ${allocation.hours.toLocaleString(locale)} h`).join(" · ")}</small></p>))}</div>;
}
function OperationCatalogDialog({ items, canWrite, onClose, onChanged }: { items: OperationCatalogItemDto[]; canWrite: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
    const { locale } = useI18n(), t = operationCopies[locale], x = operationExtensionCopies[locale];
    const [kind, setKind] = useState<OperationCatalogItemDto["kind"]>("soil_action"), [label, setLabel] = useState(""), [saving, setSaving] = useState(false), [error, setError] = useState("");
    async function mutate(url: string, method: "POST" | "PATCH", body: unknown) { if (saving) return; setSaving(true); setError(""); try { const response = await fetch(url, { method, credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error((await response.json().catch(() => null))?.code || "REQUEST_FAILED"); await onChanged(); setLabel(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "REQUEST_FAILED"); } finally { setSaving(false); } }
    const kindLabels: Record<OperationCatalogItemDto["kind"], string> = { soil_action: t.soilPreparation, crop_installation_method: t.installationMethod, cultural_work_action: t.culturalWork, cultural_work_method: `${t.culturalWork} · ${t.executionMethod}` };
    return <AccessibleDialog labelledBy="catalog-title" onClose={onClose} busy={saving} className="holding-dialog catalog-dialog"><header><h2 id="catalog-title">{x.operationCatalog}</h2><button type="button" data-dialog-close onClick={onClose} disabled={saving} aria-label={x.close}>×</button></header>{canWrite && <form onSubmit={event => { event.preventDefault(); void mutate("/api/farm/operation-catalog", "POST", { kind, label }); }}><label><span>{t.type}</span><select value={kind} onChange={event => setKind(event.target.value as OperationCatalogItemDto["kind"])}>{Object.entries(kindLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label><span>{x.designation}</span><input required minLength={2} maxLength={120} value={label} onChange={event => setLabel(event.target.value)}/></label><button className="primary-action" disabled={saving}>{x.createOption}</button></form>}<div className="catalog-list">{items.map(item => <article key={item.id}><div><b>{item.label}</b><small>{kindLabels[item.kind]}</small></div><em className={item.status}>{item.status === "active" ? x.active : x.inactive}</em><button type="button" disabled={!canWrite || saving} onClick={() => void mutate(`/api/farm/operation-catalog/${item.id}`, "PATCH", { active: item.status !== "active" })}>{item.status === "active" ? x.deactivate : x.reactivate}</button></article>)}</div>{!items.length && <p>{x.noCustomOptions}</p>}{error && <DialogError>{t.saveError}</DialogError>}</AccessibleDialog>;
}
function VoidOperationDialog({ operation, onClose, onSaved }: { operation: OperationDto; onClose: () => void; onSaved: () => Promise<void> }) {
    const { locale } = useI18n(), t = operationCopies[locale], x = operationExtensionCopies[locale];
    const [reason, setReason] = useState(""), [saving, setSaving] = useState(false), [error, setError] = useState("");
    async function submit(event: FormEvent) { event.preventDefault(); if (saving) return; setSaving(true); setError(""); try { const response = await fetch(`/api/farm/operations/${operation.id}/void`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); if (!response.ok) throw new Error((await response.json().catch(() => null))?.code || "REQUEST_FAILED"); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "REQUEST_FAILED"); setSaving(false); } }
    return <AccessibleDialog labelledBy="void-title" onClose={onClose} busy={saving} role="alertdialog"><header><h2 id="void-title">{operationExtensionMessage(x.voidOperation, { code: operation.code })}</h2><button type="button" data-dialog-close onClick={onClose} disabled={saving} aria-label={x.close}>×</button></header><form className="holding-form" onSubmit={submit}><p>{x.voidNotice}</p><label><span>{x.reason}</span><textarea data-dialog-initial-focus required minLength={2} maxLength={500} value={reason} onChange={event => setReason(event.target.value)}/></label>{error && <DialogError>{t.saveError}</DialogError>}<footer><button type="button" onClick={onClose} disabled={saving}>{t.cancel}</button><button className="primary-action" disabled={saving || reason.trim().length < 2}>{x.confirmVoid}</button></footer></form></AccessibleDialog>;
}

function formatDate(value: string, locale: string) {
    const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
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
    const fertilizations = useMemo(() => data.operations.filter(operation => operation.status === "performed" && operation.fertilization && (!from || operation.performedAt.slice(0, 10) >= from) && (!to || operation.performedAt.slice(0, 10) <= to) && (!fieldId || operation.destinations.some(destination => destination.fieldId === fieldId)) && (!plantationId || operation.destinations.some(destination => destination.plantationId === plantationId))), [data.operations, fieldId, plantationId, from, to]);
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
