from models.user import User
from database import db
from flask import jsonify
from flask_jwt_extended import create_access_token

def register_user(username, email, password, phone, emergency_contact):
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 409

    user = User(
        email=email,
        password=password,
        name=username,
        phone=phone,
        emergency_contact=emergency_contact
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

def login_user(email, password):
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    
    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone
    }
    
    return jsonify({
        "access_token": access_token,
        "user": user_data
    }), 200
