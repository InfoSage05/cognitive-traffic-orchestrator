import { useEffect, useState } from "react";
import { api, type EventBundle, type NearbyPoi, type RouteBundle } from "@/lib/api";
import { MapView } from "@/components/dashboard/map/MapView";
import { RoutePlanner } from "@/components/dashboard/map/RoutePlanner";
import { NearbyDiscovery } from "@/components/dashboard/map/NearbyDiscovery";
import { EmergencyPanel } from "@/components/dashboard/map/EmergencyPanel";
import { RecommendationPanel } from "@/components/dashboard/map/RecommendationPanel";

export function MapDashboard() {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [source, setSource] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [pickMode, setPickMode] = useState<"source" | "destination" | null>(null);
  const [routeBundle, setRouteBundle] = useState<RouteBundle | null>(null);
  const [pois, setPois] = useState<NearbyPoi[]>([]);
  const [incidents, setIncidents] = useState<EventBundle[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCurrentLocation([position.coords.latitude, position.coords.longitude]),
      () => {},
    );
  }, []);

  useEffect(() => {
    const load = () => api.recentEvents(20).then(setIncidents).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (lat: number, lon: number) => {
    if (pickMode === "source") setSource([lat, lon]);
    if (pickMode === "destination") setDestination([lat, lon]);
    setPickMode(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3 px-5 pb-6">
      <div className="lg:col-span-2">
        <MapView
          currentLocation={currentLocation}
          source={source}
          destination={destination}
          bestRoute={routeBundle?.best_route ?? null}
          nearbyPois={pois}
          incidents={incidents}
          pickMode={pickMode}
          onMapClick={handleMapClick}
        />
      </div>

      <div className="space-y-4">
        <RoutePlanner
          source={source}
          destination={destination}
          pickMode={pickMode}
          onPickMode={setPickMode}
          onSourceChange={setSource}
          onDestinationChange={setDestination}
          routeBundle={routeBundle}
          onRouteBundle={setRouteBundle}
        />
        <NearbyDiscovery centerLocation={currentLocation ?? source} pois={pois} onPois={setPois} />
        <EmergencyPanel
          onLocate={setCurrentLocation}
          onDestination={setDestination}
          onRouteBundle={setRouteBundle}
        />
        <RecommendationPanel />
      </div>
    </div>
  );
}
