import json
from app import app
from database import db
from models.safety import SafetyData

with app.app_context():
    crimes = [sd.crime_rate for sd in SafetyData.query.all()]
    traffic = [sd.traffic_congestion for sd in SafetyData.query.all()]
    print(f"Max Crime: {max(crimes)} | Min Crime: {min(crimes)}")
    print(f"Max Traffic: {max(traffic)} | Min Traffic: {min(traffic)}")
