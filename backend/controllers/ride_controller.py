from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.ride import Ride
from models.user import User
from database import db
from services.twilio_service import send_alert_sms
from geopy.distance import geodesic
import polyline
from controllers.safety_controller import get_safety_scores
from datetime import datetime

ride_bp = Blueprint('ride', __name__)

# -----------------------------
# ✅ Book a ride
# -----------------------------
@ride_bp.route('/book-ride', methods=['POST'])
@jwt_required()
def book_ride():
    """Book a new ride and get route options with safety scores."""
    try:
        data = request.get_json()
        source = data.get('source')
        destination = data.get('destination')
        route_obj = data.get('route')
        safety_score = data.get('safety_score')
        
        if not source or not destination or not route_obj:
            return jsonify({"error": "Source, destination, and route data are required"}), 400
            
        # Create new ride with user selected route
        user_id = get_jwt_identity()
        new_ride = Ride(
            user_id=user_id,
            source=source,
            destination=destination,
            route=route_obj,
            safety_score=safety_score,
            status="BOOKED"
        )
        
        db.session.add(new_ride)
        db.session.commit()
        
        return jsonify({"ride_id": new_ride.id, "message": "Ride booked successfully"}), 201
        
    except Exception as e:
        print(f"Error booking ride: {str(e)}")
        return jsonify({"error": "Failed to book ride"}), 500

@ride_bp.route('/start-ride', methods=['POST'])
@jwt_required()
def start_ride():
    """Start a booked ride."""
    try:
        data = request.get_json()
        ride_id = data.get('ride_id')
        
        if not ride_id:
            return jsonify({"error": "Ride ID is required"}), 400
            
        ride = Ride.query.get(ride_id)
        if not ride:
            return jsonify({"error": "Ride not found"}), 404
            
        if ride.user_id != get_jwt_identity():
            return jsonify({"error": "Unauthorized"}), 403
            
        if ride.status != "BOOKED":
            return jsonify({"error": "Ride cannot be started"}), 400
            
        ride.status = "IN_PROGRESS"
        ride.start_time = datetime.utcnow()
        db.session.commit()
        
        return jsonify({"message": "Ride started successfully"}), 200
        
    except Exception as e:
        print(f"Error starting ride: {str(e)}")
        return jsonify({"error": "Failed to start ride"}), 500

@ride_bp.route('/update-location', methods=['POST'])
@jwt_required()
def update_location():
    """Update ride location and check for route deviation."""
    try:
        data = request.get_json()
        ride_id = data.get('ride_id')
        location = data.get('location')
        
        if not ride_id or not location:
            return jsonify({"error": "Ride ID and location are required"}), 400
            
        ride = Ride.query.get(ride_id)
        if not ride:
            return jsonify({"error": "Ride not found"}), 404
            
        if ride.user_id != get_jwt_identity():
            return jsonify({"error": "Unauthorized"}), 403
            
        if ride.status != "IN_PROGRESS":
            return jsonify({"error": "Ride is not in progress"}), 400
            
        # Update current location
        ride.current_location = location
        db.session.commit()
        
        # Check for route deviation
        is_deviated = check_route_deviation(ride, location)
        
        return jsonify({
            "message": "Location updated",
            "is_deviated": is_deviated
        }), 200
        
    except Exception as e:
        print(f"Error updating location: {str(e)}")
        return jsonify({"error": "Failed to update location"}), 500

@ride_bp.route('/complete-ride', methods=['POST'])
@jwt_required()
def complete_ride():
    """Complete an ongoing ride."""
    try:
        data = request.get_json()
        ride_id = data.get('ride_id')
        
        if not ride_id:
            return jsonify({"error": "Ride ID is required"}), 400
            
        ride = Ride.query.get(ride_id)
        if not ride:
            return jsonify({"error": "Ride not found"}), 404
            
        if ride.user_id != get_jwt_identity():
            return jsonify({"error": "Unauthorized"}), 403
            
        if ride.status != "IN_PROGRESS":
            return jsonify({"error": "Ride is not in progress"}), 400
            
        ride.status = "COMPLETED"
        ride.end_time = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "message": "Ride completed successfully",
            "ride_summary": {
                "id": ride.id,
                "source": ride.source,
                "destination": ride.destination,
                "safety_score": ride.safety_score,
                "start_time": ride.start_time.isoformat(),
                "end_time": ride.end_time.isoformat(),
                "duration": str(ride.end_time - ride.start_time)
            }
        }), 200
        
    except Exception as e:
        print(f"Error completing ride: {str(e)}")
        return jsonify({"error": "Failed to complete ride"}), 500

