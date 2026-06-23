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
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const BENGALURU: [number, number] = [12.9716, 77.5946];

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapCenter(BENGALURU);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(coords);
        setMapCenter(coords);
      },
      () => {
        // Geolocation denied — default to Bengaluru center
        setMapCenter(BENGALURU);
      },
    );
  }, []);

  // Auto-load nearby POIs for the initial center point
  useEffect(() => {
    const center = currentLocation ?? BENGALURU;
    api.nearby(center[0], center[1], ["hospital", "police", "fuel"])
      .then((res) => {
        if (res.pois?.length) setPois(res.pois);
      })
      .catch(() => {});
  }, [currentLocation]);

  useEffect(() => {
    const load = () => api.recentEvents(30).then(setIncidents).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (lat: number, lon: number) => {
    if (pickMode === "source") {
      setSource([lat, lon]);
      setMapCenter([lat, lon]);
    }
    if (pickMode === "destination") {
      setDestination([lat, lon]);
      setMapCenter([lat, lon]);
    }
    setPickMode(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3 px-5 pb-6">
      <div className="lg:col-span-2">
        <MapView
          center={mapCenter}
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
          onSourceChange={(coords) => {
            setSource(coords);
            if (coords) setMapCenter(coords);
          }}
          onDestinationChange={(coords) => {
            setDestination(coords);
            if (coords) setMapCenter(coords);
          }}
          routeBundle={routeBundle}
          onRouteBundle={setRouteBundle}
        />
        <NearbyDiscovery
          centerLocation={currentLocation ?? source}
          pois={pois}
          onPois={setPois}
          onSelectPoi={setMapCenter}
        />
        <EmergencyPanel
          onLocate={(coords) => {
            setCurrentLocation(coords);
            setMapCenter(coords);
          }}
          onDestination={(coords) => {
            setDestination(coords);
            setMapCenter(coords);
          }}
          onRouteBundle={setRouteBundle}
        />
        <RecommendationPanel />
      </div>
    </div>
  );
}
