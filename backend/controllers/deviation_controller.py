# controllers/deviation_controller.py
from flask import Blueprint, request, jsonify
from models.ride import Ride
from controllers.ride_controller import check_deviation
from utils.location_utils import decode_polyline

deviation_controller = Blueprint("deviation_controller", __name__)

@deviation_controller.route("/check-deviation", methods=["POST"])
def check_deviation_handler():
    data = request.get_json()
    user_id = data.get("user_id")
    current_location = data.get("current_location")  # Format: "lat,lng"

    if not user_id or not current_location:
        return jsonify({"error": "user_id and current_location are required"}), 400

    # Get the latest ongoing ride for the user
    ride = Ride.query.filter_by(user_id=user_id, status="ongoing").order_by(Ride.id.desc()).first()
    if not ride or not ride.polyline:
        return jsonify({"error": "No active ride found for user"}), 404

    expected_route = decode_polyline(ride.polyline)
    expected_route_str = [f"{lat},{lng}" for lat, lng in expected_route]

    return check_deviation(user_id, current_location, expected_route_str)
