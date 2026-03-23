from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.ride import Ride
from models.user import User
from database import db
from services.twilio_service import send_alert_sms
from geopy.distance import geodesic
import polyline

ride_bp = Blueprint('ride', __name__)

# -----------------------------
# ✅ Book a ride
# -----------------------------
@ride_bp.route('/book-ride', methods=['POST'])
@jwt_required()
def book_ride():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    source = data.get('source')
    destination = data.get('destination')
    route_data = data.get('route', {})
    safety_score = data.get('safety_score', 0)

    if not source or not destination or not route_data:
        return jsonify({'error': 'Source, destination, and selected route are required'}), 400

    try:
        # Save the exact route selected by the user
        ride = Ride(
            user_id=user.id,
            source=source,
            destination=destination,
            safety_score=safety_score,
            route={"polyline": route_data.get("polyline", "")},
            status="ongoing"
        )
        db.session.add(ride)
        db.session.commit()

        # Notify emergency contacts that tracking started
        phone_numbers = [num for num in [user.phone, user.emergency_contact] if num]
        sms_msg = f"Ride started from {source} to {destination}. Tracking enabled."
        for num in phone_numbers:
            send_alert_sms(num, sms_msg)

        return jsonify({
            'message': 'Ride booked successfully',
            'ride_id': ride.id,
            'safety_score': ride.safety_score
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------------------
# ✅ Advanced Real-Time Risk Monitoring
# -----------------------------
@ride_bp.route('/check-deviation', methods=['POST'])
@jwt_required()
def check_deviation():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    ride_id = data.get('ride_id')
    current_location = data.get('current_location')
    
    if not all([ride_id, current_location]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        user = User.query.get(int(user_id))
        ride = Ride.query.get(ride_id)
        
        if not ride:
            return jsonify({'error': 'Ride not found'}), 404
        if ride.user_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        base_score = ride.safety_score if ride.safety_score else 100.0
        
        # Decode expected polyline points into string for tracker
        route_dict = ride.route if isinstance(ride.route, dict) else {}
        polyline_str = route_dict.get('polyline', '')
        
        # Ping location
        current_lat, current_lng = map(float, current_location.split(','))
        loc_dict = {'lat': current_lat, 'lng': current_lng}
        
        from services.temporal_tracker import analyze_live_location
        status, msg, live_score, action, state_changed = analyze_live_location(ride.id, loc_dict, polyline_str, base_score)

        phone_numbers = [num for num in [user.phone, user.emergency_contact] if num]
        
        # 1. Twilio SMS Routing
        if action == 'NEW_SOS':
            sms_msg = (
                f"🚨 SOS ALERT: Possible unsafe situation detected for your ride "
                f"from {ride.source} to {ride.destination}. Live tracking active."
            )
            for num in phone_numbers:
                send_alert_sms(num, sms_msg)
        elif action == 'RECOVERED':
            sms_msg = (
                f"✅ Update: The vehicle has returned to the planned route. Situation normalized."
            )
            for num in phone_numbers:
                send_alert_sms(num, sms_msg)
        elif state_changed:
            if status == 'SUSTAINED_DEVIATION':
                sms_msg = f"⚠️ NavSafe Warning: Vehicle has deviated from planned route and has not returned for 15+ seconds."
                for num in phone_numbers:
                    send_alert_sms(num, sms_msg)
            elif status == 'HIGH_RISK':
                sms_msg = f"⚠️ NavSafe Alert: Vehicle is off-route in a low-safety area. Monitoring closely."
                for num in phone_numbers:
                    send_alert_sms(num, sms_msg)

        # 2. Database Alert Logging
        if state_changed or action == 'NEW_SOS':
            from models.alert import AlertLog
            from models.sos import SOSEvent
            
            severity = 'Info'
            if status in ['MINOR_DEVIATION', 'RETURNED_TO_ROUTE']:
                severity = 'Warning'
            elif status in ['SUSTAINED_DEVIATION', 'HIGH_RISK']:
                severity = 'Critical'
            elif status == 'SOS_TRIGGERED':
                severity = 'SOS'
                
            new_log = AlertLog(
                ride_id=ride.id,
                event_type=status,
                severity=severity,
                message=msg
            )
            db.session.add(new_log)
            
            if action == 'NEW_SOS':
                new_sos = SOSEvent(ride_id=ride.id, status='active')
                db.session.add(new_sos)
            elif action == 'RECOVERED':
                active_sos = SOSEvent.query.filter_by(ride_id=ride.id, status='active').first()
                if active_sos:
                    active_sos.status = 'resolved'
                    from datetime import datetime
                    active_sos.resolved_at = datetime.utcnow()
                    
            db.session.commit()

        is_sos = (action in ['NEW_SOS', 'ONGOING_SOS'])
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
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# -----------------------------
# ✅ Complete ride
# -----------------------------
@ride_bp.route('/complete/<int:ride_id>', methods=['POST'])
@jwt_required()
def complete_ride(ride_id):
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

        # Send completion SMS
        phone_numbers = [num for num in [user.phone, user.emergency_contact] if num]
        sms_msg = "Ride completed successfully. No risks detected."
        for num in phone_numbers:
            send_alert_sms(num, sms_msg)

        return jsonify({
            'message': 'Ride completed successfully',
            'ride_id': ride.id,
            'status': ride.status
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------------------
# ✅ Fetch Ride Timeline
# -----------------------------
@ride_bp.route('/alerts/<int:ride_id>', methods=['GET'])
@jwt_required()
def get_ride_alerts(ride_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    ride = Ride.query.get(ride_id)
    
    if not ride or ride.user_id != user.id:
        return jsonify({'error': 'Unauthorized or Not Found'}), 403
        
    from models.alert import AlertLog
    alerts = AlertLog.query.filter_by(ride_id=ride_id).order_by(AlertLog.timestamp.desc()).all()
    
    return jsonify({
        'alerts': [a.to_dict() for a in alerts]
    }), 200


