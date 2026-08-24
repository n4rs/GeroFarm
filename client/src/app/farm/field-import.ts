import { unzipSync } from "fflate";
import type { FieldPolygon } from "@shared/fields";

export type ImportedFieldPolygon = { name: string; geometry: FieldPolygon };

export function parseCoordinateText(value: string): FieldPolygon | null {
  const positions = value.trim().split(/\s+/).map((token) => token.split(",").slice(0, 2).map(Number) as [number, number]).filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
  if (positions.length < 3) return null;
  const first = positions[0]; const last = positions.at(-1)!;
  if (first[0] !== last[0] || first[1] !== last[1]) positions.push([...first]);
  return positions.length >= 4 ? { type: "Polygon", coordinates: [positions] } : null;
}

export function parseKml(value: string): ImportedFieldPolygon[] {
  const document = new DOMParser().parseFromString(value, "application/xml");
  if (document.querySelector("parsererror")) return [];
  return Array.from(document.getElementsByTagNameNS("*", "Polygon")).flatMap((polygon, index) => {
    const outer = polygon.getElementsByTagNameNS("*", "outerBoundaryIs")[0]; const coordinates = outer?.getElementsByTagNameNS("*", "coordinates")[0]?.textContent; const geometry = coordinates ? parseCoordinateText(coordinates) : null;
    if (!geometry) return [];
    let parent: Element | null = polygon; while (parent && parent.localName !== "Placemark") parent = parent.parentElement;
    const name = parent?.getElementsByTagNameNS("*", "name")[0]?.textContent?.trim() || `Polygon ${index + 1}`;
    return [{ name, geometry }];
  });
}

export async function parseFieldFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".kmz")) {
    const entries = unzipSync(bytes); const kmlName = Object.keys(entries).find((name) => name.toLowerCase().endsWith(".kml"));
    return kmlName ? parseKml(new TextDecoder().decode(entries[kmlName])) : [];
  }
  return parseKml(new TextDecoder().decode(bytes));
}
