# pyre-ignore-all-errors
import os
from dotenv import load_dotenv

# Load backend/.env before any route imports (services/google_maps reads GOOGLE_MAPS_API_KEY).
_basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(_basedir, ".env"))

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Import Database and Initialize
from database import init_db

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.ride_routes import ride_bp
from routes.user_routes import user_bp
from routes.safety_routes import safety_bp
from routes.history_routes import history_bp

app = Flask(__name__)
CORS(app)

# Configure Database & JWT
basedir = _basedir
_db_url = os.environ.get('DATABASE_URL')
if _db_url:
    # Render/Heroku sometimes use postgres://; SQLAlchemy expects postgresql://
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
else:
    _instance = os.path.join(basedir, 'instance')
    os.makedirs(_instance, exist_ok=True)
    _db_url = 'sqlite:///' + os.path.join(_instance, 'database.db')
app.config['SQLALCHEMY_DATABASE_URI'] = _db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
# Strip whitespace/newlines — unquoted .env values often break Twilio auth if a newline slips in
def _env_strip(key):
    v = os.environ.get(key)
    return v.strip() if isinstance(v, str) else v

app.config['TWILIO_ACCOUNT_SID'] = _env_strip('TWILIO_ACCOUNT_SID')
app.config['TWILIO_AUTH_TOKEN'] = _env_strip('TWILIO_AUTH_TOKEN')
app.config['TWILIO_PHONE_NUMBER'] = _env_strip('TWILIO_PHONE_NUMBER')
app.config['GOOGLE_MAPS_API_KEY'] = os.environ.get('GOOGLE_MAPS_API_KEY')

# Initialize Extensions
init_db(app)
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(ride_bp, url_prefix='/api/ride')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(safety_bp, url_prefix='/api/safety')
app.register_blueprint(history_bp, url_prefix='/api/history')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Intelligent Safety API"}), 200

if __name__ == '__main__':
    print("Starting Deterministic Safety Engine & API Gateway on port 5001...")
    app.run(debug=True, port=5001)
