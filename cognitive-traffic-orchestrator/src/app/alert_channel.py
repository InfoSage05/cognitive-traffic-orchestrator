import json
import os
import requests

def send_alert_to_officers(payload: dict):
    """
    Mock SMS/Mobile Push notification spoke.
    Prints a JSON alert payload meant for police field officers,
    and forwards it to a Webhook URL if configured.
    """
    alert_message = {
        "channel": "MOBILE_PUSH",
        "target_group": "TRAFFIC_POLICE_FIELD_OFFICERS",
        "priority": "HIGH",
        "dispatch_brief": payload
    }
    
    print("\n[ALERT CHANNEL] Sending Dispatch Brief to Field Officers...")
    print(json.dumps(alert_message, indent=2))
    
    # Check for a webhook URL configured in environment
    webhook_url = os.environ.get("ALERT_WEBHOOK_URL")
    if webhook_url:
        try:
            print(f"[ALERT CHANNEL] Forwarding dispatch payload to Webhook: {webhook_url}")
            response = requests.post(webhook_url, json=alert_message, timeout=5)
            print(f"[ALERT CHANNEL] Webhook response status code: {response.status_code}")
        except Exception as e:
            print(f"[ALERT CHANNEL] Webhook delivery failed: {e}")
    else:
        print("[ALERT CHANNEL] Alert logged locally. To send live webhook notifications, set the ALERT_WEBHOOK_URL environment variable.")
        
    print("[ALERT CHANNEL] Delivery processing complete.\n")
