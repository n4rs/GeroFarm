import express from "express";
import { z } from "zod";
import type {
  AgronomicWeatherAccumulation,
  WeatherAgronomicProfile,
  WeatherReport,
  WeatherStationAssignment,
  WeatherStationInput,
  WeatherStationProvenance,
  WeatherStationSuggestion,
  WeatherVirtualStation,
} from "@shared/weather";
import { weatherCapabilities } from "@shared/weather";
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
const profileInput = z.object({
  cropId: subjectId,
  varietyId: subjectId,
  methodVersion: z.string().trim().min(1).max(50),
  parameters: z.record(z.string(), z.unknown()),
  validFrom: at,
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
      res
        .set("cache-control", "no-store")
        .json({
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
        res
          .set("cache-control", "no-store")
          .json({
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
        res
          .set("cache-control", "no-store")
          .json({
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
  router.get(
    "/subjects/:subjectType/:subjectId/agronomic-accumulation",
    async (req, res, next) => {
      try {
        const selected = await context(req);
        requireWeatherDepth(selected, "campaignProfiles");
        const type = subjectType.parse(req.params.subjectType),
          id = subjectId.parse(req.params.subjectId),
          input = z
            .object({
              from: z.string().date(),
              to: z.string().date(),
              campaignId: subjectId.optional(),
            })
            .refine((value) => value.to >= value.from, { path: ["to"] })
            .parse(req.query);
        res
          .set("cache-control", "no-store")
          .json({
            data: await geroCore.weather.get<AgronomicWeatherAccumulation>(
              req,
              selected.organization.id,
              `subjects/${type}/${safeSegment(id)}/agronomic-accumulation?${queryString(input)}`,
            ),
          });
      } catch (error) {
        next(error);
      }
    },
  );
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
