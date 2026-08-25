import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FieldDto } from "@shared/fields";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };

export default function WeatherStationMap({ fields, coordinates, onChange, label }: { fields: FieldDto[]; coordinates: Coordinates | null; onChange: (coordinates: Coordinates) => void; label: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>();
  const fieldsRef = useRef<L.LayerGroup>();
  const markerRef = useRef<L.Marker>();
  const onChangeRef = useRef(onChange);
  const hasActiveFields = fields.some((field) => field.status === "active");

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { center: [39.5, -8], zoom: 7 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: "© OpenStreetMap contributors" }).addTo(map);
    fieldsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.on("click", ({ latlng }) => onChangeRef.current({ latitude: latlng.lat, longitude: latlng.lng }));
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => { cancelAnimationFrame(frame); map.remove(); mapRef.current = undefined; fieldsRef.current = undefined; markerRef.current = undefined; };
  }, []);

  useEffect(() => {
    const map = mapRef.current, group = fieldsRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const bounds = L.latLngBounds([]);
    for (const field of fields.filter((item) => item.status === "active")) {
      const points = field.geometry.coordinates[0].slice(0, -1).map(([longitude, latitude]) => L.latLng(latitude, longitude));
      if (points.length < 3) continue;
      const polygon = L.polygon(points, { color: "#507a39", fillColor: "#aaca72", fillOpacity: .24, weight: 2 }).addTo(group);
      polygon.bindTooltip(field.name);
      bounds.extend(polygon.getBounds());
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
  }, [fields]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!coordinates) { markerRef.current?.remove(); markerRef.current = undefined; return; }
    const point = L.latLng(coordinates.latitude, coordinates.longitude);
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { draggable: true, icon: L.divIcon({ className: "station-map-marker", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
      markerRef.current.on("dragend", () => { const next = markerRef.current!.getLatLng(); onChangeRef.current({ latitude: next.lat, longitude: next.lng }); });
    } else markerRef.current.setLatLng(point);
    if (!hasActiveFields) map.setView(point, 15);
  }, [coordinates, hasActiveFields]);

  return <div className="station-location-map" ref={elementRef} role="application" aria-label={label} />;
}
