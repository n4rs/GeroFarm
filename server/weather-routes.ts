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
import type { WeatherStore } from "./weather-store";
import { synchronizeWeatherSeries } from "./weather-sync";
import { calculateAgronomicAccumulation } from "./agronomic-weather-engine";

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
const agronomicParameters = z.object({
  plantationKind:z.enum(["temporary","permanent"]), establishment:z.enum(["sown","transplanted","not_applicable"]), hasDormancy:z.boolean(),
  sowingDate:z.string().date().optional(),emergenceDate:z.string().date().optional(),transplantDate:z.string().date().optional(),vegetativeStartDate:z.string().date().optional(),campaignStartDate:z.string().date().optional(),
  degreeDayBaseC:z.number().min(-30).max(50),degreeDayUpperC:z.number().min(-20).max(60).nullable(),leafWetnessHumidityPercent:z.number().min(0).max(100),accumulationWindow:z.enum(["7","30","90","custom"]),customStart:z.string().date().nullable(),
}).strict().superRefine((value,ctx)=>{if(value.degreeDayUpperC!==null&&value.degreeDayUpperC<=value.degreeDayBaseC)ctx.addIssue({code:"custom",path:["degreeDayUpperC"],message:"upper threshold must exceed base"});if(value.accumulationWindow==="custom"&&!value.customStart)ctx.addIssue({code:"custom",path:["customStart"],message:"custom start is required"})});
const profileInput = z.object({
  plantationId: uuid,
  cropId: subjectId,
  varietyId: subjectId,
  methodVersion: z.string().trim().min(1).max(50),
  parameters: agronomicParameters,
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

export function createWeatherRouter(resolveContext: FarmContextResolver, store?: WeatherStore) {
  const router = express.Router();
  const context = async (req: express.Request) => resolveContext(req);

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
  router.get("/subjects/plantation/:subjectId/conditions",async(req,res,next)=>{try{const selected=await context(req),id=uuid.parse(req.params.subjectId),input=z.object({from:z.string().date(),to:z.string().date(),campaignId:uuid.optional()}).refine(value=>value.to>=value.from,{path:["to"]}).parse(req.query);if(input.from!==input.to||input.to<new Date().toISOString().slice(0,10))requireWeatherDepth(selected,"history");if(!store)throw new CoreApiError(503,"GeroFarm weather persistence is unavailable","WEATHER_STORE_UNAVAILABLE");const series=await synchronizeWeatherSeries(req,store,selected.organization.id,id,input.campaignId||null,input.from,input.to),period=series.stationPeriods.at(-1),hourly=series.hourly.map(point=>({...point,summary:null,icon:null})),daily=series.daily.map(point=>({...point,at:`${point.date}T12:00:00Z`,summary:null,icon:null,sunriseAt:null,sunsetAt:null})),fetchedAt=series.meta.fetchedAt||new Date().toISOString();const data:WeatherReport={latitude:period?.station.latitude||0,longitude:period?.station.longitude||0,timezone:series.timezone,units:"metric",current:hourly.filter(point=>point.temporalStatus==="observed").at(-1)||hourly[0]||null,hourly:{summary:null,data:hourly},daily:{summary:null,data:daily},station:period?{station:period.station,assignment:period.assignment,requestedFor:input.to}:null,meta:{provider:"provider-independent-base-series",fetchedAt,cached:series.meta.cached,stale:series.meta.stale,cache:{status:series.meta.cache.status==="fresh"||series.meta.cache.status==="stale"?series.meta.cache.status:"miss",freshUntil:fetchedAt,staleUntil:fetchedAt},contractVersion:"2"}};res.set("cache-control","no-store").json({data})}catch(error){next(error)}});
  router.get(
    "/subjects/:subjectType/:subjectId/agronomic-series",
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
        if (type !== "plantation") throw new CoreApiError(400, "Agronomic series require a plantation", "PLANTATION_REQUIRED");
        if (!store) throw new CoreApiError(503, "GeroFarm weather persistence is unavailable", "WEATHER_STORE_UNAVAILABLE");
        const series = await synchronizeWeatherSeries(req, store, selected.organization.id, id, input.campaignId || null, input.from, input.to);
        const profile = await store.profile(selected.organization.id, id, input.campaignId || null, input.from, input.to);
        const data: AgronomicWeatherAccumulation = calculateAgronomicAccumulation(series, profile, input.campaignId || null);
        await store.saveResult(selected.organization.id, id, input.campaignId || null, data);
        res.set("cache-control", "no-store").json({ data });
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
        if (!store) throw new CoreApiError(503, "GeroFarm weather persistence is unavailable", "WEATHER_STORE_UNAVAILABLE");
        await store.assertScope?.(selected.organization.id,input.plantationId,campaignId);
        res
          .status(201)
          .set("cache-control", "no-store")
          .json({
            data: await store.saveProfile(selected.organization.id, input.plantationId, campaignId, input),
          });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
