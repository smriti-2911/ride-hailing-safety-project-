import os
import requests
from flask import jsonify, request, current_app
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from models.safety import SafetyData
from models.user import User
from services.twilio_service import send_alert_sms
from database import db
import polyline
from typing import List, Dict, Optional, Tuple
from services.route_service import find_nearest_location
from dotenv import load_dotenv

# Ensure backend/.env is loaded even if cwd is not backend/ (when google_maps imports before app.py).
_here = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_here, ".env"))

geolocator = Nominatim(user_agent="ride_safety_app")
BASE_URL = "https://maps.googleapis.com/maps/api"


def _google_maps_api_key():
    """Read at call time so the key is always current after env load."""
    return (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()


def get_coordinates(address):
    """Get coordinates from address using Google Maps API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    key = _google_maps_api_key()
    if not key:
        print("GOOGLE_MAPS_API_KEY is missing — set it in backend/.env and restart the API.")

    def fetch(query):
        params = {"address": query, "key": key}
        res = requests.get(url, params=params).json()
        if res.get("status") == "OK" and res.get("results"):
            location = res["results"][0]["geometry"]["location"]
            return location["lat"], location["lng"]
        if res.get("status") and res.get("status") != "OK":
            print(f"Geocode status={res.get('status')} error_message={res.get('error_message')}")
        return None

    # Enforce Pune boundary to prevent overlapping neighborhood lookups (e.g. Bangalore Shivajinagar)
    search_query = address
    if "pune" not in address.lower():
        search_query = f"{address}, Pune, Maharashtra, India"

    coords = fetch(search_query)
    if not coords:
        coords = fetch(address)  # Fallback
    return coords


def decode_polyline(polyline_str):
    return polyline.decode(polyline_str)


def get_routes_by_address(start_address, end_address):
    """Get route alternatives from Google Maps API."""
    start_coords = get_coordinates(start_address)
    end_coords = get_coordinates(end_address)
    if not start_coords or not end_coords:
        return None, "Could not fetch coordinates for one or both locations."

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{start_coords[0]},{start_coords[1]}",
        "destination": f"{end_coords[0]},{end_coords[1]}",
        "alternatives": "true",
        "mode": "driving",
        "departure_time": "now",
        "key": _google_maps_api_key()
    }
    res = requests.get(url, params=params).json()
    if res["status"] != "OK":
        return None, "Error fetching routes."

    routes = []
    for route in res["routes"]:
        path = []
        for step in route["legs"][0]["steps"]:
            lat = step["end_location"]["lat"]
            lng = step["end_location"]["lng"]
            path.append((lat, lng))
        routes.append(path)

    return routes, None




def get_routes(start, end) -> List[Dict]:
    """Get multiple possible routes between two points using Google Maps Directions API."""
    try:
        key = _google_maps_api_key()
        if not key:
            print("GOOGLE_MAPS_API_KEY is missing — cannot fetch directions.")
            return []
        if isinstance(start, tuple):
            start = {'lat': start[0], 'lng': start[1]}
        if isinstance(end, tuple):
            end = {'lat': end[0], 'lng': end[1]}
            
        response = requests.get(
            f"{BASE_URL}/directions/json",
            params={
                "origin": f"{start['lat']},{start['lng']}",
                "destination": f"{end['lat']},{end['lng']}",
                "alternatives": "true",
                "mode": "driving",
                "departure_time": "now",
                "key": key
            }
        )
        data = response.json()
        
        if data['status'] != 'OK':
            return []
        
        routes = []
        for route in data['routes']:
            routes.append({
                'polyline': route['overview_polyline']['points'],
                'distance': route['legs'][0]['distance']['value'],
                'duration': route['legs'][0]['duration']['value'],
                'summary': route['summary']
            })
            
        # Guarantee at least 3 routes using geometric perturbation waypoints
        if len(routes) < 3:
            lat_diff = end['lat'] - start['lat']
            lng_diff = end['lng'] - start['lng']
            mid_lat = start['lat'] + (lat_diff / 2.0)
            mid_lng = start['lng'] + (lng_diff / 2.0)
            
            # Simple orthogonal offsets to force map routing to take different streets
            perturbations = [(0.02, -0.02), (-0.02, 0.02), (0.01, 0.03), (-0.03, -0.01)]
            p_idx = 0
            
            while len(routes) < 3 and p_idx < len(perturbations):
                p_lat, p_lng = perturbations[p_idx]
                wp_lat = mid_lat + p_lat
                wp_lng = mid_lng + p_lng
                
                new_response = requests.get(
                    f"{BASE_URL}/directions/json",
                    params={
                        "origin": f"{start['lat']},{start['lng']}",
                        "destination": f"{end['lat']},{end['lng']}",
                        "waypoints": f"via:{wp_lat},{wp_lng}",
                        "alternatives": "false",
                        "mode": "driving",
                        "departure_time": "now",
                        "key": key
                    }
                )
                new_data = new_response.json()
                if new_data['status'] == 'OK' and new_data['routes']:
                    new_route = new_data['routes'][0]
                    new_poly = new_route['overview_polyline']['points']
                    
                    if not any(r['polyline'] == new_poly for r in routes):
                        routes.append({
                            'polyline': new_poly,
                            'distance': new_route['legs'][0]['distance']['value'],
                            'duration': new_route['legs'][0]['duration']['value'],
                            'summary': f"{data['routes'][0]['summary']} alt variant"
                        })
                p_idx += 1
        
        return routes
    except Exception as e:
        print(f"Error getting routes: {e}")
        return []