import time
from geopy.distance import geodesic
import polyline

# Memory cache for active rides (in production, use Redis)
# Format: { ride_id: [ { 'lat': float, 'lng': float, 'timestamp': float } ] }
active_trackers = {}
sos_state = {}  # Tracks if SOS was already triggered for a ride to prevent SMS spam
last_status_map = {} # Tracks the last strictly mapped status to measure transitions

def get_closest_distance(current_coords, polyline_str):
    if not polyline_str:
        return 0
    path_points = polyline.decode(polyline_str)
    user_location = (float(current_coords['lat']), float(current_coords['lng']))
    
    min_distance = float('inf')
    for point in path_points:
        dist = geodesic(user_location, point).meters
        min_distance = min(min_distance, dist)
    return min_distance

def analyze_live_location(ride_id, current_location, expected_polyline, base_safety_score):
    """
    Returns (status_level, ui_message, live_score, action_string)
    status_level: 'ON_SAFE_ROUTE', 'MINOR_DEVIATION', 'SUSTAINED_DEVIATION', 'HIGH_RISK', 'SOS_TRIGGERED', 'RETURNED_TO_ROUTE'
    """
    now = time.time()
    
    if isinstance(current_location, str):
        lat_str, lng_str = current_location.split(',')
        current_location = {'lat': float(lat_str), 'lng': float(lng_str)}
        
    current_ping = {
        'lat': float(current_location['lat']),
        'lng': float(current_location['lng']),
        'timestamp': now
    }
    
    if ride_id not in active_trackers:
        active_trackers[ride_id] = []
        
    history = active_trackers[ride_id]
    history.append(current_ping)
    
    if len(history) > 6:
        history.pop(0)
        
    distance_off_route = float(get_closest_distance(current_location, expected_polyline))
    
    speed_mph = None
    if len(history) >= 2:
        oldest = history[0]
        newest = history[-1]
        dist_traveled_meters = geodesic((oldest['lat'], oldest['lng']), (newest['lat'], newest['lng'])).meters
        time_elapsed_secs = newest['timestamp'] - oldest['timestamp']
        if time_elapsed_secs > 0:
            speed_mps = dist_traveled_meters / time_elapsed_secs
            speed_mph = speed_mps * 2.23694  # m/s to mph

    base_score_val = float(base_safety_score) if base_safety_score is not None else 100.0
    live_score = float(base_score_val)
    
    was_sos = sos_state.get(ride_id, False)
    
    status = 'ON_SAFE_ROUTE'
    message = "System monitoring active. Ride is proceeding normally."
    is_sos_triggered = False
    
    deviated_history = []
    for ping in history:
        dist = get_closest_distance(ping, expected_polyline)
        if dist > 50:
            deviated_history.append(ping)

    if distance_off_route <= 50:
        if speed_mph is not None and speed_mph < 2.0 and len(history) >= 4:
            time_stopped = history[-1]['timestamp'] - history[0]['timestamp']
            if time_stopped > 30:
                if base_score_val < 75.0:
                    status = 'HIGH_RISK'
                    message = "Vehicle stationary in isolated/vulnerable zone for 30s. Safety check initiated."
                    live_score = max(0.0, base_score_val - 25.0)
                else:
                    status = 'ON_SAFE_ROUTE'
                    message = "Traffic or intersection delay detected. Safe zone."
            else:
                status = 'ON_SAFE_ROUTE'
        elif was_sos:
            status = 'RETURNED_TO_ROUTE'
            message = "Vehicle has returned to the planned route. Situation normalized."
            is_sos_triggered = False
        else:
            status = 'ON_SAFE_ROUTE'
    else:
        # Distance > 50m
        if len(deviated_history) >= 2:
            time_absent = deviated_history[-1]['timestamp'] - deviated_history[0]['timestamp']
            
            if distance_off_route > 150 and time_absent >= 30:
                status = 'SOS_TRIGGERED'
                message = "🚨 SOS ALERT: Possible unsafe situation detected. Live tracking link active."
                live_score = max(0.0, base_score_val - 40.0)
                is_sos_triggered = True
            elif time_absent >= 30:
                status = 'HIGH_RISK'
                message = "Vehicle is off-route in a low-safety area. Monitoring closely."
                live_score = max(0.0, base_score_val - 30.0)
            elif time_absent >= 15:
                status = 'SUSTAINED_DEVIATION'
                message = "Vehicle has deviated from planned route and has not returned for 15+ seconds."
                live_score = max(0.0, base_score_val - 15.0)
            else:
                status = 'MINOR_DEVIATION'
                message = "Slight route change detected, monitoring."
                live_score = max(0.0, base_score_val - 5.0)
        else:
            status = 'MINOR_DEVIATION'
            message = "Slight route change detected, monitoring."
            live_score = max(0.0, base_score_val - 5.0)

    final_score = float(max(0.0, min(100.0, live_score)))
    
    # SMS Action Lifecycle Controller
    action = 'NORMAL'
    if is_sos_triggered and not was_sos:
        action = 'NEW_SOS'
    elif is_sos_triggered and was_sos:
        action = 'ONGOING_SOS'
    elif status == 'RETURNED_TO_ROUTE' and was_sos:
        action = 'RECOVERED'
        
    sos_state[ride_id] = is_sos_triggered
    
    # Check for general status transitions to avoid DB log spam
    if 'last_status_map' not in globals():
        global last_status_map
        last_status_map = {}
        
    prev_status = last_status_map.get(ride_id, 'ON_SAFE_ROUTE')
    state_changed = (status != prev_status)
    last_status_map[ride_id] = status
    
    # We pass the state_changed boolean back so the router knows when to write an AlertLog
    return status, message, round(final_score, 1), action, state_changed
