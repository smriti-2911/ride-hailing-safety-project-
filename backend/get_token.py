import sys
from app import app
from flask_jwt_extended import create_access_token
with app.app_context():
    print(create_access_token(identity="1"))
