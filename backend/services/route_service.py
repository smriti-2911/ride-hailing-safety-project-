import os
import sys
import requests
from geopy.distance import geodesic
from models.safety import SafetyData
from database import db
from dotenv import load_dotenv
from ml_safety_model import get_safety_model, predict_safety_score
import pandas as pd
import random

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def get_coordinates(address):
    """Get lat/lng coordinates for an address using Google Maps Geocoding API."""
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": address, "key": GOOGLE_MAPS_API_KEY}
        res = requests.get(url, params=params).json()
        if res["status"] == "OK":
            location = res["results"][0]["geometry"]["location"]
            return location  # Return the full location dict
        return None
    except Exception as e:
        return None

def get_routes(start_address, end_address):
    """Get multiple routes between two points using Google Maps API."""
    try:
        # Get coordinates for start and end points
        start_coords = get_coordinates(start_address)
        end_coords = get_coordinates(end_address)
        
        if not start_coords or not end_coords:
            return None, "Could not find coordinates for the addresses"
        
        # Get multiple routes from Google Maps
        directions_url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{start_coords['lat']},{start_coords['lng']}",
            "destination": f"{end_coords['lat']},{end_coords['lng']}",
            "alternatives": "true",
            "key": GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(directions_url, params=params)
        data = response.json()
        
        if data["status"] != "OK":
            return None, f"Directions API error: {data['status']}"
            
        if not data.get("routes"):
            return None, "No routes found"
            
        return data["routes"], None
        
    except Exception as e:
        return None, str(e)

def find_nearest_location(lat, lng):
    """Find the closest safety data point to given coordinates."""
    try:
        # Load safety data
        safety_df = pd.read_csv('safety_data.csv')
        
        # Calculate distances
        distances = []
        for _, row in safety_df.iterrows():
            dist = ((row['Latitude'] - lat) ** 2 + (row['Longitude'] - lng) ** 2) ** 0.5
            distances.append(dist)
            
        # Find nearest location
        min_idx = distances.index(min(distances))
        return safety_df.iloc[min_idx].to_dict()  # Convert Series to dict
        
    except Exception as e:
        print(f"Error finding nearest location: {str(e)}")
        return None

def get_safety_features(safety_data):
    """Extract features for ML model prediction."""
    try:
        # Extract raw values
        crime_rate = float(safety_data['Crime Rate (Incidents per Year)'])
        traffic = float(safety_data['Traffic Congestion'])
        visibility = float(safety_data['Weather Conditions (Visibility in meters)'])
        accidents = float(safety_data['Accident History (Accidents per Year)'])
        road = float(safety_data['Road Conditions (Score 1-10)'])
        lighting = float(safety_data['Lighting Conditions (Score 1-10)'])
        emergency = float(safety_data['Emergency Services Distance (km)'])
        
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

def score_route(route):
    try:
        legs = route.get('legs', [])
        if not legs:
            return 5.0
            
        total_score = 0
        total_distance = 0
        
        # Initialize ML model if not already done
        model, scaler = get_safety_model()
        if model is None or scaler is None:
            print("Error: ML model not initialized")
            return 5.0
        
        for leg in legs:
            steps = leg.get('steps', [])
            for step in steps:
                start_lat = step['start_location']['lat']
                start_lng = step['start_location']['lng']
                end_lat = step['end_location']['lat']
                end_lng = step['end_location']['lng']
                
                start_data = find_nearest_location(start_lat, start_lng)
                end_data = find_nearest_location(end_lat, end_lng)
                
                if start_data and end_data:
                    # Get safety features for ML model
                    start_features = get_safety_features(start_data)
                    end_features = get_safety_features(end_data)
                    
                    if start_features and end_features:
                        # Get ML predictions
                        start_score = predict_safety_score(start_features)
                        end_score = predict_safety_score(end_features)
                        
                        # Calculate step score (weighted average)
                        step_score = (start_score + end_score) / 2
                        
                        # Add small random variation
                        step_score += random.uniform(-0.5, 0.5)
                        step_score = max(1.0, min(10.0, step_score))
                        
                        step_distance = step['distance']['value']
                        total_score += step_score * step_distance
                        total_distance += step_distance
        
        if total_distance > 0:
            final_score = total_score / total_distance
            return round(final_score, 1)
            
        return 5.0
        
    except Exception as e:
        print(f"Error in score_route: {str(e)}")
        return 5.0

def get_safest_route(start_address, end_address):
    try:
        # Get routes from Google Maps
        routes, error = get_routes(start_address, end_address)
        if error:
            return {'error': error}
        if not routes:
            return {'error': 'No routes found'}

        # Score each route using ML model
        scored_routes = []
        for route in routes:
            safety_score = score_route(route)
            
            # Get route details
            leg = route['legs'][0]
            steps = leg['steps']
            
            # Create detailed path with intermediate locations
            path_parts = []
            for step in steps:
                start_loc = find_nearest_location(
                    step['start_location']['lat'],
                    step['start_location']['lng']
                )
                if start_loc is not None:
                    path_parts.append(start_loc['Location'])
            
            # Add final destination
            end_loc = find_nearest_location(
                steps[-1]['end_location']['lat'],
                steps[-1]['end_location']['lng']
            )
            if end_loc is not None:
                path_parts.append(end_loc['Location'])
            
            # Create path with arrows
            path = " → ".join(dict.fromkeys(path_parts))  # Remove duplicates
            
            scored_routes.append({
                'path': path,
                'safety_score': safety_score,
                'duration': round(leg['duration']['value'] / 60),  # Convert to minutes
                'distance': round(leg['distance']['value'] / 1000, 1)  # Convert to km
            })

        # Sort by safety score
        scored_routes.sort(key=lambda x: x['safety_score'], reverse=True)
        
        if not scored_routes:
            return {'error': 'No valid routes found'}
        
        # Return all routes and highlight the safest one
        return {
            'all_routes': scored_routes,
            'safest_route': scored_routes[0]
        }

    except Exception as e:
        print(f"Error in get_safest_route: {str(e)}")
        return {'error': str(e)}
