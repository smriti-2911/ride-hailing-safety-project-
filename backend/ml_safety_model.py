import os
import joblib
import warnings
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from database import db
from models.safety import SafetyData
from flask import current_app
import random

# Suppress sklearn warnings
warnings.filterwarnings('ignore')

model = None
scaler = None

def get_safety_features(safety_data):
    """Extract features for ML model prediction."""
    try:
        import pandas as pd
        if isinstance(safety_data, pd.Series):
            safety_data = safety_data.to_dict()

        if isinstance(safety_data, dict):
            crime_rate = float(safety_data.get('Crime Rate (Incidents per Year)', safety_data.get('crime_rate', 0)))
            traffic = float(safety_data.get('Traffic Congestion', safety_data.get('traffic_congestion', 0)))
            visibility = str(safety_data.get('Weather Conditions (Visibility in meters)', safety_data.get('weather_conditions', '10')))
            accidents = float(safety_data.get('Accident History (Accidents per Year)', safety_data.get('accident_history', 0)))
            road = str(safety_data.get('Road Conditions (Score 1-10)', safety_data.get('road_conditions', '10')))
            lighting = str(safety_data.get('Lighting Conditions (Score 1-10)', safety_data.get('lighting_conditions', '10')))
            emergency = float(safety_data.get('Emergency Services Distance (km)', safety_data.get('emergency_services_distance', 0)))
        else:
            crime_rate = float(safety_data.crime_rate)
            traffic = float(safety_data.traffic_congestion)
            visibility = str(safety_data.weather_conditions)
            accidents = float(safety_data.accident_history)
            road = str(safety_data.road_conditions)
            lighting = str(safety_data.lighting_conditions)
            emergency = float(safety_data.emergency_services_distance)

        def parse_str_val(v):
            v_lower = str(v).lower()
            if v_lower in ['good', 'clear', 'well-lit', 'excellent']: return 10.0
            if v_lower in ['poor', 'bad', 'dark']: return 1.0
            if v_lower in ['moderate', 'fair', 'average']: return 5.0
            try: return float(v)
            except: return 5.0

        visibility = parse_str_val(visibility)
        road = parse_str_val(road)
        lighting = parse_str_val(lighting)
        
        # Calculate normalized scores (higher is better)
        crime_score = 10 - min(crime_rate / 25.0, 10.0)  # Normalize crime rate
        traffic_score = 10 - min(traffic, 10.0)  # Invert traffic congestion
        visibility_score = 10 if visibility > 500 else 5  # Good visibility = 10, poor = 5
        accident_score = 10 - min(accidents / 6.0, 10.0)  # Normalize accident rate
        road_score = road  # Already on 1-10 scale
        lighting_score = lighting  # Already on 1-10 scale
        emergency_score = 10 - min(emergency, 10.0)  # Invert distance
        
        # Calculate interaction terms
        crime_traffic = crime_score * traffic_score / 10.0
        road_lighting = road_score * lighting_score / 10.0
        visibility_accidents = visibility_score * (10 - accident_score) / 10.0
        emergency_access = emergency_score * road_score / 10.0
        
        features = {
            'Crime_Score': crime_score,
            'Traffic_Score': traffic_score,
            'Visibility_Score': visibility_score,
            'Accident_Score': accident_score,
            'Road_Score': road_score,
            'Lighting_Score': lighting_score,
            'Emergency_Score': emergency_score,
            'Crime_Traffic': crime_traffic,
            'Road_Lighting': road_lighting,
            'Visibility_Accidents': visibility_accidents,
            'Emergency_Access': emergency_access,
            'Safety_Index': (crime_score + traffic_score + visibility_score + 
                           accident_score + road_score + lighting_score + 
                           emergency_score) / 7
        }
        return features
    except Exception as e:
        print(f"Error extracting features: {str(e)}")
        return None

def get_safety_model():
    global model, scaler
    if model is None or scaler is None:
        try:
            # Load model and scaler from files
            model_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'safety_model.joblib')
            scaler_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'scaler.joblib')
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                model = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
            else:
                print("Error: Model files not found")
                return None, None
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return None, None
    return model, scaler

