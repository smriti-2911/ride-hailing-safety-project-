#!/usr/bin/env python3
"""
Re-seed safety data with proper crime_rate values (incidents/year, not clamped).
Run from backend/: python scripts/reseed_safety_data.py
This improves score differentiation between routes.
"""
import os
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from flask import Flask
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or f'sqlite:///{os.path.join(backend_dir, "instance", "database.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

from database import db, init_db
init_db(app)

import pandas as pd
from models.safety import SafetyData

with app.app_context():
    csv_path = os.path.join(backend_dir, 'safety_data.csv')
    df = pd.read_csv(csv_path)
    SafetyData.query.delete()
    db.session.commit()
    for _, row in df.iterrows():
        crime_rate = max(1.0, min(float(row['Crime Rate (Incidents per Year)']), 300.0))
        sd = SafetyData(
            location=row['Location'],
            latitude=float(row['Latitude']),
            longitude=float(row['Longitude']),
            crime_rate=crime_rate,
            traffic_congestion=max(0.1, min(float(row['Traffic Congestion']), 10.0)),
            weather_conditions=str(row['Weather Conditions (Visibility in meters)']),
            accident_history=max(0.1, min(float(row['Accident History (Accidents per Year)']), 100.0)),
            road_conditions=str(row['Road Conditions (Score 1-10)']),
            lighting_conditions=str(row['Lighting Conditions (Score 1-10)']),
            emergency_services_distance=float(row['Emergency Services Distance (km)'])
        )
        db.session.add(sd)
    db.session.commit()
    print(f"Re-seeded {len(df)} safety records with raw crime rates for better score differentiation.")
