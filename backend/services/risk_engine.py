import math
import datetime
from geopy.distance import geodesic
from models.safety import SafetyData

class LiveRiskEngine:
    def __init__(self):
        self.ride_state = {}

    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def evaluate_ping(self, ride_id, ping_location, route_points, context, user_profile):
        """
        Explains risk based on physical deviation and simulated context parameters.
        Returns explicit score, category, and textual reasons.
        """
        # State tracking for rolling window
        if ride_id not in self.ride_state:
            self.ride_state[ride_id] = {'pings': []}
            
        speed_class = context.get('speedClass', 'Normal')
        self.ride_state[ride_id]['pings'].append(speed_class)
        recent_pings = self.ride_state[ride_id]['pings'][-10:] # Store last 10
        self.ride_state[ride_id]['pings'] = recent_pings

        reasons = []
        score = 0
        status = "Safe"
        
        # 0. Micro-Anomaly Erraticism Detection
        if len(recent_pings) >= 5:
            transitions = sum(1 for i in range(1, len(recent_pings)) if recent_pings[i] != recent_pings[i-1])
            if transitions >= 4:
                score += 25
                reasons.append("⚠️ Micro-Anomaly: Highly erratic start/stop driving behavior detected.")
        
        # 1. Geographic Deviation Analysis
        min_distance = float('inf')
        closest_index = 0
        for idx, point in enumerate(route_points):
            distance = geodesic(ping_location, point).meters
            if distance < min_distance:
                min_distance = distance
                closest_index = idx
            
        if min_distance > 100:
            score += 85
            reasons.append(f"🛑 Major route deviation ({int(min_distance)}m off polyline).")
        elif min_distance > 50:
            score += 35
            reasons.append(f"⚠️ Minor sustained route drift ({int(min_distance)}m).")
            
        # 2. Predictive Ahead Scanning (Scan ~5-10 indices ahead representing ~500m)
        look_ahead = closest_index + 10
        if look_ahead < len(route_points):
            future_point = route_points[look_ahead]
            # Fast check if future point is near a known high crime SafetyData marker
            # We don't query the DB entirely per ping for performance, but we query for extreme zones
            # High-crime zones: >150 incidents/year (raw) or >0.6 (if normalized)
            dangerous_zones = SafetyData.query.filter(SafetyData.crime_rate > 150).all()
            for zone in dangerous_zones:
                if geodesic(future_point, (zone.latitude, zone.longitude)).meters < 500:
                    score += 10
                    reasons.append(f"🔮 Predictive Warning: Approaching known high-risk sector ({zone.location}).")
                    break

        # 3. Contextual Stop & Speed Analysis
        pause_duration = context.get('pauseDuration', 0)
        
        if speed_class == 'Stopped' or pause_duration > 8000:
            if pause_duration > 15000:
                score += 60
                reasons.append(f"🛑 Abnormal prolonged stop detected ({pause_duration/1000}s) in unsupervised zone.")
            elif pause_duration >= 8000:
                reasons.append(f"ℹ️ Verified intersection/traffic stop ({pause_duration/1000}s). Normal.")
                # We do NOT add a penalty for recognized traffic light stops.
        elif speed_class == 'Crawling':
            score += 10
            reasons.append("ℹ️ Traffic jam/crawling speeds detected.")
        elif speed_class == 'Speeding':
            score += 15
            reasons.append("⚠️ Excessive pacing detected.")
            
        # 4. Dynamic Profile Sensitivity
        if user_profile:
            is_night = datetime.datetime.now().hour >= 22 or datetime.datetime.now().hour <= 5
            if user_profile.get('gender') == 'Female' and is_night and score > 20:
                score += 25
                reasons.append("⚠️ High Context Sensitivity Escalation (Night Travel + Anomaly + Female Profile)")
                
        # Final Labeling & Classification
        final_score = min(100, score)
        if final_score >= 75:
            status = "Critical Danger"
        elif final_score >= 35:
            status = "Warning"
            
        # Include a confidence index based on ping consistency
        confidence = "High" if speed_class != 'Stopped' and min_distance < 50 else "Medium"
            
        return {
            "score": final_score,
            "status": status,
            "reasons": reasons,
            "distance_off_route": min_distance,
            "confidence": confidence
        }

# Global singleton
live_risk_engine = LiveRiskEngine()