def init_safety_model(app):
    """Initialize the safety model with the app context."""
    global model, scaler
    try:
        with app.app_context():
            # Load or train model
            model_path = os.path.join(app.root_path, 'ml_model', 'safety_model.joblib')
            scaler_path = os.path.join(app.root_path, 'ml_model', 'scaler.joblib')
            
            # Always train a new model to ensure proper normalization
            model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
            scaler = StandardScaler()
            
            # Load safety data
            safety_df = pd.read_csv(os.path.join(os.path.dirname(__file__), 'safety_data.csv'))
            
            # Prepare features and calculate initial safety scores
            X = []
            y = []
            for _, row in safety_df.iterrows():
                features = get_safety_features(row)
                if features:
                    feature_values = [
                        features['Crime_Score'],
                        features['Traffic_Score'],
                        features['Visibility_Score'],
                        features['Accident_Score'],
                        features['Road_Score'],
                        features['Lighting_Score'],
                        features['Emergency_Score'],
                        features['Crime_Traffic'],
                        features['Road_Lighting'],
                        features['Visibility_Accidents'],
                        features['Emergency_Access'],
                        features['Safety_Index']
                    ]
                    X.append(feature_values)
                    
                    # Calculate weighted safety score with more variation
                    weights = {
                        'Crime_Score': 0.25,
                        'Traffic_Score': 0.15,
                        'Visibility_Score': 0.1,
                        'Accident_Score': 0.15,
                        'Road_Score': 0.1,
                        'Lighting_Score': 0.1,
                        'Emergency_Score': 0.05,
                        'Crime_Traffic': 0.05,
                        'Road_Lighting': 0.05
                    }
                    
                    # Calculate base score on a 100-point scale
                    base_score_10 = sum(features[k] * v for k, v in weights.items() if k in weights)
                    base_score_10 = base_score_10 / sum(weights.values())
                    
                    base_score_100 = base_score_10 * 10.0
                    
                    # Add variation based on raw real-world values instead of arbitrary multipliers
                    crime_rate = float(row['Crime Rate (Incidents per Year)'])
                    traffic = float(row['Traffic Congestion'])
                    accidents = float(row['Accident History (Accidents per Year)'])
                    
                    # Deduct flat penalty points for extreme metrics (making routes observably worse)
                    if crime_rate > 150:
                        base_score_100 -= 20.0  # Massive penalty for high crime
                    elif crime_rate > 100:
                        base_score_100 -= 10.0
                        
                    if traffic > 8:
                        base_score_100 -= 12.0  # High traffic penalty
                    elif traffic > 6:
                        base_score_100 -= 6.0
                        
                    if accidents > 30:
                        base_score_100 -= 18.0  # High accidents penalty
                    elif accidents > 15:
                        base_score_100 -= 8.0
                    
                    # Final safety clamp 0-100
                    score = max(0.0, min(100.0, base_score_100))
                    y.append(score)
            
            if not X or not y:
                raise Exception("No valid training data")
            
            # Scale features and train model
            X_scaled = scaler.fit_transform(X)
            model.fit(X_scaled, y)
            
            # Save model and scaler
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            joblib.dump(model, model_path)
            joblib.dump(scaler, scaler_path)
            print("Trained and saved new model")
                
    except Exception as e:
        print(f"Error initializing model: {str(e)}")
        model = None
        scaler = None

def predict_safety_score(features, user_profile=None):
    """Predict safety score using the trained model and profile heuristics."""
    try:
        if not features:
            return 50.0  # Default mid-range score
            
        if model is None or scaler is None:
            # Initialize model if not already done
            from app import create_app
            app = create_app()
            init_safety_model(app)
            if model is None or scaler is None:
                return 50.0  # Default mid-range score on 0-100 scale
            
        # Convert features to list in correct order
        feature_list = [
            features['Crime_Score'],
            features['Traffic_Score'],
            features['Visibility_Score'],
            features['Accident_Score'],
            features['Road_Score'],
            features['Lighting_Score'],
            features['Emergency_Score'],
            features['Crime_Traffic'],
            features['Road_Lighting'],
            features['Visibility_Accidents'],
            features['Emergency_Access'],
            features['Safety_Index']
        ]
        
        # Scale features and get model prediction (0-100)
        # Note: In ML model training, higher Y is safer (100 = safe). 
        # But we want danger penalties to pull the score down. 
        features_scaled = scaler.transform([feature_list])
        model_prediction = model.predict(features_scaled)[0]
        
        # Ensure prediction is between 0 and 100 Native Scale
        base_score = max(0.0, min(100.0, model_prediction))
        
        # --- PROFILE HEURISTIC MULTIPLIERS ---
        # Note: A higher score means SAFER route (0 = Danger, 100 = Safe).
        # We penalize by reducing the score.
        if user_profile:
            age = user_profile.get('age', 25)
            gender = user_profile.get('gender', 'Unspecified').lower()
            
            # 1. Female penalty on high crime / low lighting
            if gender == 'female':
                # If lighting is poor or crime is high (scores are low)
                if features['Lighting_Score'] < 5.0 or features['Crime_Score'] < 5.0:
                    base_score *= 0.8  # 20% penalty
                    
            # 2. Elderly (Age > 60) penalty on accident-prone routes
            if age > 60:
                if features['Accident_Score'] < 6.0:
                    base_score *= 0.85 # 15% penalty
                    
        # Add tiny authentic decimal variation
        prediction = base_score + random.uniform(-1.5, 1.5)
        prediction = max(0.0, min(100.0, prediction))
        
        return round(prediction, 1)
        
    except Exception as e:
        print(f"Error in predict_safety_score: {str(e)}")
        return 50.0  # Default mid-range score on error