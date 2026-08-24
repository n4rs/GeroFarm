import express from "express";
import { z } from "zod";
import {
  aggregateWeatherIndicators,
  dateRange,
  indicatorInputFromReport,
  weatherCapabilities,
  type WeatherAccumulation,
  type WeatherAgronomicProfile,
  type WeatherIndicatorResponse,
  type WeatherReport,
  type WeatherStationAssignment,
  type WeatherStationInput,
  type WeatherStationProvenance,
  type WeatherStationSuggestion,
  type WeatherVirtualStation,
} from "@shared/weather";
import { assertSameOrigin } from "./organization-selection";
import { CoreApiError, geroCore } from "./gero-core-client";
import type { FarmContextResolver } from "./farm-context";

const uuid = z.string().uuid();
const subjectType = z.enum(["plantation", "campaign"]);
const subjectId = z.string().trim().min(1).max(150);
const coordinates = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
const at = z.string().datetime();
const stationInput = z.object({
  name: z.string().trim().min(1).max(150),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationM: z.number().min(-500).max(9000).nullable(),
  timezone: z.string().trim().min(1).max(100),
});
const assignmentInput = z.object({ stationId: uuid, effectiveFrom: at });
const indicatorInput = z
  .object({
    campaignId: subjectId.optional(),
    at,
    latitude: z.number().min(-90).max(90),
    elevationM: z.number().min(-500).max(9000),
    temperatureMinC: z.number().min(-100).max(70),
    temperatureMaxC: z.number().min(-100).max(70),
    relativeHumidityMeanPercent: z.number().min(0).max(100),
    windSpeed2mMps: z.number().min(0),
    solarRadiationMjM2Day: z.number().min(0),
    temporalStatus: z.enum(["observed", "forecast"]),
    hourly: z
      .array(
        z.object({
          temperatureC: z.number().min(-100).max(70),
          relativeHumidityPercent: z.number().min(0).max(100).nullable(),
          precipitationMm: z.number().min(0).nullable(),
          solarRadiationWm2: z.number().min(0).nullable(),
        }),
      )
      .min(1)
      .max(48),
    parameters: z
      .object({
        degreeDayBaseC: z.number().optional(),
        degreeDayUpperC: z.number().nullable().optional(),
        leafWetnessHumidityPercent: z.number().min(0).max(100).optional(),
      })
      .optional(),
  })
  .refine((value) => value.temperatureMaxC >= value.temperatureMinC, {
    path: ["temperatureMaxC"],
  });
const profileInput = z.object({
  cropId: subjectId,
  varietyId: subjectId,
  methodVersion: z.string().trim().min(1).max(50),
  parameters: z.record(z.string(), z.unknown()),
  validFrom: at,
});
const accumulationInput = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
    campaignId: subjectId.optional(),
  })
  .refine((value) => value.from <= value.to, { path: ["to"] })
  .refine((value) => dateRange(value.from, value.to).length <= 366, {
    path: ["from"],
    message: "Accumulation windows are limited to 366 days per request",
  });

const queryString = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) params.set(key, String(value));
  return params.toString();
};
const safeSegment = (value: string) => encodeURIComponent(value);
function requireWeatherDepth(
  selected: Awaited<ReturnType<FarmContextResolver>>,
  capability: "history" | "campaignProfiles",
) {
  if (
    !weatherCapabilities(
      selected.access?.entitlements.features.agronomicWeather,
    )[capability]
  )
    throw new CoreApiError(
      403,
      "Weather capability is not enabled for this plan",
      "WEATHER_LEVEL_REQUIRED",
    );
}

