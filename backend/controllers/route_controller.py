from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import os
import sys

# Add parent directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from services.route_service import get_safest_route

route_bp = Blueprint('route', __name__)

@route_bp.route('/safest', methods=['POST'])
@jwt_required()
def get_safest_route_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    start_address = data.get('start_address')
    end_address = data.get('end_address')
    
    if not start_address or not end_address:
        return jsonify({'error': 'Missing start or end address'}), 400
    
    try:
        routes, safest_route = get_safest_route(start_address, end_address)
        return jsonify({
            'routes': routes,
            'safest_route': safest_route
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
