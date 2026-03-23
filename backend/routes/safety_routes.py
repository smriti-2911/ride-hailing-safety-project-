from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from controllers.safety_controller import get_safety_scores

safety_bp = Blueprint("safety", __name__)

@safety_bp.route("/safety-score", methods=["GET"])
@jwt_required()
def safety_score():
    """Get safety scores and optimal route for given locations."""
    source = request.args.get("source")
    destination = request.args.get("destination")

    if not source or not destination:
        return jsonify({"error": "Missing source or destination"}), 400

    try:
        result = get_safety_scores(source, destination)
        
        if isinstance(result, tuple) and result[0].get("error"):
            return jsonify(result[0]), result[1]
            
        if not result.get("routes"):
            return jsonify({"error": "No safe routes found"}), 404

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
