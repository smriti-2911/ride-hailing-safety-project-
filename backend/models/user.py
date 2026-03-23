from database import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    emergency_contact = db.Column(db.String(20))
    
    # Profile-Based Routing Additions
    age = db.Column(db.Integer, default=25)
    gender = db.Column(db.String(20), default='Unspecified')
    
    def __init__(self, email, password, name, phone=None, emergency_contact=None, age=25, gender='Unspecified'):
        self.email = email
        self.set_password(password)
        self.name = name
        self.phone = phone
        self.emergency_contact = emergency_contact
        self.age = age
        self.gender = gender
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'phone': self.phone,
            'emergency_contact': self.emergency_contact,
            'age': self.age,
            'gender': self.gender
        }
