import math

class SpatialMappingAgent:
    """
    Validates clusters against 22 known corridor/zone paths.
    """
    def __init__(self):
        # Mocking a subset of the 22 Bengaluru Corridors with approximate center coordinates
        self.corridors = {
            "ORR East 1": (12.93, 77.68),
            "Tumkur Road": (13.04, 77.51),
            "Hosur Road": (12.91, 77.64),
            "Old Madras Road": (13.00, 77.65),
            "Mysore Road": (12.95, 77.53)
        }

    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        # Simple Euclidean distance for mock purposes
        return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

    def process(self, data_row: dict) -> dict:
        """
        Maps coordinates to the closest corridor if 'corridor' is missing.
        """
        if not data_row.get("corridor"):
            lat = data_row.get("latitude")
            lon = data_row.get("longitude")
            
            if lat is not None and lon is not None:
                closest_corridor = None
                min_distance = float('inf')
                
                for name, (c_lat, c_lon) in self.corridors.items():
                    dist = self._calculate_distance(lat, lon, c_lat, c_lon)
                    if dist < min_distance:
                        min_distance = dist
                        closest_corridor = name
                        
                data_row["corridor"] = closest_corridor
            else:
                data_row["corridor"] = "Unknown Corridor"
                
        return data_row
