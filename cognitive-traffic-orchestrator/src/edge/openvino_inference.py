import time
import json
from datetime import datetime
import random

class MockEdgePerceptionStream:
    """
    Simulates an OpenVINO runtime analyzing a Hugging Face CCTV dataset
    (e.g., 'iisc-aim/BMD-45').
    """
    
    def __init__(self, dataset_name='iisc-aim/BMD-45'):
        self.dataset_name = dataset_name
        # Predefined plausible coordinates in Bengaluru for simulation
        self.locations = [
            (13.04, 77.51), # Mathikere/Yeshwanthpur area
            (12.97, 77.59), # Majestic/Central
            (12.91, 77.64), # HSR Layout
            (12.93, 77.62), # Koramangala
            (13.01, 77.55)  # Malleshwaram
        ]
        self.causes = [
            "vehicle_breakdown",
            "waterlogging",
            "accident",
            "construction_blockage"
        ]

    def stream_events(self):
        """
        Generator that periodically yields a structured JSON dictionary.
        The payload is pristine (no NULL values), representing the advantage
        of Edge-IoT perception.
        """
        while True:
            # Simulate processing time for CCTV frame analysis
            time.sleep(random.uniform(1.0, 3.0))
            
            lat, lon = random.choice(self.locations)
            event_cause = random.choice(self.causes)
            current_time = datetime.now().isoformat()
            
            payload = {
                "latitude": lat,
                "longitude": lon,
                "event_cause": event_cause,
                "timestamp": current_time
            }
            
            yield payload

if __name__ == "__main__":
    stream = MockEdgePerceptionStream()
    print(f"Starting simulated OpenVINO edge perception stream on dataset: {stream.dataset_name}")
    for event in stream.stream_events():
        print(json.dumps(event, indent=2))
