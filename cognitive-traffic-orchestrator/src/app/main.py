import streamlit as st
import pandas as pd
import os
import json
import random

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.models.db import init_db, insert_event
from src.agents.core_orchestrator import PipelineOrchestrator
from src.models.risk_index import RiskIndexCalculator
from src.models.predictor import LightGBMPredictor
from src.models.analogue_recommender import NearestNeighborRAG
from src.app.alert_channel import send_alert_to_officers

st.set_page_config(layout="wide", page_title="Event Congestion Console")

# Custom Styling for modern premium look
st.markdown("""
    <style>
    .main {
        background-color: #0f111a;
        color: #e6e6e6;
    }
    .stButton>button {
        background: linear-gradient(45deg, #7b2cbf, #3c096c);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 24px;
        font-weight: bold;
    }
    .stProgress > div > div > div > div {
        background-color: #7b2cbf;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🚦 Cognitive Traffic Orchestrator Console")
st.markdown("### Bengaluru AI-Powered Traffic Management Hub")

# Initialize SQLite database and models
if 'initialized' not in st.session_state:
    st.info("Initializing Data Warehouse and importing Theme_2_dataset.csv (SQLite)...")
    init_db()
    st.session_state.initialized = True
    
    st.session_state.orchestrator = PipelineOrchestrator()
    st.session_state.risk_calc = RiskIndexCalculator()
    st.session_state.predictor = LightGBMPredictor()
    st.session_state.rag = NearestNeighborRAG()
    
    # Train the predictor model if not already trained
    if st.session_state.predictor.model is None:
        with st.spinner("Training LightGBM Duration Predictor strictly on Nov-Feb historical data..."):
            st.session_state.predictor.train()
        st.success("LightGBM model successfully trained and verified against Mar-Apr test set!")

# Mock an incoming event trigger
if st.button("Trigger Mock OpenVINO Event (Loop 3)"):
    # Bengaluru coordinates
    locations = [
        (13.0400041, 77.5180991), # Peenya
        (12.9218755, 77.6451585), # Agara/HSR
        (12.9445700, 77.5274017), # Mysore Road
        (12.9995223, 77.6827499), # ORR East
        (13.0127301, 77.5545135)  # Chord Road
    ]
    causes = [
        "starting problem",
        "ಮಳೆ ನೀರು ಜಮೆಯಾಗಿದೆ (Heavy waterlogging)",
        "accident happening",
        "ಕೆಟ್ಟು ನಿಂತಿರುವ ವಾಹನ (Broken down truck)",
        "road work"
    ]
    
    chosen_loc = random.choice(locations)
    raw_event = {
        "latitude": chosen_loc[0],
        "longitude": chosen_loc[1],
        "description": random.choice(causes),
        "timestamp": pd.Timestamp.now().isoformat()
    }
    
    # Loop 1: Core Agents Impute & Snaps corridor
    processed_event = st.session_state.orchestrator.process_event(raw_event)
    
    # Save the edge perception event into the Data Warehouse
    event_id = insert_event(processed_event)
    processed_event["id"] = event_id
    
    st.session_state.current_event = processed_event
    st.success(f"Incoming Edge Event Processed & Saved to SQLite Warehouse (Event ID: {event_id})!")

if 'current_event' in st.session_state:
    event = st.session_state.current_event
    corridor = event.get('corridor', 'Unknown')
    event_cause = event.get('event_cause', 'Unknown')
    
    # Layout 3 panels
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("1️⃣ Location & Risk (Spatio-Temporal)")
        st.info(f"**Detected Corridor:** {corridor}")
        st.write(f"**Coordinates:** `{event.get('latitude')}, {event.get('longitude')}`")
        st.write(f"**Resolved Cause:** `{event_cause}`")
        st.write(f"**Reason Breakdown:** `{event.get('reason_breakdown')}`")
        
        # Risk index queries SQLite
        risk_score = st.session_state.risk_calc.calculate_risk_index(corridor)
        st.metric(label="0-100 Spatio-temporal Risk Index", value=f"{risk_score:.1f}")
        
    with col2:
        st.subheader("2️⃣ Predictive Impact (LightGBM)")
        # Run inference using trained model
        predicted_duration = st.session_state.predictor.predict(event)
        st.metric(label="Predicted Clearing Duration (Hours)", value=f"{predicted_duration:.2f} hrs")
        st.progress(min(predicted_duration / 8.0, 1.0))
        st.write("Predicted clearing window based on historical severity, corridor, and time features.")
        
    st.markdown("---")
    
    col3, col4 = st.columns([1, 1])
    
    with col3:
        st.subheader("3️⃣ Prescriptive Dispatch (RAG)")
        # RAG similarity retrieval
        raw_rec = st.session_state.rag.recommend(event_cause, corridor)
        
        # Loop 2 Deterministic verification grader
        final_rec = st.session_state.rag.validate_brief(raw_rec)
        
        st.markdown("**System Recommendation Brief:**")
        st.write(f"🚨 **Barricades Required:** `{final_rec.get('barricade_needed')}` (Grader: `{final_rec.get('validation_status')}`)")
        st.write(f"👥 **Recommended Manpower:** `{final_rec.get('manpower')} officers`")
        st.write(f"📋 **Verification Log:** *{final_rec.get('verification_message')}*")
        st.write(f"🔍 **Reasoning:** {final_rec.get('reasoning')}")
        
        # Expander for similar historical records found by RAG
        with st.expander("View Similar Historical Records (RAG matches)"):
            st.write(final_rec.get("similar_cases", []))
            
        if st.button("Deploy Field Alert (Mock Push & Webhook)"):
            send_alert_to_officers(final_rec)
            st.success("Dispatch brief sent successfully to field officers!")
            
    with col4:
        st.subheader("🔁 Hill-Climbing Loop (Operator Feedback)")
        st.write("Review recommendations and logs operator actions to refine future weights.")
        
        actual_barricade = st.checkbox("Operator Set: Barricades Deployed", value=final_rec.get("barricade_needed", False))
        actual_manpower = st.number_input("Operator Set: Manpower Deployed", min_value=0, value=final_rec.get("manpower", 1))
        
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
            st.success("Operator decision logged successfully to feedback_log.csv!")
