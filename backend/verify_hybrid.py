import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from controllers.safety_controller import get_safety_scores
from flask import Flask
from database import db
from models.safety import SafetyData
import json

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def test_hybrid_scoring():
    with app.app_context():
        # Source: Shivaji Nagar, Destination: Hinjewadi (Mocked as strings for controller)
        # The controller will call get_coordinates and get_routes which use real API keys in .env
        source = "Shivaji Nagar, Pune"
        dest = "Hinjewadi, Pune"
        
        print(f"--- TESTING HYBRID SAFETY ENGINE ---")
        print(f"Requesting safety scores for {source} -> {dest}")
        
        try:
            result = get_safety_scores(source, dest, safety_mode="normal")
            
            if "error" in result:
                print(f"ERROR: {result['error']}")
                return

            routes = result['routes']
            print(f"\nFound {len(routes)} routes.")
            
            for i, r in enumerate(routes):
                print(f"\nROUTE {i+1}:")
                print(f"  Score: {r['score']}")
                print(f"  Label: {r['label']}")
                print(f"  Comparison: {r['comparison']}")
                print(f"  Justification: {r['justification']}")
                print(f"  Confidence: {r['confidence']}%")
                print(f"  ML-Heuristic Agreement: {r['stats']['ml_heuristic_agreement']}%")
                print(f"  Breakdown: {r['breakdown']}")
            
            if len(routes) >= 2:
                spread = routes[0]['score'] - routes[-1]['score']
                print(f"\nFinal Score Spread: {spread:.1f}")
                if spread >= 12:
                    print("✅ Mandatory 12-point spread achieved.")
                else:
                    print("❌ Mandatory 12-point spread FAILED.")
                    
        except Exception as e:
            print(f"CRITICAL ERROR during test: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_hybrid_scoring()
