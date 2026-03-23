from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.ride import Ride
from models.user import User
from controllers.safety_controller import get_safety_scores

history_bp = Blueprint('history', __name__)

@history_bp.route('/post-ride/<int:ride_id>', methods=['GET'])
@jwt_required()
def get_post_ride_analysis(ride_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    ride = Ride.query.get(ride_id)
    if not ride or ride.user_id != user.id:
        return jsonify({'error': 'Ride not found or unauthorized'}), 404
        
    user_profile = {'age': user.age, 'gender': user.gender}
    
    # Calculate counterfactuals using the Deterministic Engine
    score_result = get_safety_scores(ride.source, ride.destination, user_profile, "normal")
    
    routes = score_result.get('routes', [])
    safest_route = score_result.get('safest_route')
    
    counterfactual = None
    if safest_route and safest_route['safety_score'] > ride.safety_score:
        improvement = round(safest_route['safety_score'] - ride.safety_score, 1)
        counterfactual = {
            "message": f"Safer Route Option B could have increased Safety by {improvement} points.",
            "safest_score": safest_route['safety_score'],
            "actual_score": ride.safety_score
        }
    else:
        counterfactual = {
            "message": "You took the safest available route for this journey.",
            "safest_score": ride.safety_score,
            "actual_score": ride.safety_score
        }
        
    return jsonify({
        "ride_id": ride.id,
        "source": ride.source,
        "destination": ride.destination,
        "status": ride.status,
        "final_safety_score": ride.safety_score,
        "counterfactual": counterfactual
    }), 200
