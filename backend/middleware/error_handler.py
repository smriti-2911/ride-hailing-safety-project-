from flask import jsonify

def handle_404(error):
    return jsonify({"message": "Not Found"}), 404

def handle_500(error):
    return jsonify({"message": "Internal Server Error"}), 500
