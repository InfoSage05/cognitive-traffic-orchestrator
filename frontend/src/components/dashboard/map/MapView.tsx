import { useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { activeTileProvider } from "@/lib/mapProviders";
import { decodePolyline } from "@/lib/polyline";
import type { EventBundle, NearbyPoi, RouteSummary } from "@/lib/api";

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

function makeDivIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:#0a0a14;
      width:26px;height:26px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;
      border:2px solid rgba(255,255,255,0.6);
      box-shadow:0 0 8px ${color};
    ">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const ICONS = {
  current: makeDivIcon("oklch(0.7 0.2 195)", "•"),
  source: makeDivIcon("oklch(0.75 0.2 155)", "S"),
  destination: makeDivIcon("oklch(0.65 0.25 25)", "D"),
  incident: makeDivIcon("oklch(0.82 0.18 85)", "!"),
  poi: makeDivIcon("oklch(0.66 0.24 295)", "•"),
};

interface ClickCaptureProps {
  enabled: boolean;
  onMapClick: (lat: number, lon: number) => void;
}

function ClickCapture({ enabled, onMapClick }: ClickCaptureProps) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  currentLocation: [number, number] | null;
  source: [number, number] | null;
  destination: [number, number] | null;
  bestRoute: RouteSummary | null;
  nearbyPois: NearbyPoi[];
  incidents: EventBundle[];
  pickMode: "source" | "destination" | null;
  onMapClick: (lat: number, lon: number) => void;
}

export function MapView({
  currentLocation,
  source,
  destination,
  bestRoute,
  nearbyPois,
  incidents,
  pickMode,
  onMapClick,
}: Props) {
  const routeLine = useMemo(() => decodePolyline(bestRoute?.geometry), [bestRoute?.geometry]);
  const center = currentLocation ?? source ?? BENGALURU_CENTER;

  return (
    <div className="glass rounded-2xl p-2 h-[560px] overflow-hidden relative">
      {pickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium glow">
          Click the map to set {pickMode}
        </div>
      )}
      <MapContainer center={center} zoom={12} className="w-full h-full rounded-xl" style={{ background: "#0a0a14" }}>
        <TileLayer url={activeTileProvider.tileUrl} attribution={activeTileProvider.attribution} />
        <ClickCapture enabled={pickMode !== null} onMapClick={onMapClick} />

        {currentLocation && (
          <Marker position={currentLocation} icon={ICONS.current}>
            <Popup>Current location</Popup>
          </Marker>
        )}
        {source && (
          <Marker position={source} icon={ICONS.source}>
            <Popup>Source</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={destination} icon={ICONS.destination}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {routeLine.length > 1 && (
          <Polyline positions={routeLine} pathOptions={{ color: "oklch(0.7 0.2 195)", weight: 4, opacity: 0.85 }} />
        )}
        {nearbyPois
          .filter((p) => p.lat != null && p.lon != null)
          .map((p, idx) => (
            <Marker key={`${p.category}-${idx}`} position={[p.lat as number, p.lon as number]} icon={ICONS.poi}>
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.category} · {p.source}
                {p.distance_m != null && <div>{Math.round(p.distance_m)} m away</div>}
              </Popup>
            </Marker>
          ))}
        {incidents.map((b) => (
          <Marker key={b.event.id} position={[b.event.latitude, b.event.longitude]} icon={ICONS.incident}>
            <Popup>
              <strong>{b.event.event_cause.replace(/_/g, " ")}</strong>
              <br />
              {b.event.corridor} · Risk {b.riskScore}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
