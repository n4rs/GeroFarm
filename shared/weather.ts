export type WeatherTemporalStatus = "observed" | "forecast";
export type WeatherValueSource = "measured" | "estimated";
export type WeatherPrecipitationType =
  "none" | "rain" | "snow" | "sleet" | "mixed" | "unknown";

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
export type WeatherAccumulationMetric = WeatherDerivation & {
  coverage: {
    requestedDays: number;
    availableDays: number;
    requestedHours: number;
    availableHours: number;
  };
};
export type AgronomicWeatherAccumulation = {
  contractVersion: "2";
  subject: {
    subjectType: "plantation" | "campaign";
    subjectId: string;
    campaignId: string | null;
  };
  interval: { from: string; to: string; maximumDays: number };
  coverage: {
    requestedDays: number;
    availableDays: number;
    requestedHours: number;
    availableHours: number;
    complete: boolean;
  };
  temporalStatus: { observedHours: number; forecastHours: number };
  valueSource: { measuredHours: number; estimatedHours: number };
  stationPeriods: Array<{
    from: string;
    to: string;
    station: WeatherVirtualStation;
    assignment: WeatherStationAssignment;
  }>;
  profilePeriods: Array<{
    from: string;
    to: string;
    profile: WeatherAgronomicProfile | null;
  }>;
  warnings: Array<{
    code: "STATION_NOT_ASSIGNED" | "PROFILE_NOT_FOUND" | "INCOMPLETE_DAY";
    from: string;
    to: string;
    detail: string;
  }>;
  metrics: {
    [K in keyof AgronomicWeatherIndicators]: WeatherAccumulationMetric;
  };
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
export type WeatherProfileInput = {
  cropId: string;
  varietyId: string;
  methodVersion: string;
  parameters: Record<string, unknown>;
  validFrom: string;
};

export const weatherContractVersion = "2" as const;

export type AgronomicWeatherLevel =
  | "essential"
  | "campaign"
  | "professional"
  | "custom";

export function weatherCapabilities(value: unknown) {
  const level: AgronomicWeatherLevel =
    value === "campaign" ||
    value === "professional" ||
    value === "custom" ||
    value === "essential"
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
  if (points.length < 3)
    return {
      longitude:
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
      latitude:
        points.reduce((sum, point) => sum + point[1], 0) / points.length,
    };
  let twiceArea = 0,
    longitude = 0,
    latitude = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index],
      next = points[(index + 1) % points.length],
      cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    longitude += (current[0] + next[0]) * cross;
    latitude += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12)
    return {
      longitude:
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
      latitude:
        points.reduce((sum, point) => sum + point[1], 0) / points.length,
    };
  return {
    longitude: longitude / (3 * twiceArea),
    latitude: latitude / (3 * twiceArea),
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
