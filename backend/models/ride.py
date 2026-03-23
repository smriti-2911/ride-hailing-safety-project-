from database import db
from datetime import datetime

class Ride(db.Model):
    """Model for storing ride information."""
    __tablename__ = 'rides'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    source = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    route = db.Column(db.JSON, nullable=False)  # Store complete route from Google Maps
    safety_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # BOOKED, IN_PROGRESS, COMPLETED, CANCELLED
    current_location = db.Column(db.JSON, nullable=True)  # Store current lat/lng
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Ride {self.id}>'

    def to_dict(self):
        """Convert ride to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'source': self.source,
            'destination': self.destination,
            'safety_score': self.safety_score,
            'status': self.status,
            'current_location': self.current_location,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
