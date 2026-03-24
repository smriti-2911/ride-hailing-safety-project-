from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func
from models.user import User
from database import db

auth_bp = Blueprint('auth', __name__)


def _normalize_email(value):
    """Production DBs (Postgres) match email case-sensitively; local SQLite often feels looser."""
    if not isinstance(value, str):
        return ''
    return value.strip().lower()


def _user_by_normalized_email(email_norm):
    return User.query.filter(func.lower(User.email) == email_norm).first()


def _coerce_age(value, default=25):
    if value is None or value == '':
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['email', 'password', 'name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    email_norm = _normalize_email(data.get('email'))
    if not email_norm:
        return jsonify({'error': 'Invalid email'}), 400

    if _user_by_normalized_email(email_norm):
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=email_norm,
        password=data['password'],
        name=data['name'],
        phone=data.get('phone'),
        emergency_contact=data.get('emergency_contact'),
        age=_coerce_age(data.get('age'), 25),
        gender=data.get('gender', 'Unspecified')
    )
    
    try:
        db.session.add(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('register commit failed')
        return jsonify({'error': 'Could not save user. Try again.'}), 500
    
    return jsonify({'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Missing email or password'}), 400

    email_norm = _normalize_email(data.get('email'))
    if not email_norm:
        return jsonify({'error': 'Invalid email'}), 400

    user = _user_by_normalized_email(email_norm)
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    try:
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
    except Exception:
        current_app.logger.exception('login token or response failed')
        return jsonify({'error': 'Could not complete sign in. Try again.'}), 500
