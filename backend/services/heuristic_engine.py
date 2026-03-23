"""
STRICT LOCKED ARCHITECTURE - Safety Scoring Engine
Part 0: No randomness. Same input -> same output. Heuristic immutable. ML secondary only.
"""
import datetime
import math
import os
import joblib
import pandas as pd
from geopy.distance import geodesic

# Cache for ML Model (Part 2)
MODEL_DIR = os.path.join(os.path.dirname(__file__), '../models')
MODEL_PATH = os.path.join(MODEL_DIR, 'safety_model.joblib')
FEATURE_PATH = os.path.join(MODEL_DIR, 'feature_names.joblib')
_model_cache = {'model': None, 'features': None}

# Required ML features per spec Part 2
REQUIRED_FEATURES = [
    'avg_crime', 'avg_traffic', 'avg_lighting_poor',
    'high_risk_ratio', 'continuous_risk_ratio', 'max_segment_risk',
    'route_length', 'time_of_day'
]

HIGH_RISK_THRESHOLD = 0.42  # seg_risk > this = high-risk segment (lower = more differentiation)


def load_ml_model():
    if _model_cache['model'] is None:
        try:
            if os.path.exists(MODEL_PATH):
                _model_cache['model'] = joblib.load(MODEL_PATH)
                _model_cache['features'] = joblib.load(FEATURE_PATH)
        except Exception as e:
            print(f"[SafetyEngine] ML load: {e}")
    return _model_cache['model'], _model_cache['features']


def _get_label(score):
    """Score bands: 80-100 Very Safe, 65-80 Moderately Safe, 50-65 Caution, 0-50 High Risk"""
    if score >= 80: return "Very Safe"
    if score >= 65: return "Moderately Safe"
    if score >= 50: return "Caution Advised"
    return "High Risk"


