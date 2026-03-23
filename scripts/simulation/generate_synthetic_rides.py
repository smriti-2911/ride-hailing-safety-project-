import numpy as np
import pandas as pd
import datetime
import random
import math
import uuid
import os

def generate_route_points(start_lat, start_lon, end_lat, end_lon, num_points):
    """Generates a perfectly straight sequence of GPS points as the 'expected route'."""
    lats = np.linspace(start_lat, end_lat, num_points)
    lons = np.linspace(start_lon, end_lon, num_points)
    return list(zip(lats, lons))

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in meters between two points on the earth."""
    R = 6371000 # Radius of earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def simulate_ride(ride_id, route_points, start_time, profile_type, anomaly_type="none"):
    """
    Simulates a 5-second GPS ping stream for a single ride along the route points.
    Injects realistic traffic data and explicit anomalies.
    """
    pings = []
    current_time = start_time
    actual_lat, actual_lon = route_points[0]
    
    # Base environmental factors for this route
    traffic_level = random.choice(["Low", "Medium", "High"])
    base_speed_kmh = {"Low": 50, "Medium": 30, "High": 15}[traffic_level]
    
    zone_risk = random.choice(["Safe", "Moderate", "Dangerous"])
    lighting = random.choice(["Well-lit", "Poorly-lit"])
    isolation = random.choice(["Crowded", "Isolated"])
    
    # Setup Anomalies
    detour_active = False
    stop_active = False
    stop_remaining_pings = 0
    drift_active = False
    
    if anomaly_type == "major_detour":
        detour_start_idx = int(len(route_points) * 0.4)
    elif anomaly_type == "suspicious_stop":
        stop_start_idx = int(len(route_points) * 0.6)
        stop_remaining_pings = random.randint(24, 48) # 2 to 4 minutes stop
    elif anomaly_type == "micro_drift":
        drift_active = True
        
    for i, expected_pt in enumerate(route_points):
        # 1. Calculate Expected Movement (5 sec ping)
        expected_lat, expected_lon = expected_pt
        
        # 2. Apply Anomalies to Actual Position
        if detour_active or (anomaly_type == "major_detour" and i >= detour_start_idx):
            detour_active = True
            # Veer off course by roughly 600m
            actual_lat += 0.005 
            actual_lon += 0.005
            speed_kmh = random.uniform(20, 40)
        elif stop_active or (anomaly_type == "suspicious_stop" and i == stop_start_idx):
            stop_active = True
            speed_kmh = 0.0
            stop_remaining_pings -= 1
            if stop_remaining_pings <= 0:
                stop_active = False
        else:
            # Normal movement, follow route, maybe slight micro-drift
            actual_lat = expected_lat + (random.uniform(-0.0001, 0.0001) if drift_active else 0)
            actual_lon = expected_lon + (random.uniform(-0.0001, 0.0001) if drift_active else 0)
            speed_kmh = base_speed_kmh * random.uniform(0.8, 1.2) # minor traffic fluctuations

        # 3. Calculate Live Heuristics at this exact ping
        dev_m = haversine_distance(actual_lat, actual_lon, expected_lat, expected_lon)
        
        # 4. Record Ping
        pings.append({
            "ride_id": ride_id,
            "timestamp": current_time.isoformat(),
            "actual_lat": actual_lat,
            "actual_lon": actual_lon,
            "expected_lat": expected_lat,
            "expected_lon": expected_lon,
            "speed_kmh": speed_kmh,
            "deviation_m": round(dev_m, 2),
            "traffic_level": traffic_level,
            "zone_risk": zone_risk,
            "lighting": lighting,
            "isolation": isolation,
            "profile_type": profile_type,
            "anomaly_label": anomaly_type # Ground truth label for ML
        })
        
        # Advance time by 5 seconds
        if not stop_active:
            current_time += datetime.timedelta(seconds=5)
        else:
            current_time += datetime.timedelta(seconds=5) # time passes even if stopped
            
    return pings

if __name__ == "__main__":
    print("Starting Synthetic Data Generation Engine...")
    
    # Pune coordinate bounds approximation
    PUNE_LAT_MIN, PUNE_LAT_MAX = 18.4, 18.7
    PUNE_LON_MIN, PUNE_LON_MAX = 73.7, 74.0
    
    all_pings = []
    
    NUM_RIDES = 100
    POINTS_PER_ROUTE = 50 # roughly corresponds to a 4-minute segment
    
    anomaly_types = ["none", "major_detour", "suspicious_stop", "micro_drift"]
    anomaly_weights = [0.70, 0.10, 0.10, 0.10] # 70% normal rides, 30% anomalous
    
    profiles = ["Default", "Female", "Elderly"]
    
    for i in range(NUM_RIDES):
        ride_id = str(uuid.uuid4())[:8]
        start_lat = random.uniform(PUNE_LAT_MIN, PUNE_LAT_MAX)
        start_lon = random.uniform(PUNE_LON_MIN, PUNE_LON_MAX)
        end_lat = start_lat + random.uniform(-0.02, 0.02)
        end_lon = start_lon + random.uniform(-0.02, 0.02)
        
        route = generate_route_points(start_lat, start_lon, end_lat, end_lon, POINTS_PER_ROUTE)
        start_time = datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 30))
        
        is_night = random.choice([True, False])
        if is_night:
            start_time = start_time.replace(hour=random.randint(0, 4))
        else:
            start_time = start_time.replace(hour=random.randint(8, 18))
            
        anomaly = random.choices(anomaly_types, weights=anomaly_weights)[0]
        profile = random.choice(profiles)
        
        ride_pings = simulate_ride(ride_id, route, start_time, profile, anomaly)
        all_pings.extend(ride_pings)
        
        if (i+1) % 20 == 0:
            print(f"Generated {i+1} rides...")
            
    df = pd.DataFrame(all_pings)
    
    # Save the output
    output_dir = "/Users/smriti/ride-hailing-safety-project copy/datasets/processed"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "synthetic_gps_streams.csv")
    df.to_csv(output_path, index=False)
    
    print(f"\n✅ Successfully generated {len(df)} GPS pings.")
    print(f"✅ Saved synthetic dataset to {output_path}")
