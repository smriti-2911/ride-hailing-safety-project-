from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def jwt_required_custom(fn):
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        except:
            return jsonify({"message": "Unauthorized"}), 401
    return wrapper
