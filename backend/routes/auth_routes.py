import os
import unicodedata

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func
from models.user import User
from database import db

auth_bp = Blueprint('auth', __name__)


def _normalize_email(value):
    """Strip, lowercase, Unicode NFKC (some browsers send compatibility characters)."""
    if not isinstance(value, str):
        return ''
    return unicodedata.normalize('NFKC', value).strip().lower()


def _user_by_normalized_email(email_norm):
    """Prefer exact match (new rows), then case-insensitive (legacy rows)."""
    if not email_norm:
        return None
    u = User.query.filter_by(email=email_norm).first()
    if u:
        return u
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

    pw = data.get('password')
    if not isinstance(pw, str) or len(pw) == 0:
        return jsonify({'error': 'Invalid password'}), 400

    if _user_by_normalized_email(email_norm):
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=email_norm,
        password=pw,
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

    password = data['password']
    if not isinstance(password, str):
        return jsonify({'error': 'Invalid password format'}), 400

    user = _user_by_normalized_email(email_norm)
    password_ok = bool(user and user.check_password(password))
    if not password_ok:
        if not user:
            current_app.logger.warning('login failed: no user for normalized email')
        else:
            current_app.logger.warning('login failed: bad password for user_id=%s', user.id)
        body = {'error': 'Invalid email or password'}
        # Set AUTH_LOGIN_DEBUG=1 on Render temporarily: Network → response shows no_user vs bad_password.
        if os.environ.get('AUTH_LOGIN_DEBUG') == '1':
            body['debug'] = 'no_user' if not user else 'bad_password'
        return jsonify(body), 401
    
    try:
        access_token = create_access_token(identity=str(user.id))
    except Exception:
        current_app.logger.exception('login failed at create_access_token (check JWT_SECRET_KEY on Render)')
        return jsonify({'error': 'Could not complete sign in. Try again.'}), 500
    try:
        payload = user.to_dict()
    except Exception:
        current_app.logger.exception('login failed at user.to_dict()')
        return jsonify({'error': 'Could not complete sign in. Try again.'}), 500
    return jsonify({'access_token': access_token, 'user': payload}), 200
