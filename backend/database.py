from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        # Import models so SQLAlchemy creates their tables
        from models.user import User
        from models.ride import Ride
        from models.safety import SafetyData
        from models.alert import AlertLog
        from models.sos import SOSEvent
        db.create_all()