export function createWeatherRouter(resolveContext: FarmContextResolver) {
  const router = express.Router();
  const context = async (req: express.Request) => resolveContext(req);

  router.get("/forecast", async (req, res, next) => {
    try {
      const selected = await context(req),
        input = coordinates.parse(req.query);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.get<WeatherReport>(
          req,
          selected.organization.id,
          `forecast?${queryString(input)}`,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/historical", async (req, res, next) => {
    try {
      const selected = await context(req);
      requireWeatherDepth(selected, "history");
      const input = coordinates.extend({ at }).parse(req.query);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.get<WeatherReport>(
          req,
          selected.organization.id,
          `historical?${queryString(input)}`,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/stations", async (req, res, next) => {
    try {
      const selected = await context(req);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.get<WeatherVirtualStation[]>(
          req,
          selected.organization.id,
          "stations",
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post("/stations", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const selected = await context(req),
        input = stationInput.parse(req.body) as WeatherStationInput;
      res
        .status(201)
        .set("cache-control", "no-store")
        .json({
          data: await geroCore.weather.post<WeatherVirtualStation>(
            req,
            selected.organization.id,
            "stations",
            input,
          ),
        });
    } catch (error) {
      next(error);
    }
  });
  router.patch("/stations/:stationId", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const selected = await context(req),
        stationId = uuid.parse(req.params.stationId),
        input = z
          .object({ name: z.string().trim().min(1).max(150) })
          .parse(req.body);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.patch<WeatherVirtualStation>(
          req,
          selected.organization.id,
          `stations/${stationId}`,
          input,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post("/stations/:stationId/archive", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const selected = await context(req),
        stationId = uuid.parse(req.params.stationId);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.post<WeatherVirtualStation>(
          req,
          selected.organization.id,
          `stations/${stationId}/archive`,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/stations/suggestions", async (req, res, next) => {
    try {
      const selected = await context(req),
        input = coordinates.parse(req.query);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.get<WeatherStationSuggestion[]>(
          req,
          selected.organization.id,
          `stations/suggestions?${queryString(input)}`,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/stations/:stationId/report", async (req, res, next) => {
    try {
      const selected = await context(req),
        stationId = uuid.parse(req.params.stationId),
        instant =
          req.query.at === undefined ? undefined : at.parse(req.query.at);
      if (instant) requireWeatherDepth(selected, "history");
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.get<WeatherReport>(
          req,
          selected.organization.id,
          `stations/${stationId}/report${instant ? `?${queryString({ at: instant })}` : ""}`,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get(
    "/subjects/:subjectType/:subjectId/station",
    async (req, res, next) => {
      try {
        const selected = await context(req),
          type = subjectType.parse(req.params.subjectType),
          id = subjectId.parse(req.params.subjectId),
          instant =
            req.query.at === undefined ? undefined : at.parse(req.query.at);
        res.set("cache-control", "no-store").json({
          data: await geroCore.weather.get<WeatherStationProvenance>(
            req,
            selected.organization.id,
            `subjects/${type}/${safeSegment(id)}/station${instant ? `?${queryString({ at: instant })}` : ""}`,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/subjects/:subjectType/:subjectId/station",
    async (req, res, next) => {
      try {
        assertSameOrigin(req);
        const selected = await context(req),
          type = subjectType.parse(req.params.subjectType),
          id = subjectId.parse(req.params.subjectId),
          input = assignmentInput.parse(req.body);
        res
          .status(201)
          .set("cache-control", "no-store")
          .json({
            data: await geroCore.weather.post<WeatherStationAssignment>(
              req,
              selected.organization.id,
              `subjects/${type}/${safeSegment(id)}/station`,
              input,
            ),
          });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/subjects/:subjectType/:subjectId/report",
    async (req, res, next) => {
      try {
        const selected = await context(req),
          type = subjectType.parse(req.params.subjectType),
          id = subjectId.parse(req.params.subjectId),
          instant =
            req.query.at === undefined ? undefined : at.parse(req.query.at);
        if (instant) requireWeatherDepth(selected, "history");
        res.set("cache-control", "no-store").json({
          data: await geroCore.weather.get<WeatherReport>(
            req,
            selected.organization.id,
            `subjects/${type}/${safeSegment(id)}/report${instant ? `?${queryString({ at: instant })}` : ""}`,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/subjects/:subjectType/:subjectId/accumulations",
    async (req, res, next) => {
      try {
        assertSameOrigin(req);
        const selected = await context(req);
        requireWeatherDepth(selected, "campaignProfiles");
        const type = subjectType.parse(req.params.subjectType),
          id = subjectId.parse(req.params.subjectId),
          input = accumulationInput.parse(req.body),
          dates = dateRange(input.from, input.to);
        const rows: Array<{
          response: WeatherIndicatorResponse;
          report: WeatherReport;
        }> = [];
        let cursor = 0;
        const worker = async () => {
          while (cursor < dates.length) {
            const date = dates[cursor++];
            try {
              const report = await geroCore.weather.get<WeatherReport>(
                  req,
                  selected.organization.id,
                  `subjects/${type}/${safeSegment(id)}/report?${queryString({ at: new Date(`${date}T12:00:00.000Z`).toISOString() })}`,
                ),
                indicatorInput = indicatorInputFromReport(
                  report,
                  input.campaignId,
                );
              if (!indicatorInput) continue;
              const response =
                await geroCore.weather.post<WeatherIndicatorResponse>(
                  req,
                  selected.organization.id,
                  "indicators",
                  indicatorInput,
                );
              rows.push({ response, report });
            } catch (error) {
              if (!(error instanceof CoreApiError && error.status === 404))
                throw error;
            }
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(4, dates.length) }, worker),
        );
        const result: WeatherAccumulation = aggregateWeatherIndicators(
          input.from,
          input.to,
          rows,
        );
        res.set("cache-control", "no-store").json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post("/indicators", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const selected = await context(req),
        input = indicatorInput.parse(req.body);
      res.set("cache-control", "no-store").json({
        data: await geroCore.weather.post<WeatherIndicatorResponse>(
          req,
          selected.organization.id,
          "indicators",
          input,
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    "/campaigns/:campaignId/agronomic-profiles",
    async (req, res, next) => {
      try {
        assertSameOrigin(req);
        const selected = await context(req);
        requireWeatherDepth(selected, "campaignProfiles");
        const campaignId = subjectId.parse(req.params.campaignId),
          input = profileInput.parse(req.body);
        res
          .status(201)
          .set("cache-control", "no-store")
          .json({
            data: await geroCore.weather.post<WeatherAgronomicProfile>(
              req,
              selected.organization.id,
              `campaigns/${safeSegment(campaignId)}/agronomic-profiles`,
              input,
            ),
          });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
