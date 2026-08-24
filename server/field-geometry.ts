import area from "@turf/area";
import polygonClipping from "polygon-clipping";
import type { FieldPolygon } from "@shared/fields";

type Position = FieldPolygon["coordinates"][0][number];

function orientation(a: Position, b: Position, c: Position) { const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]); return Math.abs(value) < 1e-12 ? 0 : value > 0 ? 1 : 2; }
function intersects(a: Position, b: Position, c: Position, d: Position) { return orientation(a, b, c) !== orientation(a, b, d) && orientation(c, d, a) !== orientation(c, d, b); }

export function polygonSelfIntersects(geometry: FieldPolygon) {
  const ring = geometry.coordinates[0]; const segmentCount = ring.length - 1;
  for (let first = 0; first < segmentCount; first++) for (let second = first + 1; second < segmentCount; second++) {
    if (Math.abs(first - second) <= 1 || (first === 0 && second === segmentCount - 1)) continue;
    if (intersects(ring[first], ring[first + 1], ring[second], ring[second + 1])) return true;
  }
  return false;
}

export function polygonAreaHa(geometry: FieldPolygon) {
  return area({ type: "Feature", properties: {}, geometry }) / 10_000;
}

export function polygonOverlapAreaHa(first: FieldPolygon, second: FieldPolygon) {
  const intersection = polygonClipping.intersection(first.coordinates, second.coordinates);
  if (!intersection.length) return 0;
  return area({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: intersection } }) / 10_000;
}

export function validateFieldGeometry(geometry: FieldPolygon) {
  const calculatedArea = polygonAreaHa(geometry);
  if (!Number.isFinite(calculatedArea) || calculatedArea < 0.0001) throw new FieldDomainError(400, "FIELD_GEOMETRY_AREA_INVALID");
  if (polygonSelfIntersects(geometry)) throw new FieldDomainError(400, "FIELD_GEOMETRY_SELF_INTERSECTION");
  return calculatedArea;
}

export class FieldDomainError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly details?: unknown) { super(code); }
}
