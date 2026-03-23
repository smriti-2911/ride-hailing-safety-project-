import pandas as pd
from app import app
from models.safety import SafetyData
from database import db

def load_safety_data():
    """Load safety data from CSV into database."""
    try:
        # Clear existing data
        SafetyData.query.delete()
        db.session.commit()
        
        # Read CSV file
        df = pd.read_csv('safety_data.csv')
        
        # Create new entries. Store raw crime (incidents/year) for proper engine differentiation.
        for _, row in df.iterrows():
            crime_rate = float(row['Crime Rate (Incidents per Year)'])
            crime_rate = max(1.0, min(crime_rate, 300.0))  # clamp to 1-300 for robustness
            traffic_congestion = max(0.1, min(float(row['Traffic Congestion']), 10.0))
            accident_history = max(0.1, min(float(row['Accident History (Accidents per Year)']), 100.0))

            safety_data = SafetyData(
                location=row['Location'],
                latitude=float(row['Latitude']),
                longitude=float(row['Longitude']),
                crime_rate=crime_rate,
                traffic_congestion=traffic_congestion,
                weather_conditions=str(row['Weather Conditions (Visibility in meters)']),
                accident_history=accident_history,
                road_conditions=str(row['Road Conditions (Score 1-10)']),
                lighting_conditions=str(row['Lighting Conditions (Score 1-10)']),
                emergency_services_distance=float(row['Emergency Services Distance (km)'])
            )
            db.session.add(safety_data)
        
        db.session.commit()
        print("Safety data loaded successfully")
        
    except Exception as e:
        print(f"Error loading safety data: {str(e)}")
        db.session.rollback()
        raise

if __name__ == "__main__":
    with app.app_context():
        load_safety_data()

