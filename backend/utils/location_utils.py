import os
import requests
from urllib.parse import urlencode
from models.safety import SafetyData
from sqlalchemy import func
from dotenv import load_dotenv
import polyline

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def get_coordinates_from_address(address):
    """Convert full address to coordinates using Google Maps Geocoding API"""
    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={urlencode({'': address})[1:]}&key={GOOGLE_MAPS_API_KEY}"
    response = requests.get(geocode_url)
    data = response.json()

    if data["status"] == "OK":
        location = data["results"][0]["geometry"]["location"]
        return location["lat"], location["lng"]
    else:
        return None

def get_routes_and_safety(start_address, end_address, db):
    """Fetch routes from Google Directions API and assign safety scores"""
    base_url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": start_address,
        "destination": end_address,
        "alternatives": "true",
        "mode": "driving",
        "key": GOOGLE_MAPS_API_KEY
    }

    response = requests.get(base_url, params=params)
    data = response.json()

    if data["status"] != "OK":
        return None

    routes = []
    for route in data["routes"]:
        steps = []
        for leg in route["legs"]:
            for step in leg["steps"]:
                lat = step["end_location"]["lat"]
                lng = step["end_location"]["lng"]
                locality = get_locality_from_coords(lat, lng)
                steps.append(locality)

        # Filter out None values
        valid_localities = [loc for loc in steps if loc]

        # Compute safety score for this route
        safety_score = compute_route_safety_score(valid_localities, db)

        routes.append({
            "polyline": route["overview_polyline"]["points"],
            "safety_score": safety_score,
            "summary": route["summary"],
            "localities": valid_localities
        })

    if not routes:
        return None

    safest = max(routes, key=lambda x: x["safety_score"])
    return {
        "safest_route": safest,
        "all_routes": routes
    }

def get_locality_from_coords(lat, lng):
    """Reverse geocode to get locality name"""
    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={GOOGLE_MAPS_API_KEY}"
    response = requests.get(url)
    data = response.json()
    
    if data["status"] == "OK":
        for result in data["results"]:
            for component in result["address_components"]:
                if "sublocality_level_1" in component["types"] or "locality" in component["types"]:
                    return component["long_name"]
    return None

def compute_route_safety_score(localities, db):
    """Compute average safety score for a list of localities"""
    from controllers.safety_controller import compute_safety_score

    scores = []
    for locality in localities:
        safety_data = SafetyData.query.filter(func.lower(SafetyData.location) == locality.lower()).first()
        if safety_data:
            scores.append(compute_safety_score(safety_data))

    if scores:
        return round(sum(scores) / len(scores), 2)
    return 0

def decode_polyline(encoded_polyline):
    """
    Decode an encoded polyline string into a list of (lat, lng) tuples.
    """
    return polyline.decode(encoded_polyline)