import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import type { CropPeriodDto, PlantationDto } from "@shared/crop-lifecycle";
import type { FieldDto } from "@shared/fields";
import type { OperationDto } from "@shared/operations";
import {
  accumulationStart,
  accumulationWindowStart,
  activeStationCount,
  fieldCentroid,
  weatherCapabilities,
  type AccumulationSettings,
  type AgronomicWeatherAccumulation,
  type AgronomicWeatherIndicators,
  type WeatherAccumulationMetric,
  type WeatherReport,
  type WeatherStationSuggestion,
  type WeatherVirtualStation,
} from "@shared/weather";
import { useAuth } from "../../auth";
import { AccessibleDialog, DialogError } from "../../components/AccessibleDialog";
import { useI18n } from "../../i18n";
import { weatherCopies, type WeatherCopy } from "./weather-locales.generated";
import "./weather.css";

type Lifecycle = { plantations: PlantationDto[]; periods: CropPeriodDto[] };
type Tab = "conditions" | "stations" | "plantations";
const today = () => new Date().toISOString().slice(0, 10);
const json = async <T,>(response: Response) => {
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    message?: string;
  } | null;
  if (!response.ok || payload?.data === undefined)
    throw new Error(payload?.message || "Request failed");
  return payload.data;
};
const api = <T,>(path: string, init?: RequestInit) =>
  fetch(`/api/weather/${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  }).then(json<T>);
const weatherSeries = <T,>(
  path: string,
  input: { from: string; to: string; campaignId?: string },
  writeAllowed: boolean,
): Promise<T | null> =>
  writeAllowed
    ? api<T>(path, { method: "POST", body: JSON.stringify(input) })
    : api<T | null>(`${path}?${new URLSearchParams(input).toString()}`);
const dateTime = (date: string) =>
  new Date(`${date}T12:00:00.000Z`).toISOString();
const format = (
  value: number | null,
  unit: string,
  locale: string,
  digits = 1,
) =>
  value === null
    ? "—"
    : `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${unit}`;

export default function WeatherModule() {
  const { locale } = useI18n();
  const { session } = useAuth();
  const t = weatherCopies[locale];
  const [tab, setTab] = useState<Tab>("conditions"),
    [stations, setStations] = useState<WeatherVirtualStation[]>([]),
    [lifecycle, setLifecycle] = useState<Lifecycle>({
      plantations: [],
      periods: [],
    }),
    [fields, setFields] = useState<FieldDto[]>([]),
    [operations, setOperations] = useState<OperationDto[]>([]);
  const [selectedStation, setSelectedStation] = useState(""),
    [selectedPlantation, setSelectedPlantation] = useState(""),
    [report, setReport] = useState<WeatherReport | null>(null);
  const [historyDate, setHistoryDate] = useState(today()),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [dialog, setDialog] = useState<"create" | "rename" | null>(null);
  const writeAllowed = Boolean(
    session?.access.access.writeAllowed &&
    (session.access.applicationMembership.permissions.includes("*") ||
      session.access.applicationMembership.permissions.includes("farm.manage")),
  );
  const limit =
    typeof session?.access.entitlements.limits.virtualStations === "number"
      ? session.access.entitlements.limits.virtualStations
      : null;
  const level = session?.access.entitlements.features.agronomicWeather;
  const capabilities = weatherCapabilities(level);
  const featureAvailable =
    session?.access.entitlements.features.weather === true ||
    typeof level === "string";
  const load = useCallback(async () => {
    if (!featureAvailable) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const [stationRows, lifecycleResponse, fieldResponse, operationResponse] =
        await Promise.all([
          api<WeatherVirtualStation[]>("stations"),
          fetch("/api/farm/crop-lifecycle", { credentials: "include" }).then(
            json<Lifecycle>,
          ),
          fetch("/api/farm/fields", { credentials: "include" }).then(
            json<FieldDto[]>,
          ),
          fetch("/api/farm/operations", { credentials: "include" }).then(
            json<OperationDto[]>,
          ),
        ]);
      setStations(stationRows);
      setLifecycle(lifecycleResponse);
      setFields(fieldResponse);
      setOperations(operationResponse);
      setSelectedStation(
        (value) =>
          value || stationRows.find((item) => !item.archivedAt)?.id || "",
      );
      setSelectedPlantation(
        (value) => {const active=lifecycleResponse.plantations.filter(item=>item.status==="active");return value||(active.length===1?active[0].id:"")},
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [featureAvailable]);
  useEffect(() => {
    void load();
  }, [load]);
  const loadPlantationConditions = useCallback(
    async (plantationId: string, at = today()) => {
      if (!plantationId) {
        setReport(null);
        return;
      }
      setFailed(false);
      try {
        setReport(await weatherSeries<WeatherReport>(
          `subjects/plantation/${plantationId}/conditions`,
          { from: at, to: at },
          writeAllowed,
        ));
      } catch {
        setFailed(true);
      }
    },
    [writeAllowed],
  );
  useEffect(() => {
    if (selectedPlantation) void loadPlantationConditions(selectedPlantation);
    else setReport(null);
  }, [selectedPlantation, loadPlantationConditions]);
  const active = activeStationCount(stations),
    capacityReached = limit !== null && active >= limit;
  const selected = stations.find((item) => item.id === selectedStation) || null;
  if (loading)
    return (
      <div className="module-state">
        <span className="spinner" />
      </div>
    );
  if (!featureAvailable)
    return (
      <section className="panel module-state">
        <p>{t.noData}</p>
      </section>
    );
  return (
    <>
      <section className="page-heading weather-heading">
        <div>
          <p>{t.kicker}</p>
          <h1>{t.title}</h1>
          <span>{t.description}</span>
        </div>
        <div>
          <b>{t.conditions}</b>
          <span>
            {t.activeStations}: {active} / {limit ?? "∞"}
          </span>
        </div>
      </section>
      {!writeAllowed && (
        <aside className="weather-readonly">{t.readOnly}</aside>
      )}
      {failed && (
        <aside className="weather-error">
          {t.loadError} <button onClick={() => void load()}>{t.refresh}</button>
        </aside>
      )}
      <section className="section-tabs territory-tabs">
        <button
          className={tab === "conditions" ? "active" : ""}
          onClick={() => setTab("conditions")}
        >
          {t.conditions}
        </button>
        <button
          className={tab === "stations" ? "active" : ""}
          onClick={() => setTab("stations")}
        >
          {t.stations}
        </button>
        <button
          className={tab === "plantations" ? "active" : ""}
          onClick={() => setTab("plantations")}
        >
          {t.plantations}
        </button>
      </section>
      {tab === "stations" ? (
        <Stations
          stations={stations}
          selected={selectedStation}
          limit={limit}
          writeAllowed={writeAllowed}
          capacityReached={capacityReached}
          t={t}
          onSelect={setSelectedStation}
          onCreate={() => setDialog("create")}
          onRename={(id) => {
            setSelectedStation(id);
            setDialog("rename");
          }}
          onArchive={async (id) => {
            await api(`stations/${id}/archive`, { method: "POST" });
            await load();
          }}
        />
      ) : tab === "plantations" ? (
        <PlantationWeather
          plantations={lifecycle.plantations}
          periods={lifecycle.periods}
          fields={fields}
          operations={operations}
          stations={stations.filter((item) => !item.archivedAt)}
          selected={selectedPlantation}
          writeAllowed={writeAllowed}
          advanced={capabilities.campaignProfiles}
          t={t}
          locale={locale}
          onSelect={setSelectedPlantation}
          onConditions={async () => {
            await loadPlantationConditions(selectedPlantation);
            setTab("conditions");
          }}
        />
      ) : (
        <Conditions
          report={report}
          canHistory={capabilities.history}
          plantations={lifecycle.plantations}
          selectedPlantation={selectedPlantation}
          historyDate={historyDate}
          t={t}
          locale={locale}
          onPlantation={setSelectedPlantation}
          onHistoryDate={setHistoryDate}
          onHistory={() => void loadPlantationConditions(selectedPlantation, historyDate)}
        />
      )}
      {dialog && (
        <StationDialog
          kind={dialog}
          station={selected}
          t={t}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function Stations({
  stations,
  selected,
  limit,
  writeAllowed,
  capacityReached,
  t,
  onSelect,
  onCreate,
  onRename,
  onArchive,
}: {
  stations: WeatherVirtualStation[];
  selected: string;
  limit: number | null;
  writeAllowed: boolean;
  capacityReached: boolean;
  t: WeatherCopy;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string) => void;
  onArchive: (id: string) => Promise<void>;
}) {
  return (
    <section className="panel weather-panel">
      <header>
        <div>
          <h2>{t.stations}</h2>
          <p>
            {t.stationLimit}: {limit ?? "∞"}
          </p>
        </div>
        <button
          className="primary-action"
          disabled={!writeAllowed || capacityReached}
          onClick={onCreate}
        >
          ＋ {t.addStation}
        </button>
      </header>
      {capacityReached && <p className="weather-limit">{t.limitReached}</p>}
      <div className="station-grid">
        {stations.map((station) => (
          <article
            className={`${selected === station.id ? "selected" : ""} ${station.archivedAt ? "archived" : ""}`}
            key={station.id}
            onClick={() => onSelect(station.id)}
          >
            <span>
              {station.archivedAt ? t.archivedStations : t.activeStations}
            </span>
            <h3>{station.name}</h3>
            <p>
              {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
            </p>
            <small>
              {station.timezone}
              {station.elevationM === null ? "" : ` · ${station.elevationM} m`}
            </small>
            {!station.archivedAt && (
              <footer>
                <button
                  disabled={!writeAllowed}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(station.id);
                  }}
                >
                  {t.rename}
                </button>
                <button
                  disabled={!writeAllowed}
                  onClick={(event) => {
                    event.stopPropagation();
                    void onArchive(station.id);
                  }}
                >
                  {t.archive}
                </button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Conditions({
  report,
  canHistory,
  plantations,
  selectedPlantation,
  historyDate,
  t,
  locale,
  onPlantation,
  onHistoryDate,
  onHistory,
}: {
  report: WeatherReport | null;
  canHistory: boolean;
  plantations: PlantationDto[];
  selectedPlantation: string;
  historyDate: string;
  t: WeatherCopy;
  locale: string;
  onPlantation: (id: string) => void;
  onHistoryDate: (date: string) => void;
  onHistory: () => void;
}) {
  if (!plantations.length)
    return (
      <section className="panel module-state">
        <p>{t.noData}</p>
      </section>
    );
  const current = report?.current;
  return (
    <section className="weather-dashboard">
      <div className="weather-toolbar">
        <label>
          <span>{t.plantations}</span>
          <select
            value={selectedPlantation}
            onChange={(event) => onPlantation(event.target.value)}
          >
            <option value="">{t.plantations}</option>
            {plantations.map((plantation) => (
              <option key={plantation.id} value={plantation.id}>
                {plantation.name}
              </option>
            ))}
          </select>
        </label>
        {canHistory && (
          <>
            <label>
              <span>{t.history}</span>
              <input
                type="date"
                value={historyDate}
                onChange={(event) => onHistoryDate(event.target.value)}
              />
            </label>
            <button onClick={onHistory}>{t.history}</button>
          </>
        )}
      </div>
      {!report ? (
        <div className="panel module-state">
          <p>{t.noData}</p>
        </div>
      ) : (
        <>
          <div className="weather-badges">
            <Badge value={current?.temporalStatus} t={t} />
            <Badge value={current?.valueSource} t={t} />
            <span>
              {t.cache}:{" "}
              {report.meta.cache.status === "stale" ? t.stale : t.fresh}
            </span>
            <span>v{report.meta.contractVersion}</span>
          </div>
          <section className="weather-current">
            <article>
              <span>{t.current}</span>
              <h2>{format(current?.temperatureC ?? null, "°C", locale)}</h2>
              <p>{current?.summary || "—"}</p>
            </article>
            <Metric
              label={t.precipitation}
              value={format(
                current?.precipitationAccumulationMm ?? null,
                "mm",
                locale,
              )}
            />
            <Metric
              label={t.humidity}
              value={format(current?.humidityPercent ?? null, "%", locale, 0)}
            />
            <Metric
              label={t.wind}
              value={format(current?.windSpeedKph ?? null, "km/h", locale)}
            />
            <Metric
              label={t.solarRadiation}
              value={format(
                current?.solarRadiationWm2 ?? null,
                "W/m²",
                locale,
                0,
              )}
            />
          </section>
          <Provenance report={report} t={t} locale={locale} />
          <Forecast report={report} t={t} locale={locale} />
        </>
      )}
    </section>
  );
}

function Forecast({
  report,
  t,
  locale,
}: {
  report: WeatherReport;
  t: WeatherCopy;
  locale: string;
}) {
  return (
    <div className="weather-forecast">
      <section className="panel">
        <h3>{t.hourly}</h3>
        <div className="hourly-strip">
          {report.hourly.data.slice(0, 12).map((point) => (
            <article key={point.at}>
              <time>
                {new Date(point.at).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <b>{format(point.temperatureC, "°C", locale, 0)}</b>
              <small>
                {format(point.precipitationProbability, "%", locale, 0)}
              </small>
              <Badge value={point.temporalStatus} t={t} />
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>{t.daily}</h3>
        <div className="daily-list">
          {report.daily.data.map((point) => (
            <article key={point.at}>
              <time>
                {new Date(point.at).toLocaleDateString(locale, {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </time>
              <b>
                {format(point.temperatureMinC, "°C", locale, 0)} /{" "}
                {format(point.temperatureMaxC, "°C", locale, 0)}
              </b>
              <span>{point.summary || "—"}</span>
              <Badge value={point.valueSource} t={t} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
function Provenance({ report, t, locale }: { report: WeatherReport; t: WeatherCopy; locale: string }) {
  return (
    <aside className="weather-provenance">
      <strong>{t.provenance}</strong>
      <span>{report.station?.station.name || "—"}</span>
      {report.station?.assignment && (
        <span>
          {t.effectiveFrom}:{" "}
          {new Date(report.station.assignment.effectiveFrom).toLocaleString(locale)}
        </span>
      )}
      <small>{t.historicalProvenance}</small>
    </aside>
  );
}
function Badge({ value, t }: { value: string | undefined; t: WeatherCopy }) {
  const label =
    value === "observed"
      ? t.observed
      : value === "forecast"
        ? t.forecast
        : value === "measured"
          ? t.measured
          : t.estimated;
  return <em className={`weather-badge ${value || "estimated"}`}>{label}</em>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="weather-metric">
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}

const metricRows = (metrics: AgronomicWeatherIndicators, t: WeatherCopy) =>
  [
    [t.et0, metrics.et0],
    [t.degreeDays, metrics.degreeDays],
    [t.chillHours, metrics.chillHoursBelow7_2C],
    [t.modifiedChill, metrics.modifiedChillHours],
    [t.utah, metrics.utahChillUnits],
    [t.dynamicChill, metrics.dynamicModelChillPortions],
    [t.leafWetness, metrics.estimatedLeafWetnessHours],
    [t.solarEnergy, metrics.solarEnergy],
    [t.par, metrics.estimatedPar],
    [t.dli, metrics.estimatedDli],
  ] as const;
function AccumulationPanel({
  value,
  t,
  locale,
}: {
  value: AgronomicWeatherAccumulation;
  t: WeatherCopy;
  locale: string;
}) {
  const date = (input: string) =>
    new Date(`${input}T12:00:00Z`).toLocaleDateString(locale);
  const warning = (
    code: AgronomicWeatherAccumulation["warnings"][number]["code"],
  ) =>
    code === "STATION_NOT_ASSIGNED"
      ? t.noAssignment
      : code === "PROFILE_NOT_FOUND"
        ? `${t.profile}: ${t.noData}`
        : t.noData;
  return (
    <section className="panel indicator-panel accumulation-panel">
      <header>
        <div>
          <h3>{t.indicators}</h3>
          <p>
            {date(value.interval.from)} — {date(value.interval.to)}
          </p>
        </div>
        <span>
          {t.daily}: {value.coverage.availableDays} /{" "}
          {value.coverage.requestedDays} · {t.hourly}:{" "}
          {value.coverage.availableHours} / {value.coverage.requestedHours}
        </span>
      </header>
      <div className="weather-badges">
        <span>
          {t.observed}: {value.temporalStatus.observedHours}
        </span>
        <span>
          {t.forecast}: {value.temporalStatus.forecastHours}
        </span>
        <span>
          {t.measured}: {value.valueSource.measuredHours}
        </span>
        <span>
          {t.estimated}: {value.valueSource.estimatedHours}
        </span>
      </div>
      {value.warnings.length > 0 && (
        <aside className="weather-error">
          {value.warnings.map((item) => (
            <p key={`${item.code}-${item.from}-${item.to}`}>
              {warning(item.code)} · {date(item.from)} — {date(item.to)}
            </p>
          ))}
        </aside>
      )}
      <div className="weather-periods">
        <article>
          <h4>{t.provenance}</h4>
          {value.stationPeriods.map((period) => (
            <p key={`${period.assignment.id}-${period.from}`}>
              {period.station.name} · {date(period.from)} — {date(period.to)}
            </p>
          ))}
        </article>
        <article>
          <h4>{t.profile}</h4>
          {value.profilePeriods.map((period) => (
            <p key={`${period.from}-${period.profile?.id || "none"}`}>
              {period.profile?.methodVersion || t.noData} · {date(period.from)}{" "}
              — {date(period.to)}
            </p>
          ))}
        </article>
      </div>
      <div className="indicator-grid">
        {metricRows(value.metrics, t).map(([label, item]) => (
          <AccumulationMetricCard
            key={label}
            label={label}
            item={item as WeatherAccumulationMetric}
            t={t}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

function AccumulationMetricCard({
  label,
  item,
  t,
  locale,
}: {
  label: string;
  item: WeatherAccumulationMetric;
  t: WeatherCopy;
  locale: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <b>{format(item.value, item.unit, locale, 2)}</b>
      {item.state !== "available" && <small>{t.noData}</small>}
      <small>{t.observed}: {format(item.components.observed,item.unit,locale,2)} · {t.forecast}: {format(item.components.forecast,item.unit,locale,2)}</small>
      <small>
        {t.daily}: {item.coverage.availableDays}/{item.coverage.requestedDays} ·{" "}
        {t.hourly}: {item.coverage.availableHours}/
        {item.coverage.requestedHours}
      </small>
      <details>
        <summary>{t.details}</summary>
        <p>
          {t.method}: {item.method}
        </p>
        <p>
          {t.version}: {item.version}
        </p>
        <p>{t.inputs}: {item.inputIds.length} · {item.inputHash}</p>
        <p>{t.refresh}: {item.provenance.fetchedAt.length ? item.provenance.fetchedAt.map(value=>new Date(value).toLocaleString(locale)).join(" · ") : t.noData}</p>
        {item.coverage.gaps.map((gap,index)=><p key={`${gap.from}-${gap.to}-${index}`}>{t.noData}: {new Date(`${gap.from}T12:00:00Z`).toLocaleDateString(locale)} — {new Date(`${gap.to}T12:00:00Z`).toLocaleDateString(locale)}</p>)}
        <pre>{JSON.stringify(item.inputs, null, 2)}</pre>
      </details>
    </article>
  );
}

function PlantationWeather({
  plantations,
  periods,
  fields,
  operations,
  stations,
  selected,
  writeAllowed,
  advanced,
  t,
  locale,
  onSelect,
  onConditions,
}: {
  plantations: PlantationDto[];
  periods: CropPeriodDto[];
  fields: FieldDto[];
  operations: OperationDto[];
  stations: WeatherVirtualStation[];
  selected: string;
  writeAllowed: boolean;
  advanced: boolean;
  t: WeatherCopy;
  locale: string;
  onSelect: (id: string) => void;
  onConditions: () => Promise<void>;
}) {
  const plantation =
    plantations.find((item) => item.id === selected) || (plantations.length===1?plantations[0]:undefined);
  const relevantPeriods = periods.filter(
    (item) => item.plantationId === plantation?.id,
  );
  const field = fields.find((item) => item.id === plantation?.fieldId);
  const installation = operations.find(
    (item) =>
      item.createdPlantationId === plantation?.id && item.cropInstallation,
  );
  const installationDate =
    installation?.performedAt.slice(0, 10) || plantation?.startedOn;
  const center = field ? fieldCentroid(field.geometry.coordinates[0]) : null;
  const [suggestions, setSuggestions] = useState<WeatherStationSuggestion[]>(
      [],
    ),
    [stationId, setStationId] = useState(stations[0]?.id || ""),
    [effectiveFrom, setEffectiveFrom] = useState(today()),
    [window, setWindow] = useState<"7" | "30" | "90" | "custom">("30"),
    [customStart, setCustomStart] = useState(today()),
    [periodId, setPeriodId] = useState(
      relevantPeriods.length === 1 ? relevantPeriods[0].id : "",
    ),
    [hideWarning, setHideWarning] = useState(false),
    [accumulationFailed, setAccumulationFailed] = useState(false),
    [accumulation, setAccumulation] =
      useState<AgronomicWeatherAccumulation | null>(null);
  const campaign = relevantPeriods.find((item) => item.id === periodId);
  const [settings, setSettings] = useState<AccumulationSettings>({
    plantationKind: plantation?.kind || "temporary",
    establishment:
      plantation?.kind === "permanent"
        ? "not_applicable"
        : installation?.cropInstallation?.method === "sowing"
        ? "sown"
        : "transplanted",
    hasDormancy: false,
    campaignStartDate: campaign?.startedOn,
    sowingDate: installationDate,
    transplantDate: installationDate,
  });
  useEffect(() => {
    setPeriodId(relevantPeriods.length === 1 ? relevantPeriods[0].id : "");
  }, [plantation?.id]);
  useEffect(() => {
    if (plantation) {
      setSettings({
        plantationKind: plantation.kind,
        establishment:
          plantation.kind === "permanent"
            ? "not_applicable"
            : installation?.cropInstallation?.method === "sowing"
            ? "sown"
            : "transplanted",
        hasDormancy: false,
        campaignStartDate: campaign?.startedOn,
        sowingDate: installationDate,
        transplantDate: installationDate,
      });
      setAccumulation(null);
      setAccumulationFailed(false);
    }
  }, [plantation?.id, campaign?.id, installation?.id]);
  const start = accumulationStart(settings),
    windowDate = accumulationWindowStart(today(), window, customStart),
    effectiveStart =
      start.date && windowDate
        ? [start.date, windowDate].sort().at(-1)!
        : start.date || windowDate;
  if (!plantation)
    return (
      <section className="panel module-state">
        <p>{t.noData}</p>
      </section>
    );
  const subject=plantation;
  async function suggest() {
    if (center)
      setSuggestions(
        await api<WeatherStationSuggestion[]>(
          `stations/suggestions?latitude=${center.latitude}&longitude=${center.longitude}`,
        ),
      );
  }
  async function assign() {
    await api(`subjects/plantation/${subject.id}/station`, {
      method: "POST",
      body: JSON.stringify({
        stationId,
        effectiveFrom: dateTime(effectiveFrom),
      }),
    });
    await onConditions();
  }
  async function loadAccumulation() {
    if (
      !advanced ||
      !effectiveStart ||
      (relevantPeriods.length > 0 && !campaign) ||
      (start.basis === "missing_vegetative_start" && !hideWarning)
    )
      return;
    setAccumulationFailed(false);
    try {
      setAccumulation(await weatherSeries<AgronomicWeatherAccumulation>(
        `subjects/plantation/${subject.id}/agronomic-series`,
        { from: effectiveStart, to: today(), ...(campaign ? { campaignId: campaign.id } : {}) },
        writeAllowed,
      ));
      if (start.basis === "missing_vegetative_start") setHideWarning(false);
    } catch {
      setAccumulationFailed(true);
    }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!advanced || !campaign) return;
    const form = new FormData(event.currentTarget);
    await api(`campaigns/${campaign.id}/agronomic-profiles`, {
      method: "POST",
      body: JSON.stringify({
        plantationId: subject.id,
        cropId: subject.cultureId,
        varietyId: subject.varietyId || "default",
        methodVersion: "gerofarm-ui-v1",
        validFrom: dateTime(String(form.get("validFrom"))),
        parameters: {
          ...settings,
          degreeDayBaseC: Number(form.get("degreeDayBaseC")),
          degreeDayUpperC: form.get("degreeDayUpperC")
            ? Number(form.get("degreeDayUpperC"))
            : null,
          leafWetnessHumidityPercent: Number(
            form.get("leafWetnessHumidityPercent"),
          ),
          accumulationWindow: window,
          customStart: window === "custom" ? customStart : null,
        },
      }),
    });
    await loadAccumulation();
  }
  return (
    <section className="panel weather-panel plantation-weather">
      <header>
        <div>
          <h2>{t.plantations}</h2>
          <p>{t.historicalProvenance}</p>
        </div>
        <select
          value={plantation.id}
          onChange={(event) => onSelect(event.target.value)}
        >
          {plantations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {relevantPeriods.length > 0 && (
          <select value={periodId} onChange={(event) => setPeriodId(event.target.value)} aria-label={t.campaign}>
            <option value="">{t.campaign}</option>
            {relevantPeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
        )}
      </header>
      <div className="assignment-grid">
        <article>
          <h3>{t.selectStation}</h3>
          <p>
            {field?.name}{" "}
            {center &&
              `· ${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`}
          </p>
          <button disabled={!center} onClick={() => void suggest()}>
            {t.suggest}
          </button>
          {suggestions.map((item) => (
            <label className="suggestion" key={item.station.id}>
              <input
                type="radio"
                name="station"
                checked={stationId === item.station.id}
                onChange={() => setStationId(item.station.id)}
              />
              <span>{item.station.name}</span>
              <b>{item.distanceKm.toFixed(1)} km</b>
            </label>
          ))}
          <label>
            <span>{t.effectiveFrom}</span>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </label>
          <button
            className="primary-action"
            disabled={!writeAllowed || !stationId}
            onClick={() => void assign()}
          >
            {t.assign}
          </button>
        </article>
        <article>
          <h3>{t.window}</h3>
          <div className="window-buttons">
            {(["7", "30", "90", "custom"] as const).map((value) => (
              <button
                type="button"
                className={window === value ? "active" : ""}
                onClick={() => setWindow(value)}
                key={value}
              >
                {value === "custom" ? t.custom : value}
              </button>
            ))}
          </div>
          {window === "custom" && (
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
          )}
          <label>
            <span>{t.profile}</span>
            <select
              value={
                settings.plantationKind === "temporary"
                  ? settings.establishment
                  : settings.hasDormancy
                    ? "dormant"
                    : "campaign"
              }
              onChange={(event) =>
                setSettings((value) =>
                  value.plantationKind === "temporary"
                    ? {
                        ...value,
                        establishment: event.target.value as
                          "sown" | "transplanted",
                      }
                    : {
                        ...value,
                        hasDormancy: event.target.value === "dormant",
                      },
                )
              }
            >
              {settings.plantationKind === "temporary" ? (
                <>
                  <option value="sown">{t.sowingFallback}</option>
                  <option value="transplanted">{t.transplant}</option>
                </>
              ) : (
                <>
                  <option value="dormant">{t.vegetativeStart}</option>
                  <option value="campaign">{t.campaignStart}</option>
                </>
              )}
            </select>
          </label>
          {settings.plantationKind === "temporary" &&
          settings.establishment === "sown" ? (
            <>
              <label>
                <span>{t.sowingFallback}</span>
                <input
                  type="date"
                  value={settings.sowingDate || ""}
                  onChange={(event) =>
                    setSettings((value) => ({
                      ...value,
                      sowingDate: event.target.value || undefined,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t.emergence}</span>
                <input
                  type="date"
                  value={settings.emergenceDate || ""}
                  onChange={(event) =>
                    setSettings((value) => ({
                      ...value,
                      emergenceDate: event.target.value || undefined,
                    }))
                  }
                />
              </label>
            </>
          ) : settings.plantationKind === "temporary" ? (
            <label>
              <span>{t.transplant}</span>
              <input
                type="date"
                value={settings.transplantDate || ""}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    transplantDate: event.target.value || undefined,
                  }))
                }
              />
            </label>
          ) : settings.hasDormancy ? (
            <label>
              <span>{t.vegetativeStart}</span>
              <input
                id="vegetative-start-date"
                type="date"
                value={settings.vegetativeStartDate || ""}
                onChange={(event) => {
                  setSettings((value) => ({
                    ...value,
                    vegetativeStartDate: event.target.value || undefined,
                  }));
                  setHideWarning(false);
                }}
              />
            </label>
          ) : (
            <label>
              <span>{t.campaignStart}</span>
              <input
                type="date"
                value={settings.campaignStartDate || ""}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    campaignStartDate: event.target.value || undefined,
                  }))
                }
              />
            </label>
          )}
          <p>
            {t.effectiveFrom}: <b>{effectiveStart || "—"}</b>
          </p>
          <p>
            {start.basis === "emergence"
              ? t.emergence
              : start.basis === "sowing_fallback"
                ? t.sowingFallback
                : start.basis === "transplant"
                  ? t.transplant
                  : start.basis === "vegetative_start" ||
                      start.basis === "missing_vegetative_start"
                    ? t.vegetativeStart
                    : t.campaignStart}
          </p>
        </article>
      </div>
      {start.basis === "missing_vegetative_start" && !hideWarning && (
        <aside className="vegetative-warning">
          <p>{t.vegetativeWarning}</p>
          <button
            type="button"
            onClick={() =>
              document.getElementById("vegetative-start-date")?.focus()
            }
          >
            {t.indicateDate}
          </button>
          <button type="button" onClick={() => setHideWarning(true)}>
            {t.continueWithout}
          </button>
        </aside>
      )}
      <button
        type="button"
        className="primary-action accumulation-action"
        disabled={
          !advanced ||
          !effectiveStart ||
          (relevantPeriods.length > 0 && !campaign) ||
          (start.basis === "missing_vegetative_start" && !hideWarning)
        }
        onClick={() => void loadAccumulation()}
      >
        {t.refresh} · {t.indicators}
      </button>
      {accumulationFailed && (
        <aside className="weather-error">{t.loadError}</aside>
      )}
      <form
        className="weather-profile"
        onSubmit={(event) => void saveProfile(event)}
      >
        <h3>{t.profile}</h3>
        <label>
          <span>{t.degreeDayBase}</span>
          <input
            name="degreeDayBaseC"
            required
            type="number"
            step="0.1"
            defaultValue="10"
          />
        </label>
        <label>
          <span>{t.degreeDayUpper}</span>
          <input
            name="degreeDayUpperC"
            type="number"
            step="0.1"
            defaultValue="30"
          />
        </label>
        <label>
          <span>{t.leafWetnessThreshold}</span>
          <input
            name="leafWetnessHumidityPercent"
            required
            type="number"
            min="0"
            max="100"
            defaultValue="90"
          />
        </label>
        <label>
          <span>{t.effectiveFrom}</span>
          <input name="validFrom" required type="date" defaultValue={today()} />
        </label>
        <button
          className="primary-action"
          disabled={!advanced || !writeAllowed || !campaign}
        >
          {t.saveProfile}
        </button>
      </form>
      {accumulation && (
        <AccumulationPanel value={accumulation} t={t} locale={locale} />
      )}
    </section>
  );
}

function StationDialog({
  kind,
  station,
  t,
  onClose,
  onSaved,
}: {
  kind: "create" | "rename";
  station: WeatherVirtualStation | null;
  t: WeatherCopy;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const titleId = useId();
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    try {
      if (kind === "rename" && station)
        await api(`stations/${station.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.get("name") }),
        });
      else
        await api("stations", {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name"),
            latitude: Number(form.get("latitude")),
            longitude: Number(form.get("longitude")),
            elevationM: form.get("elevation")
              ? Number(form.get("elevation"))
              : null,
            timezone: form.get("timezone"),
          }),
        });
      await onSaved();
    } catch {
      setError(true);
      setSaving(false);
    }
  }
  return (
    <AccessibleDialog labelledBy={titleId} onClose={onClose} busy={saving}>
        <header>
          <h2 id={titleId}>{kind === "create" ? t.addStation : t.rename}</h2>
          <button type="button" data-dialog-close onClick={onClose} disabled={saving} aria-label={t.cancel}>
            ×
          </button>
        </header>
        <form className="holding-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>{t.name}</span>
            <input
              name="name"
              required
              maxLength={150}
              defaultValue={station?.name || ""}
            />
          </label>
          {kind === "create" && (
            <>
              <label>
                <span>{t.latitude}</span>
                <input
                  name="latitude"
                  required
                  type="number"
                  min="-90"
                  max="90"
                  step="0.000001"
                />
              </label>
              <label>
                <span>{t.longitude}</span>
                <input
                  name="longitude"
                  required
                  type="number"
                  min="-180"
                  max="180"
                  step="0.000001"
                />
              </label>
              <label>
                <span>{t.elevation}</span>
                <input
                  name="elevation"
                  type="number"
                  min="-500"
                  max="9000"
                  step="0.1"
                />
              </label>
              <label>
                <span>{t.timezone}</span>
                <input
                  name="timezone"
                  required
                  defaultValue={
                    Intl.DateTimeFormat().resolvedOptions().timeZone ||
                    "Europe/Lisbon"
                  }
                />
              </label>
            </>
          )}
          {error && <DialogError>{t.loadError}</DialogError>}
          <footer>
            <button type="button" className="subtle-button" onClick={onClose} disabled={saving}>
              {t.cancel}
            </button>
            <button className="primary-action" disabled={saving}>
              {t.save}
            </button>
          </footer>
        </form>
    </AccessibleDialog>
  );
}
