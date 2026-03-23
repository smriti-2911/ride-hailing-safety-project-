from database import db

class SafetyData(db.Model):
    __tablename__ = "safety_data"

    id = db.Column(db.Integer, primary_key=True)
    location = db.Column(db.String(255), unique=True, nullable=False)
    latitude = db.Column(db.Float, nullable=False) 
    longitude = db.Column(db.Float, nullable=False)
    crime_rate = db.Column(db.Float, nullable=False)
    traffic_congestion = db.Column(db.Float, nullable=False)
    weather_conditions = db.Column(db.String(255), nullable=False)
    accident_history = db.Column(db.Float, nullable=False)
    road_conditions = db.Column(db.String(255), nullable=False)
    lighting_conditions = db.Column(db.String(255), nullable=False)
    emergency_services_distance = db.Column(db.Float, nullable=False)
    
    @property
    def safety_score(self):
        """
        Calculate a safety score dynamically based on available factors.
        Adjust weights as needed.
        """
        score = (
            (1 - self.crime_rate) * 0.3 +  # Higher crime = lower safety
            (1 - self.traffic_congestion) * 0.2 +  # More congestion = lower safety
            (1 - self.accident_history) * 0.2 +  # More accidents = lower safety
            (1 - self.emergency_services_distance / 10) * 0.2 +  # Closer emergency services = safer
            (1 if self.road_conditions.lower() == "good" else 0) * 0.05 +
            (1 if self.lighting_conditions.lower() == "well-lit" else 0) * 0.05
        ) * 100  # Normalize to percentage

        return max(0, min(100, score))  # Ensure score is between 0-100