def check_route_deviation(ride, current_location):
    """Check if current location deviates from planned route using decoded polyline."""
    try:
        route_data = ride.route
        polyline_str = route_data.get('polyline', '')
        if not polyline_str:
            return False
            
        path_points = polyline.decode(polyline_str)
        
        # Find closest point on route
        min_distance = float('inf')
        for lat, lng in path_points:
            distance = geodesic(
                (current_location['lat'], current_location['lng']),
                (lat, lng)
            ).meters
            min_distance = min(min_distance, distance)
        
        # If more than 100 meters away from route, consider it deviated
        return min_distance > 100
        
    except Exception as e:
        print(f"Error checking route deviation: {str(e)}")
        return False  # Default to not deviated if check fails


# -----------------------------
# ✅ Check for deviation
# -----------------------------
@ride_bp.route('/check-deviation', methods=['POST'])
@jwt_required()
def check_deviation():
    user_id = get_jwt_identity()
    data = request.get_json()
    ride_id = data.get('ride_id')
    
    current_location = data.get('current_location')
    if current_location and isinstance(current_location, str):
        try:
            lat_str, lng_str = current_location.split(',')
            current_lat, current_lng = float(lat_str), float(lng_str)
        except:
            return jsonify({'error': 'Invalid current_location format'}), 400
    else:
        current_lat = data.get('lat')
        current_lng = data.get('lng')

    if not ride_id or current_lat is None or current_lng is None:
        return jsonify({'error': 'Missing ride_id or coordinates'}), 400

    ride = Ride.query.filter_by(id=ride_id, user_id=user_id).first()
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404

    try:
        base_score = ride.safety_score if ride.safety_score else 100.0
        polyline_str = ride.route.get('polyline', '') if ride.route else ''
        loc_dict = {'lat': current_lat, 'lng': current_lng}
        
        from services.temporal_tracker import analyze_live_location
        status, msg, live_score, is_sos = analyze_live_location(ride.id, loc_dict, polyline_str, base_score)

        if is_sos:
            user = User.query.get(int(user_id))
            if user:
                phone_numbers = [num for num in [user.phone, user.emergency_contact] if num]
                sms_msg = (
                    f"⚠️ Alert! Route deviation detected for your ride "
                    f"from {ride.source} to {ride.destination}. "
                    f"Current location: {current_lat},{current_lng}"
                )
                for num in phone_numbers:
                    send_alert_sms(num, sms_msg)

        reasons = [msg] if msg != "System monitoring active. Ride is proceeding normally." else []

        return jsonify({
            "deviation": is_sos, 
            "message": msg,
            "status": status,
            "score": live_score,
            "reasons": reasons,
            "confidence": 95
        }), 200

    except Exception as e:
        print("Deviation check error:", e)
        return jsonify({'error': str(e)}), 500


@ride_bp.route('/complete-ride/<int:ride_id>', methods=['POST'])
@jwt_required()
def complete_ride_old(ride_id):
    """Complete a ride and update its status."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        ride = Ride.query.get(ride_id)
        if not ride:
            return jsonify({'error': 'Ride not found'}), 404

        if ride.user_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if ride.status != 'ongoing':
            return jsonify({'error': 'Ride is not in progress'}), 400

        # Update ride status
        ride.status = 'completed'
        db.session.commit()

        return jsonify({
            'message': 'Ride completed successfully',
            'ride_id': ride.id,
            'status': ride.status
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

