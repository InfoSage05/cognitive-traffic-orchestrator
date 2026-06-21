export interface MapTileProvider {
  id: string;
  name: string;
  tileUrl: string;
  attribution: string;
}

export const osmTileProvider: MapTileProvider = {
  id: "osm",
  name: "OpenStreetMap",
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// Seam for a future MapplsTileProvider (using a Mappls Web App key) -- swap this
// export, or make it user-selectable, without touching any consuming component.
export const activeTileProvider: MapTileProvider = osmTileProvider;
