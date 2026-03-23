import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

url = "https://maps.googleapis.com/maps/api/directions/json"
params = {
    "origin": "Baner, Pune",
    "destination": "Katraj, Pune",
    "alternatives": "true",
    "mode": "driving",
    "departure_time": "now",
    "key": GOOGLE_MAPS_API_KEY
}
res = requests.get(url, params=params).json()

print(f"Status: {res['status']}")
print(f"Number of routes returned: {len(res.get('routes', []))}")

