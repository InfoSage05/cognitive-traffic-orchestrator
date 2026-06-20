import streamlit as st
import pandas as pd
import os
import json
import random

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.agents.core_orchestrator import PipelineOrchestrator
from src.models.risk_index import RiskIndexCalculator
from src.models.predictor import LightGBMPredictor
from src.models.analogue_recommender import NearestNeighborRAG
from src.app.alert_channel import send_alert_to_officers

st.set_page_config(layout="wide", page_title="Event Congestion Console")

st.title("🚦 Cognitive Traffic Orchestrator Console")
st.markdown("### Bengaluru Traffic Management Dashboard")

# Initialize models
if 'orchestrator' not in st.session_state:
    st.session_state.orchestrator = PipelineOrchestrator()
    st.session_state.risk_calc = RiskIndexCalculator()
    st.session_state.predictor = LightGBMPredictor()
    st.session_state.rag = NearestNeighborRAG()

# Mock an incoming event trigger
if st.button("Trigger Mock OpenVINO Event (Loop 3)"):
    locations = [(13.04, 77.51), (12.97, 77.59), (12.91, 77.64)]
    causes = ["starting problem", "ಮಳೆ (Rain)", "accident"]
    
    raw_event = {
        "latitude": random.choice(locations)[0],
        "longitude": random.choice(locations)[1],
        "description": random.choice(causes),
        "timestamp": pd.Timestamp.now().isoformat()
    }
    
    # Loop 1: Core Agents
    processed_event = st.session_state.orchestrator.process_event(raw_event)
    st.session_state.current_event = processed_event
    st.success("Incoming Edge Event Processed!")

if 'current_event' in st.session_state:
    event = st.session_state.current_event
    corridor = event.get('corridor', 'Unknown')
    event_cause = event.get('event_cause', 'Unknown')
    
    # Layout 3 panels
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("1️⃣ Location & Risk (Spatio-Temporal)")
        st.write(f"**Detected Corridor:** {corridor}")
        st.write(f"**Coordinates:** {event.get('latitude')}, {event.get('longitude')}")
        st.write(f"**Event Cause:** {event_cause}")
        
        risk_score = st.session_state.risk_calc.calculate_risk_index(corridor)
        st.metric(label="0-100 Risk Index", value=f"{risk_score:.1f}")
        
    with col2:
        st.subheader("2️⃣ Predictive Impact (LightGBM)")
        # Loop 2 models
        predicted_duration = st.session_state.predictor.predict(event)
        st.metric(label="Predicted Duration (Hours)", value=f"{predicted_duration:.2f}")
        st.progress(min(predicted_duration / 5.0, 1.0))
        
    st.markdown("---")
    
    col3, col4 = st.columns([1, 1])
    
    with col3:
        st.subheader("3️⃣ Prescriptive Dispatch (RAG)")
        raw_rec = st.session_state.rag.recommend(event_cause, corridor)
        final_rec = st.session_state.rag.validate_brief(raw_rec)
        
        st.json(final_rec)
        if st.button("Deploy Field Alert (Mock Push)"):
            send_alert_to_officers(final_rec)
            st.success("Alert sent to officers.")
            
    with col4:
        st.subheader("🔁 Hill-Climbing Loop (Operator Feedback)")
        st.write("Does the prescriptive recommendation make sense?")
        
        actual_barricade = st.checkbox("Barricades Needed?", value=final_rec.get("barricade_needed", False))
        actual_manpower = st.number_input("Manpower Deployed", min_value=0, value=final_rec.get("manpower", 1))
        
        if st.button("Log Operator Decision"):
            log_entry = {
                "timestamp": pd.Timestamp.now().isoformat(),
                "event_cause": event_cause,
                "corridor": corridor,
                "recommended_barricade": final_rec.get("barricade_needed"),
                "actual_barricade": actual_barricade,
                "recommended_manpower": final_rec.get("manpower"),
                "actual_manpower": actual_manpower
            }
            log_df = pd.DataFrame([log_entry])
            log_path = "feedback_log.csv"
            if not os.path.exists(log_path):
                log_df.to_csv(log_path, index=False)
            else:
                log_df.to_csv(log_path, mode='a', header=False, index=False)
            st.success("Decision logged for future model tuning!")
