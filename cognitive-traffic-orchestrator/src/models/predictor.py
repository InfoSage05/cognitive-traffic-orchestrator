import pandas as pd
import numpy as np
import os
import pickle
from datetime import datetime
from src.models.db import get_connection

CATEGORICAL_COLS = ['event_cause', 'corridor', 'priority', 'requires_road_closure']
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data'))
MODEL_PATH = os.path.join(MODEL_DIR, 'duration_predictor.pkl')

class LightGBMPredictor:
    """
    Predicts 'duration_hours' (resolved_datetime - start_datetime).
    Trains strictly on Nov-Feb data and tests on Mar-Apr data.
    """
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.cat_mappings = {}
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, 'rb') as f:
                    data = pickle.load(f)
                    self.model = data['model']
                    self.feature_names = data['features']
                    self.cat_mappings = data['cat_mappings']
                print("Successfully loaded trained predictor model.")
            except Exception as e:
                print(f"Error loading model: {e}")

    def save_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        try:
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump({
                    'model': self.model,
                    'features': self.feature_names,
                    'cat_mappings': self.cat_mappings
                }, f)
            print(f"Model saved to {MODEL_PATH}")
        except Exception as e:
            print(f"Error saving model: {e}")

    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Parses datetimes, calculates duration_hours, and extracts features."""
        # Convert columns
        df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
        df['resolved_datetime'] = pd.to_datetime(df['resolved_datetime'], errors='coerce')
        
        # Calculate target variable
        df['duration_hours'] = (df['resolved_datetime'] - df['start_datetime']).dt.total_seconds() / 3600.0
        
        # Clean target: drop null target or negative values or extreme outliers
        df = df.dropna(subset=['start_datetime', 'resolved_datetime', 'duration_hours'])
        df = df[(df['duration_hours'] > 0) & (df['duration_hours'] < 48)]
        
        # Extract features
        df['hour'] = df['start_datetime'].dt.hour
        df['weekday'] = df['start_datetime'].dt.weekday
        
        # Fill missing values for categorical
        for col in CATEGORICAL_COLS:
            df[col] = df[col].astype(str).str.lower().fillna('unknown')
            
        return df

    def train(self, data_path: str = None):
        """
        Train LightGBM strictly on Nov-Feb data to predict duration_hours.
        Test on Mar-Apr data.
        """
        conn = get_connection()
        try:
            # Query all necessary fields
            query = "SELECT start_datetime, resolved_datetime, event_cause, corridor, priority, requires_road_closure FROM events"
            raw_df = pd.read_sql_query(query, conn)
            
            if len(raw_df) < 50:
                print("Insufficient data in database to train model. Skipping training.")
                return
                
            df = self.prepare_data(raw_df)
            
            if df.empty:
                print("No valid duration records found for training. Skipping training.")
                return
                
            # Split into Nov-Feb (Train) and Mar-Apr (Test)
            df['month'] = df['start_datetime'].dt.month
            
            train_mask = df['month'].isin([11, 12, 1, 2])
            test_mask = df['month'].isin([3, 4])
            
            train_df = df[train_mask].copy()
            test_df = df[test_mask].copy()
            
            if train_df.empty:
                print("No data in Nov-Feb for training. Falling back to using all available data.")
                train_df = df.copy()
                
            # Set up categorical encoders
            self.cat_mappings = {}
            for col in CATEGORICAL_COLS:
                unique_vals = train_df[col].unique()
                mapping = {val: i for i, val in enumerate(unique_vals)}
                self.cat_mappings[col] = mapping
                
                # Apply mapping
                train_df[col] = train_df[col].map(mapping).fillna(-1)
                if not test_df.empty:
                    test_df[col] = test_df[col].map(mapping).fillna(-1)
            
            features = ['hour', 'weekday'] + CATEGORICAL_COLS
            self.feature_names = features
            
            X_train = train_df[features]
            y_train = train_df['duration_hours']
            
            # Try to train with LightGBM
            try:
                # pyrefly: ignore [missing-import]
                import lightgbm as lgb
                print("Training using LightGBM regressor...")
                model = lgb.LGBMRegressor(
                    n_estimators=100,
                    learning_rate=0.05,
                    max_depth=6,
                    random_state=42,
                    verbosity=-1
                )
                model.fit(X_train, y_train)
                self.model = model
            except ImportError:
                print("LightGBM not installed or import failed. Falling back to RandomForestRegressor...")
                from sklearn.ensemble import RandomForestRegressor
                model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
                model.fit(X_train, y_train)
                self.model = model
                
            self.save_model()
            
            # Verify on test data
            if not test_df.empty:
                X_test = test_df[features]
                y_test = test_df['duration_hours']
                predictions = self.model.predict(X_test)
                mae = np.mean(np.abs(y_test - predictions))
                print(f"Test MAE (Mar-Apr): {mae:.4f} hours")
            
        except Exception as e:
            print(f"Error during training: {e}")
        finally:
            conn.close()

    def predict(self, event_features: dict) -> float:
        """
        Predict duration in hours for a given event payload.
        """
        if self.model is None:
            # Fallback baseline duration if model is not trained
            cause = event_features.get('event_cause', 'unknown')
            if cause == 'vehicle_breakdown':
                return 1.8
            elif cause == 'waterlogging':
                return 4.2
            elif cause == 'accident':
                return 3.0
            return 2.5
            
        try:
            timestamp_str = event_features.get('timestamp') or event_features.get('start_datetime')
            if timestamp_str:
                dt = pd.to_datetime(timestamp_str)
            else:
                dt = datetime.now()
                
            hour = dt.hour
            weekday = dt.weekday()
            
            features_dict = {
                'hour': hour,
                'weekday': weekday
            }
            
            for col in CATEGORICAL_COLS:
                val = str(event_features.get(col, 'unknown')).lower()
                mapping = self.cat_mappings.get(col, {})
                features_dict[col] = mapping.get(val, -1)
                
            X_input = pd.DataFrame([features_dict])[self.feature_names]
            
            pred = self.model.predict(X_input)[0]
            return float(max(0.5, pred))
        except Exception as e:
            print(f"Error during prediction: {e}")
            return 2.5

    def predict_eta(self, base_duration_min: float, corridor: str, risk_score: float) -> float:
        """
        Heuristic ETA forecast: inflates a base route duration by the corridor's
        risk score (0-100), up to +50% at max risk. This is a placeholder seam,
        NOT a trained model output -- Theme_2_dataset.csv contains incident
        clearance durations, not trip-time data, so there is nothing to train an
        ETA model on yet. Swap this for a trained model once a real trip-time
        dataset is available.
        """
        if base_duration_min is None:
            return base_duration_min
        risk_score = max(0.0, min(100.0, risk_score or 0.0))
        return float(base_duration_min) * (1.0 + risk_score / 200.0)
