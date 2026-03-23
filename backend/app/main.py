import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.train_model import predict_safety_score

def calculate_route_safety(route):
    try:
        # Extract features for the route
        features = {
            'Crime Rate (Incidents per Year)': route.get('crime_rate', 0),
            'Traffic Congestion': route.get('traffic_congestion', 0),
            'Weather Conditions (Visibility in meters)': route.get('visibility', 0),
            'Accident History (Accidents per Year)': route.get('accident_history', 0),
            'Road Conditions (Score 1-10)': route.get('road_conditions', 0),
            'Lighting Conditions (Score 1-10)': route.get('lighting_conditions', 0),
            'Emergency Services Distance (km)': route.get('emergency_distance', 0)
        }
        
        # Convert features to list in the correct order
        feature_list = [
            features['Crime Rate (Incidents per Year)'],
            features['Traffic Congestion'],
            features['Weather Conditions (Visibility in meters)'],
            features['Accident History (Accidents per Year)'],
            features['Road Conditions (Score 1-10)'],
            features['Lighting Conditions (Score 1-10)'],
            features['Emergency Services Distance (km)']
        ]
        
        # Predict safety score using the trained model
        safety_score = predict_safety_score(feature_list)
        
        # Ensure safety score is between 0 and 100
        safety_score = max(0, min(100, safety_score))
        
        return safety_score
    except Exception as e:
        print(f"Error calculating safety score: {str(e)}")
        return 50  # Default safety score if calculation fails 