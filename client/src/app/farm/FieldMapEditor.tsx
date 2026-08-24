import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { FieldPolygon } from "@shared/fields";
import type { FieldCopy } from "./field-locales";
import "leaflet/dist/leaflet.css";

export default function FieldMapEditor({ geometry, onChange, copy: t }: { geometry: FieldPolygon | null; onChange: (geometry: FieldPolygon | null) => void; copy: FieldCopy }) {
  const elementRef = useRef<HTMLDivElement>(null); const mapRef = useRef<L.Map>(); const groupRef = useRef<L.LayerGroup>(); const drawingRef = useRef(false); const pointsRef = useRef<Array<[number, number]>>([]); const [drawing, setDrawing] = useState(false); const [points, setPoints] = useState<Array<[number, number]>>([]);

  useEffect(() => { if (!elementRef.current || mapRef.current) return; const map = L.map(elementRef.current, { center: [39.5, -8], zoom: 7 }); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: "© OpenStreetMap contributors" }).addTo(map); const group = L.layerGroup().addTo(map); mapRef.current = map; groupRef.current = group; map.on("click", (event) => { if (!drawingRef.current) return; const next = [...pointsRef.current, [event.latlng.lng, event.latlng.lat] as [number, number]]; pointsRef.current = next; setPoints(next); }); return () => { map.remove(); mapRef.current = undefined; }; }, []);

  useEffect(() => {
    const map = mapRef.current; const group = groupRef.current; if (!map || !group) return; group.clearLayers();
    const editable = geometry?.coordinates[0].slice(0, -1) || points;
    if (editable.length) { const latLngs = editable.map(([longitude, latitude]) => L.latLng(latitude, longitude)); const shape = geometry ? L.polygon(latLngs, { color: "#507a39", fillColor: "#aaca72", fillOpacity: .3, weight: 3 }) : L.polyline(latLngs, { color: "#507a39", dashArray: "6 5", weight: 3 }); shape.addTo(group); if (geometry && latLngs.length > 2) map.fitBounds(shape.getBounds(), { padding: [24, 24], maxZoom: 18 }); }
    if (geometry) geometry.coordinates[0].slice(0, -1).forEach(([longitude, latitude], index) => { const marker = L.marker([latitude, longitude], { draggable: true, icon: L.divIcon({ className: "field-vertex", html: "<span></span>", iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(group); marker.on("dragend", () => { const position = marker.getLatLng(); const ring = geometry.coordinates[0].slice(0, -1).map((item) => [...item] as [number, number]); ring[index] = [position.lng, position.lat]; ring.push([...ring[0]]); onChange({ type: "Polygon", coordinates: [ring] }); }); });
  }, [geometry, points, onChange]);

  function start() { drawingRef.current = true; pointsRef.current = []; setPoints([]); setDrawing(true); onChange(null); }
  function undo() { const next = pointsRef.current.slice(0, -1); pointsRef.current = next; setPoints(next); }
  function finish() { if (pointsRef.current.length < 3) return; const ring = [...pointsRef.current, [...pointsRef.current[0]] as [number, number]]; drawingRef.current = false; setDrawing(false); onChange({ type: "Polygon", coordinates: [ring] }); }
  function clear() { drawingRef.current = false; pointsRef.current = []; setPoints([]); setDrawing(false); onChange(null); }

  return <div className="field-map-block"><div className="field-map-toolbar"><button type="button" onClick={start}>{t.draw}</button>{drawing && <><button type="button" disabled={points.length < 3} onClick={finish}>{t.finish}</button><button type="button" disabled={!points.length} onClick={undo}>{t.undo}</button></>}<button type="button" onClick={clear}>{t.clear}</button></div><div className="field-map-editor" ref={elementRef} /></div>;
}
