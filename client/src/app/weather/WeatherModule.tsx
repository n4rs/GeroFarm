import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CropPeriodDto, PlantationDto } from "@shared/crop-lifecycle";
import type { FieldDto } from "@shared/fields";
import {
  accumulationStart,
  accumulationWindowStart,
  activeStationCount,
  fieldCentroid,
  indicatorInputFromReport,
  weatherCapabilities,
  type AccumulationSettings,
  type WeatherAccumulation,
  type WeatherIndicatorResponse,
  type WeatherReport,
  type WeatherStationSuggestion,
  type WeatherVirtualStation,
} from "@shared/weather";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import { weatherCopies, type WeatherCopy } from "./weather-locales";
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
    [fields, setFields] = useState<FieldDto[]>([]);
  const [selectedStation, setSelectedStation] = useState(""),
    [selectedPlantation, setSelectedPlantation] = useState(""),
    [report, setReport] = useState<WeatherReport | null>(null),
    [derived, setDerived] = useState<WeatherIndicatorResponse | null>(null);
  const [historyDate, setHistoryDate] = useState(today()),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [dialog, setDialog] = useState<"create" | "rename" | null>(null);
  const writeAllowed = Boolean(
    session?.access.access.writeAllowed &&
      (session.access.applicationMembership.permissions.includes("*") ||
        session.access.applicationMembership.permissions.includes(
          "farm.manage",
        )),
  );
  const limit =
    typeof session?.access.entitlements.limits.virtualStations === "number"
      ? session.access.entitlements.limits.virtualStations
      : null;
  const level = session?.access.entitlements.features.agronomicWeather;
  const capabilities = weatherCapabilities(level);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [stationRows, lifecycleResponse, fieldResponse] = await Promise.all(
        [
          api<WeatherVirtualStation[]>("stations"),
          fetch("/api/farm/crop-lifecycle", { credentials: "include" }).then(
            json<Lifecycle>,
          ),
          fetch("/api/farm/fields", { credentials: "include" }).then(
            json<FieldDto[]>,
          ),
        ],
      );
      setStations(stationRows);
      setLifecycle(lifecycleResponse);
      setFields(fieldResponse);
      setSelectedStation(
        (value) =>
          value || stationRows.find((item) => !item.archivedAt)?.id || "",
      );
      setSelectedPlantation(
        (value) =>
          value ||
          lifecycleResponse.plantations.find((item) => item.status === "active")
            ?.id ||
          "",
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const loadStationReport = useCallback(
    async (stationId: string, at?: string) => {
      if (!stationId) {
        setReport(null);
        return;
      }
      setFailed(false);
      try {
        const next = await api<WeatherReport>(
          `stations/${stationId}/report${at ? `?at=${encodeURIComponent(dateTime(at))}` : ""}`,
        );
        setReport(next);
        const input = indicatorInputFromReport(next);
        setDerived(
          input
            ? await api<WeatherIndicatorResponse>("indicators", {
                method: "POST",
                body: JSON.stringify(input),
              })
            : null,
        );
      } catch {
        setFailed(true);
      }
    },
    [],
  );
  useEffect(() => {
    if (selectedStation) void loadStationReport(selectedStation);
  }, [selectedStation, loadStationReport]);
  const active = activeStationCount(stations),
    capacityReached = limit !== null && active >= limit;
  const selected = stations.find((item) => item.id === selectedStation) || null;
  if (loading)
    return (
      <div className="module-state">
        <span className="spinner" />
      </div>
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
          <b>{typeof level === "string" ? level : "Core v2"}</b>
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
          stations={stations.filter((item) => !item.archivedAt)}
          selected={selectedPlantation}
          writeAllowed={writeAllowed}
          advanced={capabilities.campaignProfiles}
          t={t}
          onSelect={setSelectedPlantation}
          onReport={(next) => {
            setReport(next);
            setTab("conditions");
          }}
        />
      ) : (
        <Conditions
          report={report}
          derived={derived}
          stations={stations.filter((item) => !item.archivedAt)}
          selectedStation={selectedStation}
          historyDate={historyDate}
          canHistory={capabilities.history}
          t={t}
          locale={locale}
          onStation={setSelectedStation}
          onHistoryDate={setHistoryDate}
          onHistory={() => void loadStationReport(selectedStation, historyDate)}
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
  derived,
  stations,
  selectedStation,
  historyDate,
  canHistory,
  t,
  locale,
  onStation,
  onHistoryDate,
  onHistory,
}: {
  report: WeatherReport | null;
  derived: WeatherIndicatorResponse | null;
  stations: WeatherVirtualStation[];
  selectedStation: string;
  historyDate: string;
  canHistory: boolean;
  t: WeatherCopy;
  locale: string;
  onStation: (id: string) => void;
  onHistoryDate: (date: string) => void;
  onHistory: () => void;
}) {
  if (!stations.length)
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
          <span>{t.selectStation}</span>
          <select
            value={selectedStation}
            onChange={(event) => onStation(event.target.value)}
          >
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
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
            <span>Core contract v{report.meta.contractVersion}</span>
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
          <Provenance report={report} t={t} />
          <Forecast report={report} t={t} locale={locale} />
          {derived && <Indicators response={derived} t={t} locale={locale} />}
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
function Provenance({ report, t }: { report: WeatherReport; t: WeatherCopy }) {
  return (
    <aside className="weather-provenance">
      <strong>{t.provenance}</strong>
      <span>{report.station?.station.name || "—"}</span>
      {report.station?.assignment && (
        <span>
          {t.effectiveFrom}:{" "}
          {new Date(report.station.assignment.effectiveFrom).toLocaleString()}
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

const indicatorRows = (response: WeatherIndicatorResponse, t: WeatherCopy) =>
  [
    [t.et0, response.indicators.et0],
    [t.degreeDays, response.indicators.degreeDays],
    [t.chillHours, response.indicators.chillHoursBelow7_2C],
    [t.modifiedChill, response.indicators.modifiedChillHours],
    [t.utah, response.indicators.utahChillUnits],
    [t.dynamicChill, response.indicators.dynamicModelChillPortions],
    [t.leafWetness, response.indicators.estimatedLeafWetnessHours],
    [t.solarEnergy, response.indicators.solarEnergy],
    [t.par, response.indicators.estimatedPar],
    [t.dli, response.indicators.estimatedDli],
  ] as const;
function Indicators({
  response,
  t,
  locale,
}: {
  response: WeatherIndicatorResponse;
  t: WeatherCopy;
  locale: string;
}) {
  return (
    <section className="panel indicator-panel">
      <header>
        <h3>{t.indicators}</h3>
        {response.profile && (
          <span>
            {t.profile}: {response.profile.methodVersion}
          </span>
        )}
      </header>
      <div className="indicator-grid">
        {indicatorRows(response, t).map(([label, item]) => (
          <article key={label}>
            <span>{label}</span>
            <b>{format(item.value, item.unit, locale, 2)}</b>
            <Badge value={item.temporalStatus} t={t} />
            <details>
              <summary>{t.details}</summary>
              <p>
                {t.method}: {item.method}
              </p>
              <p>
                {t.version}: {item.version}
              </p>
              <pre>{JSON.stringify(item.inputs, null, 2)}</pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlantationWeather({
  plantations,
  periods,
  fields,
  stations,
  selected,
  writeAllowed,
  advanced,
  t,
  onSelect,
  onReport,
}: {
  plantations: PlantationDto[];
  periods: CropPeriodDto[];
  fields: FieldDto[];
  stations: WeatherVirtualStation[];
  selected: string;
  writeAllowed: boolean;
  advanced: boolean;
  t: WeatherCopy;
  onSelect: (id: string) => void;
  onReport: (report: WeatherReport) => void;
}) {
  const plantation =
    plantations.find((item) => item.id === selected) || plantations[0];
  const campaign =
    periods.find(
      (item) =>
        item.plantationId === plantation?.id && item.status === "active",
    ) || periods.find((item) => item.plantationId === plantation?.id);
  const field = fields.find((item) => item.id === plantation?.fieldId);
  const center = field ? fieldCentroid(field.geometry.coordinates[0]) : null;
  const [suggestions, setSuggestions] = useState<WeatherStationSuggestion[]>(
      [],
    ),
    [stationId, setStationId] = useState(stations[0]?.id || ""),
    [effectiveFrom, setEffectiveFrom] = useState(today()),
    [window, setWindow] = useState<"7" | "30" | "90" | "custom">("30"),
    [customStart, setCustomStart] = useState(today()),
    [hideWarning, setHideWarning] = useState(false),
    [accumulation, setAccumulation] = useState<WeatherAccumulation | null>(
      null,
    ),
    [accumulating, setAccumulating] = useState(false);
  const [settings, setSettings] = useState<AccumulationSettings>({
    plantationKind: plantation?.kind || "temporary",
    establishment: "sown",
    hasDormancy: plantation?.kind === "permanent",
    campaignStartDate: campaign?.startedOn,
    sowingDate: plantation?.startedOn,
  });
  useEffect(() => {
    if (plantation) {
      setSettings({
        plantationKind: plantation.kind,
        establishment:
          plantation.kind === "temporary" ? "sown" : "not_applicable",
        hasDormancy: plantation.kind === "permanent",
        campaignStartDate: campaign?.startedOn,
        sowingDate: plantation.startedOn,
      });
      setHideWarning(false);
      setAccumulation(null);
    }
  }, [plantation?.id, campaign?.id]);
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
  async function suggest() {
    if (center)
      setSuggestions(
        await api<WeatherStationSuggestion[]>(
          `stations/suggestions?latitude=${center.latitude}&longitude=${center.longitude}`,
        ),
      );
  }
  async function assign() {
    await api(`subjects/plantation/${plantation.id}/station`, {
      method: "POST",
      body: JSON.stringify({
        stationId,
        effectiveFrom: dateTime(effectiveFrom),
      }),
    });
    onReport(
      await api<WeatherReport>(`subjects/plantation/${plantation.id}/report`),
    );
  }
  async function loadAccumulation() {
    if (!advanced || !effectiveStart) return;
    setAccumulating(true);
    try {
      setAccumulation(
        await api<WeatherAccumulation>(
          `subjects/plantation/${plantation.id}/accumulations`,
          {
            method: "POST",
            body: JSON.stringify({
              from: effectiveStart,
              to: today(),
              ...(campaign ? { campaignId: campaign.id } : {}),
            }),
          },
        ),
      );
    } finally {
      setAccumulating(false);
    }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!advanced || !campaign) return;
    const form = new FormData(event.currentTarget);
    await api(`campaigns/${campaign.id}/agronomic-profiles`, {
      method: "POST",
      body: JSON.stringify({
        cropId: plantation.cultureId,
        varietyId: plantation.varietyId || "default",
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
                className={window === value ? "active" : ""}
                onClick={() => setWindow(value)}
                key={value}
              >
                {value === "custom" ? t.custom : `${value} d`}
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
                  : start.basis === "vegetative_start"
                    ? t.vegetativeStart
                    : t.campaignStart}
          </p>
          <button
            disabled={!advanced || !effectiveStart || accumulating}
            onClick={() => void loadAccumulation()}
          >
            {t.indicators}
          </button>
        </article>
      </div>
      {start.basis === "missing_vegetative_start" && !hideWarning && (
        <aside className="vegetative-warning">
          <p>{t.vegetativeWarning}</p>
          <button
            onClick={() =>
              setSettings((value) => ({
                ...value,
                vegetativeStartDate: today(),
              }))
            }
          >
            {t.indicateDate}
          </button>
          <button onClick={() => setHideWarning(true)}>
            {t.continueWithout}
          </button>
        </aside>
      )}
      <section className="accumulation-dates">
        <h3>{t.effectiveFrom}</h3>
        {plantation.kind === "temporary" ? (
          <>
            <label>
              <span>
                {t.sowingFallback} / {t.transplant}
              </span>
              <select
                value={settings.establishment}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    establishment: event.target
                      .value as AccumulationSettings["establishment"],
                  }))
                }
              >
                <option value="sown">{t.sowingFallback}</option>
                <option value="transplanted">{t.transplant}</option>
              </select>
            </label>
            {settings.establishment === "sown" ? (
              <>
                <label>
                  <span>{t.sowingFallback}</span>
                  <input
                    type="date"
                    value={settings.sowingDate || ""}
                    onChange={(event) =>
                      setSettings((value) => ({
                        ...value,
                        sowingDate: event.target.value,
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
            ) : (
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
            )}
          </>
        ) : (
          <>
            <label className="check-line">
              <input
                type="checkbox"
                checked={settings.hasDormancy}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    hasDormancy: event.target.checked,
                  }))
                }
              />
              <span>{t.vegetativeStart}</span>
            </label>
            <label>
              <span>
                {settings.hasDormancy ? t.vegetativeStart : t.campaignStart}
              </span>
              <input
                type="date"
                value={
                  (settings.hasDormancy
                    ? settings.vegetativeStartDate
                    : settings.campaignStartDate) || ""
                }
                onChange={(event) =>
                  setSettings((value) =>
                    settings.hasDormancy
                      ? {
                          ...value,
                          vegetativeStartDate: event.target.value || undefined,
                        }
                      : {
                          ...value,
                          campaignStartDate: event.target.value || undefined,
                        },
                  )
                }
              />
            </label>
          </>
        )}
      </section>
      {accumulation && <AccumulationView data={accumulation} t={t} />}
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
    </section>
  );
}

function AccumulationView({
  data,
  t,
}: {
  data: WeatherAccumulation;
  t: WeatherCopy;
}) {
  const labels: Record<keyof WeatherAccumulation["values"], string> = {
    et0: t.et0,
    degreeDays: t.degreeDays,
    chillHoursBelow7_2C: t.chillHours,
    modifiedChillHours: t.modifiedChill,
    utahChillUnits: t.utah,
    dynamicModelChillPortions: t.dynamicChill,
    estimatedLeafWetnessHours: t.leafWetness,
    solarEnergy: t.solarEnergy,
    estimatedPar: t.par,
    estimatedDli: t.dli,
  };
  return (
    <section className="accumulation-results">
      <header>
        <h3>{t.indicators}</h3>
        <span>
          {data.from} → {data.to} · {data.daysWithData}/{data.daysRequested}
        </span>
      </header>
      <div>
        {Object.entries(data.values).map(([key, value]) => (
          <article key={key}>
            <span>{labels[key as keyof typeof labels]}</span>
            <b>
              {value.total.toFixed(2)} {value.unit}
            </b>
            <small>
              {t.observed}: {value.observed.toFixed(2)} · {t.forecast}:{" "}
              {value.forecast.toFixed(2)}
            </small>
            <em>
              {value.dailyAverage === null
                ? "—"
                : `${value.dailyAverage.toFixed(2)} ${value.unit}/d`}
            </em>
          </article>
        ))}
      </div>
      <aside>
        <strong>{t.provenance}</strong>
        {data.provenance.map((item) => (
          <span key={`${item.stationId}-${item.effectiveFrom}`}>
            {item.stationName}: {item.effectiveFrom.slice(0, 10)} →{" "}
            {item.effectiveTo?.slice(0, 10) || data.to}
          </span>
        ))}
      </aside>
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
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="holding-dialog">
        <header>
          <h2>{kind === "create" ? t.addStation : t.rename}</h2>
          <button onClick={onClose} aria-label={t.cancel}>
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
          {error && <p className="form-error">{t.loadError}</p>}
          <footer>
            <button type="button" className="subtle-button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="primary-action" disabled={saving}>
              {t.save}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
