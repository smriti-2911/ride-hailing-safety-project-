import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def test_geocode():
    print(f"Testing Key: {GOOGLE_MAPS_API_KEY}")
    address = "Pune Station"
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": GOOGLE_MAPS_API_KEY}
    
    res = requests.get(url, params=params)
    print(f"Geocoding Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
    
    if res.json().get("status") == "OK":
        loc = res.json()["results"][0]["geometry"]["location"]
        print(f"Coordinates: {loc}")
        
        # Test directions
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{loc['lat']},{loc['lng']}",
            "destination": f"{loc['lat']+0.01},{loc['lng']+0.01}",
            "alternatives": "true",
            "key": GOOGLE_MAPS_API_KEY
        }
        res_dir = requests.get(url, params=params)
        print(f"Directions Status: {res_dir.status_code}")
        print(f"Directions response status: {res_dir.json().get('status')}")

if __name__ == "__main__":
    test_geocode()
