from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from database import init_db, db
from routes.auth_routes import auth_bp
from routes.safety_routes import safety_bp
from routes.ride_routes import ride_bp

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    app.config.from_object("config.Config")

    init_db(app)  # ✅ Binds db to this app
    JWTManager(app)

    # Import after app is set up to avoid circular issues
    from controllers.route_controller import route_bp
    from controllers.deviation_controller import deviation_controller

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(safety_bp, url_prefix='/safety')
    app.register_blueprint(ride_bp, url_prefix='/ride')
    app.register_blueprint(route_bp, url_prefix="/route")
    app.register_blueprint(deviation_controller, url_prefix="/deviation")

    @app.route("/")
    def home():
        return jsonify({"message": "Welcome to the Ride Safety API!"}), 200

    return app

app = create_app() 