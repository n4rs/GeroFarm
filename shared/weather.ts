export type WeatherTemporalStatus = "observed" | "forecast";
export type WeatherValueSource = "measured" | "estimated";
export type WeatherPrecipitationType =
  | "none"
  | "rain"
  | "snow"
  | "sleet"
  | "mixed"
  | "unknown";

export type WeatherDataPoint = {
  at: string;
  summary: string | null;
  icon: string | null;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationProbability: number | null;
  precipitationIntensityMmPerHour: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  windBearingDegrees: number | null;
  pressureHpa: number | null;
  cloudCoverPercent: number | null;
  uvIndex: number | null;
  dewPointC: number | null;
  elevationM: number | null;
  solarRadiationWm2: number | null;
  precipitationAccumulationMm: number | null;
  precipitationType: WeatherPrecipitationType | null;
  temporalStatus: WeatherTemporalStatus;
  valueSource: WeatherValueSource;
};
export type WeatherDailyPoint = WeatherDataPoint & {
  sunriseAt: string | null;
  sunsetAt: string | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
};
export type WeatherVirtualStation = {
  id: string;
  organizationId: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  timezone: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type WeatherStationAssignment = {
  id: string;
  stationId: string;
  subjectType: "plantation" | "campaign";
  subjectId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};
export type WeatherStationProvenance = {
  station: WeatherVirtualStation;
  assignment: WeatherStationAssignment | null;
  requestedFor: string;
};
export type WeatherStationSuggestion = {
  station: WeatherVirtualStation;
  distanceKm: number;
};
export type WeatherDerivation = {
  value: number | null;
  unit: string;
  method: string;
  version: string;
  valueSource: "estimated";
  temporalStatus: WeatherTemporalStatus;
  inputs: Record<string, unknown>;
};
export type AgronomicWeatherIndicators = {
  et0: WeatherDerivation;
  degreeDays: WeatherDerivation;
  chillHoursBelow7_2C: WeatherDerivation;
  modifiedChillHours: WeatherDerivation;
  utahChillUnits: WeatherDerivation;
  dynamicModelChillPortions: WeatherDerivation;
  estimatedLeafWetnessHours: WeatherDerivation;
  solarEnergy: WeatherDerivation;
  estimatedPar: WeatherDerivation;
  estimatedDli: WeatherDerivation;
};
export type WeatherAgronomicProfile = {
  id: string;
  organizationId: string;
  cropId: string;
  varietyId: string;
  campaignId: string;
  methodVersion: string;
  parameters: Record<string, unknown>;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
};
export type WeatherReport = {
  latitude: number;
  longitude: number;
  timezone: string | null;
  units: "metric";
  current: WeatherDataPoint | null;
  hourly: { summary: string | null; data: WeatherDataPoint[] };
  daily: { summary: string | null; data: WeatherDailyPoint[] };
  station: WeatherStationProvenance | null;
  meta: {
    provider: string;
    fetchedAt: string;
    cached: boolean;
    stale: boolean;
    cache: {
      status: "miss" | "fresh" | "stale";
      freshUntil: string;
      staleUntil: string;
    };
    contractVersion: "2";
  };
};

export type WeatherStationInput = {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  timezone: string;
};
export type WeatherSubjectType = "plantation" | "campaign";
export type WeatherIndicatorInput = {
  campaignId?: string;
  at: string;
  latitude: number;
  elevationM: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  relativeHumidityMeanPercent: number;
  windSpeed2mMps: number;
  solarRadiationMjM2Day: number;
  temporalStatus: WeatherTemporalStatus;
  hourly: Array<{
    temperatureC: number;
    relativeHumidityPercent: number | null;
    precipitationMm: number | null;
    solarRadiationWm2: number | null;
  }>;
  parameters?: {
    degreeDayBaseC?: number;
    degreeDayUpperC?: number | null;
    leafWetnessHumidityPercent?: number;
  };
};
export type WeatherIndicatorResponse = {
  profile: WeatherAgronomicProfile | null;
  indicators: AgronomicWeatherIndicators;
};
export type WeatherProfileInput = {
  cropId: string;
  varietyId: string;
  methodVersion: string;
  parameters: Record<string, unknown>;
  validFrom: string;
};
export type WeatherIndicatorKey = keyof AgronomicWeatherIndicators;
export type WeatherAccumulation = {
  from: string;
  to: string;
  daysRequested: number;
  daysWithData: number;
  values: Record<
    WeatherIndicatorKey,
    {
      unit: string;
      observed: number;
      forecast: number;
      total: number;
      dailyAverage: number | null;
    }
  >;
  provenance: Array<{
    stationId: string;
    stationName: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }>;
};

export const weatherContractVersion = "2" as const;
export type AgronomicWeatherLevel =
  | "essential"
  | "campaign"
  | "professional"
  | "custom";
export function weatherCapabilities(value: unknown) {
  const level: AgronomicWeatherLevel =
    value === "campaign" || value === "professional" || value === "custom"
      ? value
      : "essential";
  return {
    level,
    history: level !== "essential",
    campaignProfiles: level !== "essential",
    crossCampaignComparison: level === "professional" || level === "custom",
    export: level === "professional" || level === "custom",
  };
}

export function activeStationCount(stations: WeatherVirtualStation[]) {
  return stations.filter((station) => !station.archivedAt).length;
}

export function fieldCentroid(coordinates: Array<[number, number]>) {
  const points =
    coordinates.length > 1 &&
    coordinates[0][0] === coordinates.at(-1)?.[0] &&
    coordinates[0][1] === coordinates.at(-1)?.[1]
      ? coordinates.slice(0, -1)
      : coordinates;
  if (!points.length) return null;
  return {
    longitude: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    latitude: points.reduce((sum, point) => sum + point[1], 0) / points.length,
  };
}

export type AccumulationSettings = {
  plantationKind: "temporary" | "permanent";
  establishment: "sown" | "transplanted" | "not_applicable";
  hasDormancy: boolean;
  sowingDate?: string;
  emergenceDate?: string;
  transplantDate?: string;
  vegetativeStartDate?: string;
  campaignStartDate?: string;
};
export type AccumulationStart = {
  date: string | null;
  basis:
    | "emergence"
    | "sowing_fallback"
    | "transplant"
    | "vegetative_start"
    | "campaign_start"
    | "missing_vegetative_start";
};

export function accumulationStart(
  settings: AccumulationSettings,
): AccumulationStart {
  if (
    settings.plantationKind === "temporary" &&
    settings.establishment === "sown"
  )
    return settings.emergenceDate
      ? { date: settings.emergenceDate, basis: "emergence" }
      : { date: settings.sowingDate || null, basis: "sowing_fallback" };
  if (settings.plantationKind === "temporary")
    return { date: settings.transplantDate || null, basis: "transplant" };
  if (settings.hasDormancy)
    return settings.vegetativeStartDate
      ? { date: settings.vegetativeStartDate, basis: "vegetative_start" }
      : { date: null, basis: "missing_vegetative_start" };
  return { date: settings.campaignStartDate || null, basis: "campaign_start" };
}

export function accumulationWindowStart(
  endDate: string,
  window: "7" | "30" | "90" | "custom",
  customStart?: string,
) {
  if (window === "custom") return customStart || null;
  const end = new Date(`${endDate}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() - (Number(window) - 1));
  return end.toISOString().slice(0, 10);
}

const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

/** Normalises Core report fields into the Core indicator request; it never computes an agronomic indicator. */
export function indicatorInputFromReport(
  report: WeatherReport,
  campaignId?: string,
): WeatherIndicatorInput | null {
  const requestedDate = (
    report.station?.requestedFor ||
    report.current?.at ||
    report.daily.data[0]?.at ||
    ""
  ).slice(0, 10);
  const day =
    report.daily.data.find(
      (point) => point.at.slice(0, 10) === requestedDate,
    ) || report.daily.data[0];
  const sameDay = day
    ? report.hourly.data.filter(
        (point) => point.at.slice(0, 10) === day.at.slice(0, 10),
      )
    : [];
  const hourly = (sameDay.length ? sameDay : report.hourly.data)
    .filter((point) => point.temperatureC !== null)
    .slice(0, 48);
  if (
    !day ||
    day.temperatureMinC === null ||
    day.temperatureMaxC === null ||
    !hourly.length
  )
    return null;
  const humidity = mean(
    hourly.flatMap((point) =>
      point.humidityPercent === null ? [] : [point.humidityPercent],
    ),
  );
  const windKph = mean(
    hourly.flatMap((point) =>
      point.windSpeedKph === null ? [] : [point.windSpeedKph],
    ),
  );
  const solar = hourly.flatMap((point) =>
    point.solarRadiationWm2 === null ? [] : [point.solarRadiationWm2],
  );
  if (humidity === null || windKph === null || !solar.length) return null;
  return {
    ...(campaignId ? { campaignId } : {}),
    at: day.at,
    latitude: report.latitude,
    elevationM: day.elevationM ?? report.current?.elevationM ?? 0,
    temperatureMinC: day.temperatureMinC,
    temperatureMaxC: day.temperatureMaxC,
    relativeHumidityMeanPercent: humidity,
    windSpeed2mMps: windKph / 3.6,
    // Unit/time integration required by the Core input contract. The returned solar-energy indicator remains Core-derived and versioned.
    solarRadiationMjM2Day: solar.reduce(
      (sum, value) => sum + value * 0.0036,
      0,
    ),
    temporalStatus: day.temporalStatus,
    hourly: hourly.map((point) => ({
      temperatureC: point.temperatureC!,
      relativeHumidityPercent: point.humidityPercent,
      precipitationMm: point.precipitationAccumulationMm,
      solarRadiationWm2: point.solarRadiationWm2,
    })),
  };
}

export function dateRange(from: string, to: string) {
  const start = new Date(`${from}T12:00:00Z`),
    end = new Date(`${to}T12:00:00Z`);
  if (
    !Number.isFinite(start.valueOf()) ||
    !Number.isFinite(end.valueOf()) ||
    start > end
  )
    return [];
  const result: string[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  )
    result.push(cursor.toISOString().slice(0, 10));
  return result;
}

export function aggregateWeatherIndicators(
  from: string,
  to: string,
  rows: Array<{ response: WeatherIndicatorResponse; report: WeatherReport }>,
): WeatherAccumulation {
  const keys: WeatherIndicatorKey[] = [
    "et0",
    "degreeDays",
    "chillHoursBelow7_2C",
    "modifiedChillHours",
    "utahChillUnits",
    "dynamicModelChillPortions",
    "estimatedLeafWetnessHours",
    "solarEnergy",
    "estimatedPar",
    "estimatedDli",
  ];
  const values = Object.fromEntries(
    keys.map((key) => {
      const items = rows
        .map(({ response }) => response.indicators[key])
        .filter((item) => item.value !== null);
      const observed = items
          .filter((item) => item.temporalStatus === "observed")
          .reduce((sum, item) => sum + item.value!, 0),
        forecast = items
          .filter((item) => item.temporalStatus === "forecast")
          .reduce((sum, item) => sum + item.value!, 0),
        total = observed + forecast;
      return [
        key,
        {
          unit: items[0]?.unit || "",
          observed,
          forecast,
          total,
          dailyAverage: items.length ? total / items.length : null,
        },
      ];
    }),
  ) as WeatherAccumulation["values"];
  const provenance = new Map<
    string,
    WeatherAccumulation["provenance"][number]
  >();
  for (const { report } of rows) {
    const station = report.station?.station,
      assignment = report.station?.assignment;
    if (station) {
      const key = assignment?.id || `${station.id}:direct`;
      provenance.set(key, {
        stationId: station.id,
        stationName: station.name,
        effectiveFrom:
          assignment?.effectiveFrom || report.station!.requestedFor,
        effectiveTo: assignment?.effectiveTo || null,
      });
    }
  }
  return {
    from,
    to,
    daysRequested: dateRange(from, to).length,
    daysWithData: rows.length,
    values,
    provenance: [...provenance.values()].sort((a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom),
    ),
  };
}
