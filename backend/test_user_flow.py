import os
import random
import pandas as pd
from datetime import datetime
from services.route_service import get_safest_route

def get_random_locations():
    """Get two specific locations for testing."""
    return "Gokhale Nagar, Pune", "Budhwar Peth, Pune"

def test_routes():
    """Test route generation with random locations."""
    print("\n=== Testing Route Generation ===")
    
    # Get random locations
    start_loc, end_loc = get_random_locations()
    print(f"\nGetting routes from {start_loc} to {end_loc}\n")
    
    # Get routes
    result = get_safest_route(start_loc, end_loc)
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        return
    
    # Print available routes
    print("Available Routes:")
    for i, route in enumerate(result['all_routes'], 1):
        print(f"{i}. {route['path']}")
        print(f"   Safety Score: {route['safety_score']}, Duration: {route['duration']} mins, Distance: {route['distance']} km\n")
    
    # Print recommended route
    safest = result['safest_route']
    print("Recommended Route:")
    print(f"★ {safest['path']}")
    print(f"   Safety Score: {safest['safety_score']}, Duration: {safest['duration']} mins, Distance: {safest['distance']} km")

if __name__ == "__main__":
    test_routes() 