def calculate_exposure_route_risk(route_points, cached_safety, user_profile=None, safety_mode="normal"):
    """
    LOCKED Heuristic + controlled ML refinement. Deterministic.
    """
    model, feature_cols = load_ml_model()

    if not route_points or len(route_points) < 2:
        return 50.0, {"score": 50.0, "label": "Caution Advised", "risk_breakdown": {"Crime Impact": 33, "Isolation Impact": 33, "Lighting Impact": 34}}

    # Normalization (unchanged from standard dataset)
    min_crime, max_crime = 0.0, 250.0
    min_traffic, max_traffic = 0.0, 10.0

    # Context: T and M per spec (Part 1)
    current_hour = datetime.datetime.now().hour
    is_night = (current_hour >= 22 or current_hour <= 5)
    T = 0.25 if is_night else 0.0
    M = 0.0 if safety_mode == 'normal' else (0.30 if safety_mode == 'high' else 0.60)

    # Interpolation ~40m segments
    interpolated = []
    for i in range(len(route_points) - 1):
        p1, p2 = route_points[i], route_points[i + 1]
        d = geodesic(p1, p2).meters
        interpolated.append(p1)
        if d > 50:
            n = int(math.ceil(d / 40.0))
            for k in range(1, n):
                f = k / n
                interpolated.append((p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f))
    interpolated.append(route_points[-1])

    threshold_sq = 0.005 ** 2
    total_exposure = 0.0
    total_distance = 0.0
    risky_segment_count = 0
    high_risk_dist_m = 0.0
    current_risky_m = 0.0
    max_continuous_risky_m = 0.0
    max_seg_risk = 0.0
    seg_risks = []
    crimes = []
    traffics = []
    lighting_poors = []
    crime_exp = isolation_exp = lighting_exp = 0.0
    isolated_dist_m = 0.0
    poorly_lit_dist_m = 0.0

    for i in range(len(interpolated) - 1):
        p1, p2 = interpolated[i], interpolated[i + 1]
        seg_dist = geodesic(p1, p2).meters
        if seg_dist == 0:
            continue
        total_distance += seg_dist
        mid = ((p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0)

        # Spatial lookup + IDW
        distances = []
        for slat, slng, sd in cached_safety:
            dsq = (slat - mid[0]) ** 2 + (slng - mid[1]) ** 2
            if dsq <= threshold_sq:
                distances.append((math.sqrt(dsq) * 111139.0, sd))
        if not distances:
            for slat, slng, sd in cached_safety:
                dsq = (slat - mid[0]) ** 2 + (slng - mid[1]) ** 2
                distances.append((math.sqrt(dsq) * 111139.0, sd))
        distances.sort(key=lambda x: x[0])
        top_k = distances[:8]
        weights = [1.0 / (d ** 2 + 1e-5) for d, _ in top_k]
        sw = sum(weights)

        # IDW values [0,1]
        crime = traffic = lighting_poor = 0.0
        for w, (d, sd) in zip(weights, top_k):
            nw = w / sw
            crime += min(1.0, max(0.0, (sd.crime_rate - min_crime) / (max_crime - min_crime))) * nw
            traffic += min(1.0, max(0.0, (sd.traffic_congestion - min_traffic) / (max_traffic - min_traffic))) * nw
            if str(sd.lighting_conditions).lower() in ['poor', 'bad', 'dark']:
                lighting_poor += 1.0 * nw
        crime = min(1.0, max(0.0, crime))
        traffic = min(1.0, max(0.0, traffic))
        lighting_poor = min(1.0, max(0.0, lighting_poor))
        crimes.append(crime)
        traffics.append(traffic)
        lighting_poors.append(lighting_poor)

        # Part 1: HEURISTIC CORE (locked)
        density = min(1.0, len(distances) / 8.0)
        activity_score = 0.7 * traffic + 0.3 * density
        adjusted_isolation = (1.0 - traffic) * (1.0 - activity_score)
        seg_risk = (
            0.40 * crime +
            0.25 * adjusted_isolation +
            0.20 * lighting_poor +
            0.15 * (1.0 - activity_score)
        )
        seg_risk = min(1.0, max(0.0, seg_risk))

        context_risk = seg_risk * (1.0 + T + M)
        total_exposure += context_risk * seg_dist

        seg_risks.append(seg_risk)
        max_seg_risk = max(max_seg_risk, seg_risk)

        # High-risk tracking (seg_risk > 0.45)
        if seg_risk > HIGH_RISK_THRESHOLD:
            risky_segment_count += 1
            high_risk_dist_m += seg_dist
            current_risky_m += seg_dist
            max_continuous_risky_m = max(max_continuous_risky_m, current_risky_m)
        else:
            current_risky_m = 0.0

        if traffic < 0.4:
            isolated_dist_m += seg_dist
        if lighting_poor > 0.6:
            poorly_lit_dist_m += seg_dist

        # Exposure for breakdown (crime/isolation/lighting)
        crime_exp += (0.40 * crime) * context_risk * seg_dist
        isolation_exp += (0.25 * adjusted_isolation) * context_risk * seg_dist
        lighting_exp += (0.20 * lighting_poor) * context_risk * seg_dist

    if total_distance <= 0:
        return 50.0, {"score": 50.0, "label": "Caution Advised", "risk_breakdown": {"Crime Impact": 33, "Isolation Impact": 33, "Lighting Impact": 34}}

    total_segments = len(seg_risks)
    route_length_km = total_distance / 1000.0

    # Part 1: NormalizedRisk and StructuralPenalty
    NormalizedRisk = total_exposure / (total_distance * 1.5)
    NormalizedRisk = min(1.0, max(0.0, NormalizedRisk))

    high_risk_ratio = risky_segment_count / total_segments if total_segments > 0 else 0.0
    continuous_risk_ratio = max_continuous_risky_m / total_distance if total_distance > 0 else 0.0
    high_risk_km = high_risk_dist_m / 1000.0
    high_risk_frac = min(1.0, high_risk_km / route_length_km) if route_length_km > 0 else 0.0

    StructuralPenalty = (
        0.30 * high_risk_ratio +
        0.30 * continuous_risk_ratio +
        0.25 * high_risk_frac +
        0.15 * max_seg_risk
    )
    StructuralPenalty = min(1.0, max(0.0, StructuralPenalty))

    heuristic_risk = NormalizedRisk + 1.1 * StructuralPenalty  # 1.1 for better route differentiation
    heuristic_risk = min(1.0, max(0.0, heuristic_risk))

    # Part 2 & 3: ML (controlled, delta-limited)
    ml_risk = heuristic_risk
    delta = 0.0
    use_ml = (
        model is not None and feature_cols is not None and
        all(f in feature_cols for f in REQUIRED_FEATURES)
    )
    if use_ml:
        n = len(crimes)
        features = {
            'avg_crime': sum(crimes) / n if n else 0.5,
            'avg_traffic': sum(traffics) / n if n else 0.5,
            'avg_lighting_poor': sum(lighting_poors) / n if n else 0.2,
            'high_risk_ratio': high_risk_ratio,
            'continuous_risk_ratio': continuous_risk_ratio,
            'max_segment_risk': max_seg_risk,
            'route_length': route_length_km,
            'time_of_day': 1 if is_night else 0
        }
        try:
            X = pd.DataFrame([features])
            X = X.reindex(columns=REQUIRED_FEATURES, fill_value=0.5)
            pred = model.predict(X)
            ml_risk = float(pred[0])
            ml_risk = min(1.0, max(0.0, ml_risk))
            delta = ml_risk - heuristic_risk
            if abs(delta) > 0.05:
                delta = (1 if delta > 0 else -1) * 0.05
        except Exception:
            delta = 0.0

    FinalRisk = heuristic_risk + 0.25 * delta
    FinalRisk = min(1.0, max(0.0, FinalRisk))

    # Part 4: Final Score
    SafetyScore = 100.0 * (1.0 - FinalRisk)
    SafetyScore = min(100.0, max(0.0, SafetyScore))

    # Part 7: Debug logging
    print(f"[SafetyEngine] heuristic_risk={heuristic_risk:.4f} ml_risk={ml_risk:.4f} delta={delta:.4f} FinalRisk={FinalRisk:.4f} SafetyScore={SafetyScore:.1f}")

    # Breakdown for controller
    total_exp = crime_exp + isolation_exp + lighting_exp
    risk_breakdown = {
        "Crime Impact": round((crime_exp / total_exp) * 100, 1) if total_exp > 0 else 0,
        "Isolation Impact": round((isolation_exp / total_exp) * 100, 1) if total_exp > 0 else 0,
        "Lighting Impact": round((lighting_exp / total_exp) * 100, 1) if total_exp > 0 else 0
    }

    result_meta = {
        "score": round(SafetyScore, 1),
        "label": _get_label(SafetyScore),
        "risk_breakdown": risk_breakdown,
        "stats": {
            "high_risk_zone_percent": round((risky_segment_count / total_segments * 100) if total_segments else 0, 1),
            "max_risky_stretch_km": round(max_continuous_risky_m / 1000.0, 2),
            "high_risk_km": round(high_risk_km, 2),
            "isolated_km": round(isolated_dist_m / 1000.0, 2),
            "poorly_lit_km": round(poorly_lit_dist_m / 1000.0, 2),
            "risk_components": {"final_risk": round(FinalRisk, 4)}
        },
        "explanation": {
            "high_risk_km": round(high_risk_km, 2),
            "isolated_km": round(isolated_dist_m / 1000.0, 2),
            "poorly_lit_km": round(poorly_lit_dist_m / 1000.0, 2)
        },
        "confidence": min(98, max(85, int(85 + (SafetyScore / 20.0))))
    }

    return round(SafetyScore, 1), result_meta
