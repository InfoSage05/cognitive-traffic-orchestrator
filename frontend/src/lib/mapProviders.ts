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

// CartoDB Dark Matter — free, no key required, perfect for dark-themed UIs
export const cartoDarkProvider: MapTileProvider = {
  id: "carto-dark",
  name: "CartoDB Dark",
  tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

// Use OSM standard map for a clear, light-themed map view.
export const activeTileProvider: MapTileProvider = osmTileProvider;
