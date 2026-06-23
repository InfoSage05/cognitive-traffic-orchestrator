import { useMemo, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
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

// React-Leaflet controller helper to dynamic pan/zoom
function ChangeMapView({ center, bounds }: { center: [number, number]; bounds?: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      map.setView(center, Math.max(map.getZoom(), 13));
    }
  }, [center, bounds, map]);
  return null;
}

interface Props {
  center: [number, number] | null;
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
  center,
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
  
  const bounds = useMemo(() => {
    if (routeLine.length === 0) return null;
    const lats = routeLine.map((p) => p[0]);
    const lons = routeLine.map((p) => p[1]);
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    );
  }, [routeLine]);

  const mapCenter = center ?? currentLocation ?? source ?? BENGALURU_CENTER;

  return (
    <div className="glass rounded-2xl p-2 h-[560px] overflow-hidden relative">
      {pickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium glow animate-bounce">
          Click the map to set {pickMode}
        </div>
      )}
      <MapContainer center={mapCenter} zoom={12} className="w-full h-full rounded-xl" style={{ background: "#e5e7eb" }}>
        <TileLayer url={activeTileProvider.tileUrl} attribution={activeTileProvider.attribution} />
        <ClickCapture enabled={pickMode !== null} onMapClick={onMapClick} />
        <ChangeMapView center={mapCenter} bounds={bounds} />

        {currentLocation && (
          <Marker position={currentLocation} icon={ICONS.current}>
            <Popup>
              <div className="p-1 font-semibold text-xs">Current location</div>
            </Popup>
          </Marker>
        )}
        {source && (
          <Marker position={source} icon={ICONS.source}>
            <Popup>
              <div className="p-1 font-semibold text-xs text-emerald-400">Route Origin (Start)</div>
            </Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={destination} icon={ICONS.destination}>
            <Popup>
              <div className="p-1 font-semibold text-xs text-rose-400">Route Destination (End)</div>
            </Popup>
          </Marker>
        )}
        {routeLine.length > 1 && (
          <Polyline positions={routeLine} pathOptions={{ color: "oklch(0.7 0.2 195)", weight: 5, opacity: 0.85 }} />
        )}
        {nearbyPois
          .filter((p) => p.lat != null && p.lon != null)
          .map((p, idx) => (
            <Marker key={`${p.category}-${idx}`} position={[p.lat as number, p.lon as number]} icon={ICONS.poi}>
              <Popup>
                <div className="p-1.5 text-xs">
                  <strong className="font-semibold text-indigo-400">{p.name}</strong>
                  <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{p.category.replace(/_/g, " ")} · {p.source}</div>
                  {p.distance_m != null && <div className="text-[10px] text-accent/80 mt-1">{Math.round(p.distance_m)}m away</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        {incidents.map((b) => (
          <Marker key={b.event.id} position={[b.event.latitude, b.event.longitude]} icon={ICONS.incident}>
            <Popup>
              <div className="p-1.5 text-xs">
                <strong className="font-semibold text-amber-400">{b.event.event_cause.replace(/_/g, " ")}</strong>
                <div className="text-[10px] text-muted-foreground mt-0.5">{b.event.corridor}</div>
                <div className="flex gap-2.5 mt-1.5 text-[10px] font-medium border-t border-border/30 pt-1">
                  <span>Risk Score: <b className="text-rose-400">{b.riskScore}</b></span>
                  <span>Duration: <b className="text-cyan-400">{b.predictedDurationHours} hrs</b></span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
