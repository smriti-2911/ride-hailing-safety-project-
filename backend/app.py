# pyre-ignore-all-errors
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(basedir, 'instance', 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')

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
