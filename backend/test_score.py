import json
from app import app
from controllers.safety_controller import get_safety_scores
import sys

with app.app_context():
    source = "Pune Station"
    dest = "Hinjewadi Phase 1"
    print(f"Testing route {source} -> {dest}")
    res = get_safety_scores(source, dest)
    
    if isinstance(res, tuple):
        print(json.dumps(res[0], indent=2))
        sys.exit(1)
        
    for i, route_info in enumerate(res.get('routes', [])):
        print(f"ROUTE {i+1}: Score = {route_info.get('safety_score')}")
        print(f"BREAKDOWN: {json.dumps(route_info.get('breakdown'), indent=2)}")
