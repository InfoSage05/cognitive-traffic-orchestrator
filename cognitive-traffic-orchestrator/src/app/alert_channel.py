import json

def send_alert_to_officers(payload: dict):
    """
    Mock SMS/Mobile Push notification spoke.
    Prints a JSON alert payload meant for police field officers.
    """
    alert_message = {
        "channel": "MOBILE_PUSH",
        "target_group": "TRAFFIC_POLICE_FIELD_OFFICERS",
        "priority": "HIGH",
        "dispatch_brief": payload
    }
    
    print("\n[ALERT CHANNEL] Sending Dispatch Brief to Field Officers...")
    print(json.dumps(alert_message, indent=2))
    print("[ALERT CHANNEL] Delivery successful.\n")
