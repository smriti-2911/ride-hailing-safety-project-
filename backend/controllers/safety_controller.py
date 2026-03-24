import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.safety import SafetyData
from models.user import User
from services.google_maps import get_routes, get_coordinates
from database import db
import polyline

safety_bp = Blueprint("safety_bp", __name__)

@safety_bp.route("/safety-score", methods=["GET"])
@jwt_required()
def api_get_safety_scores():
    source = request.args.get("source")
    destination = request.args.get("destination")
    safety_mode = request.args.get("safety_mode", "normal")
    if not source or not destination:
        return jsonify({"error": "Source and destination are required"}), 400
        
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_profile = {'age': user.age, 'gender': user.gender} if user else None
        
    result = get_safety_scores(source, destination, user_profile, safety_mode)
    if isinstance(result, tuple):
        return jsonify(result[0]), result[1]
    return jsonify(result), 200

def get_safety_scores(source, destination, user_profile=None, safety_mode="normal"):
    """Get deterministic, explainable safety scores for route alternatives."""
    print(f"Looking up safety data for source: {source} and destination: {destination}")

    if not (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip():
        return {
            "error": "Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in backend/.env and restart the API.",
        }, 400

    source_coords = get_coordinates(source)
    dest_coords = get_coordinates(destination)

    if not source_coords or not dest_coords:
        return {"error": "Could not get coordinates for locations"}, 400

    routes = get_routes(source_coords, dest_coords)
    if not routes:
        return {"error": "No routes found between locations"}, 404

    from models.safety import SafetyData
    all_safety_data = SafetyData.query.all()
    cached_safety = [(sd.latitude, sd.longitude, sd) for sd in all_safety_data]

    processed_routes = []
    
    from services.heuristic_engine import calculate_exposure_route_risk
    
    for route in routes:
        try:
            route_points = polyline.decode(route.get('polyline', ''))
            final_score, breakdown = calculate_exposure_route_risk(route_points, cached_safety, user_profile, safety_mode)
            
            processed_routes.append({
                'route': route,
                'score': final_score,
                'breakdown': breakdown
            })
        except Exception as e:
            print(f"Error processing route: {e}")

    if not processed_routes:
        return {"error": "Failed to process any routes"}, 500

    # Absolute score is fully independent per route, produced by engine:
    # safety_score = 100 * (1 - final_risk)
    for i in range(len(processed_routes)):
        processed_routes[i]["absolute_score"] = round(processed_routes[i]["score"], 1)

    # Rank by absolute safety only.
    processed_routes.sort(key=lambda x: x["absolute_score"], reverse=True)
    safest_score = processed_routes[0]["absolute_score"]
    safest_duration = processed_routes[0]["route"].get("duration", 1) or 1
    safest_distance = processed_routes[0]["route"].get("distance", 1) or 1

    # Balanced route must remain close to safest on safety, then optimize ETA/distance.
    if len(processed_routes) > 2:
        safety_band = 10.0
        candidate_indices = [
            i for i in range(1, len(processed_routes))
            if (safest_score - processed_routes[i]["absolute_score"]) <= safety_band
        ]
        if not candidate_indices:
            candidate_indices = [1]

        best_balance_idx = candidate_indices[0]
        best_balance_value = float("inf")
        for i in candidate_indices:
            candidate = processed_routes[i]
            score_gap = max(0.0, safest_score - candidate["absolute_score"])
            duration = candidate["route"].get("duration", safest_duration) or safest_duration
            distance = candidate["route"].get("distance", safest_distance) or safest_distance
            eta_penalty = max(0.0, (duration - safest_duration) / safest_duration)
            distance_penalty = max(0.0, (distance - safest_distance) / safest_distance)
            balance_value = (score_gap * 1.0) + (eta_penalty * 12.0) + (distance_penalty * 6.0)
            if balance_value < best_balance_value:
                best_balance_value = balance_value
                best_balance_idx = i
        if best_balance_idx != 1:
            processed_routes[1], processed_routes[best_balance_idx] = processed_routes[best_balance_idx], processed_routes[1]

    for r in processed_routes:
        r["absolute_score"] = round(r["absolute_score"], 1)

    safest_absolute_score = processed_routes[0]["absolute_score"]
    abs_spread = max(r["absolute_score"] for r in processed_routes) - min(r["absolute_score"] for r in processed_routes)
    near_equal_safety = abs_spread <= 5.0

    # Route roles (mandatory terminology).
    # recommended -> highest safety
    # fastest -> lowest ETA among remaining
    # alternative -> remaining route
    fastest_idx = None
    if len(processed_routes) > 1:
        best_eta = float("inf")
        for i in range(1, len(processed_routes)):
            eta = processed_routes[i]["route"].get("duration", float("inf"))
            if eta < best_eta:
                best_eta = eta
                fastest_idx = i

    # Precompute comparison baselines for explanations
    recommended_meta = processed_routes[0]["breakdown"]
    recommended_high_risk = recommended_meta.get("explanation", {}).get("high_risk_km") or recommended_meta.get("stats", {}).get("high_risk_km", 0.0)
    recommended_stretch = recommended_meta.get("stats", {}).get("max_risky_stretch_km", 0.0)
    fastest_high_risk = recommended_high_risk
    if fastest_idx is not None and fastest_idx != 0:
        fm = processed_routes[fastest_idx]["breakdown"]
        fastest_high_risk = fm.get("explanation", {}).get("high_risk_km") or fm.get("stats", {}).get("high_risk_km", 0.0)
    fastest_duration = processed_routes[fastest_idx]["route"].get("duration", safest_duration) if fastest_idx is not None else safest_duration

    # Build explainable output contract for frontend.
    for idx, r in enumerate(processed_routes):
        absolute_score = r["absolute_score"]
        meta = r['breakdown']
        risk_components = meta.get("stats", {}).get("risk_components", {})
        final_risk = risk_components.get("final_risk", 0.0)
        score = round(absolute_score, 1)

        # Labels: Safe 75-90, Medium 55-75, Risky 30-55, Dangerous <30
        label = meta.get("label", "High Risk")

        # Relative comparison—concrete and demo-friendly.
        if idx == 0:
            comparison = "Recommended: highest safety score among all route options"
        else:
            pt_diff = round(safest_absolute_score - absolute_score, 1)
            diff_pct = round(((safest_absolute_score - absolute_score) / (safest_absolute_score + 1e-5)) * 100)
            comparison = f"{pt_diff:.0f} points lower ({absolute_score:.0f} vs {safest_absolute_score:.0f}) — {diff_pct}% less safe than recommended"
            if near_equal_safety:
                comparison += "; scores are close; ranking favors continuity and efficiency"

        # PART 3: Distance-based explanation (high_risk_km, isolated_km, poorly_lit_km)
        stats = meta.get('stats', {})
        explanation = meta.get('explanation', {})
        risk_breakdown = meta.get('risk_breakdown', {})
        high_risk_km = explanation.get("high_risk_km", stats.get("high_risk_km", 0.0))
        isolated_km = explanation.get("isolated_km", stats.get("isolated_km", 0.0))
        poorly_lit_km = explanation.get("poorly_lit_km", stats.get("poorly_lit_km", 0.0))
        stretch = stats.get("max_risky_stretch_km", 0.0)
        crime_pct = risk_breakdown.get("Crime Impact", 0)
        isolation_pct = risk_breakdown.get("Isolation Impact", 0)
        lighting_pct = risk_breakdown.get("Lighting Impact", 0)
        duration_sec = r["route"].get("duration", safest_duration) or safest_duration
        eta_delta_min = round((duration_sec - safest_duration) / 60.0, 1)

        # Extra context (exclude high_risk_km to avoid repetition)
        extra_parts = []
        if isolated_km > 0:
            extra_parts.append(f"{isolated_km:.1f} km in low-activity areas")
        if poorly_lit_km > 0:
            extra_parts.append(f"{poorly_lit_km:.1f} km poorly lit")
        extra_str = " · ".join(extra_parts) if extra_parts else ""
        risk_mix = f"Crime {crime_pct:.0f}%, Isolation {isolation_pct:.0f}%, Lighting {lighting_pct:.0f}%"

        # Build user-friendly justification (no repetition, clear structure)
        if idx == 0:
            if high_risk_km > 0:
                if fastest_idx is not None and fastest_idx != 0 and abs(fastest_high_risk - high_risk_km) > 0.1:
                    saved = fastest_high_risk - high_risk_km
                    lead = f"Minimizes high-risk exposure — only {high_risk_km:.1f} km through higher-risk areas ({saved:.1f} km less than the fastest route)."
                else:
                    lead = f"Minimizes high-risk exposure — only {high_risk_km:.1f} km through higher-risk areas."
            else:
                lead = "Minimizes high-risk exposure — no segments through higher-risk areas."
            justification = f"{lead} Longest risky stretch: {stretch:.1f} km."
            if extra_str:
                justification += f" {extra_str}."
            justification += f" Risk mix: {risk_mix}."
        else:
            diff_km = high_risk_km - recommended_high_risk
            if high_risk_km > 0:
                if abs(diff_km) > 0.1:
                    if diff_km > 0:
                        lead = f"{high_risk_km:.1f} km in higher-risk areas (+{diff_km:.1f} km more than recommended)."
                    else:
                        lead = f"{high_risk_km:.1f} km in higher-risk areas ({abs(diff_km):.1f} km less than recommended)."
                else:
                    lead = f"{high_risk_km:.1f} km in higher-risk areas (similar to recommended)."
            else:
                lead = "No high-risk segments."
            justification = f"{lead} Longest risky stretch: {stretch:.1f} km."
            if extra_str:
                justification += f" {extra_str}."
            justification += f" Risk mix: {risk_mix}."
            if eta_delta_min < -1:
                extra_risk = high_risk_km - recommended_high_risk
                if extra_risk > 0.5:
                    justification += f" Saves ~{abs(eta_delta_min):.0f} min but adds {extra_risk:.1f} km in high-risk zones."
                else:
                    justification += f" Saves ~{abs(eta_delta_min):.0f} min."
            elif eta_delta_min > 1:
                justification += f" Adds ~{eta_delta_min:.0f} min."

        route_variant = "alternative"
        if idx == 0:
            route_variant = "recommended"
        elif fastest_idx is not None and idx == fastest_idx:
            route_variant = "fastest"

        # Only crime, isolation, lighting
        allowed = ("Crime Impact", "Isolation Impact", "Lighting Impact")
        top_factors = [
            f"{k} {float(v):.0f}%" for k, v in sorted(risk_breakdown.items(), key=lambda x: -float(x[1] or 0))
            if k in allowed and v is not None and float(v or 0) > 0
        ]

        breakdown_payload = {
            "justification": justification,
            "risk_breakdown": risk_breakdown,
            "explanation": {
                "high_risk_km": high_risk_km,
                "isolated_km": isolated_km,
                "poorly_lit_km": poorly_lit_km,
            },
            "risk_distribution": meta.get("risk_distribution", {}),
            "top_factors": top_factors,
            "why_summary": " | ".join(top_factors) if top_factors else "Crime, isolation, lighting",
            "confidence": meta.get("confidence", 90),
            "stats": stats,
            "key_metrics": {
                "route_length_km": stats.get("route_length_km", 0),
                "high_risk_km": high_risk_km,
                "isolated_km": isolated_km,
                "poorly_lit_km": poorly_lit_km,
                "max_risky_stretch_km": stats.get("max_risky_stretch_km", 0)
            },
            "scoring_method": {
                "absolute_score": round(absolute_score, 1),
                "final_risk": round(final_risk, 4),
                "route_set_spread": round(abs_spread, 1),
                "near_equal_safety": near_equal_safety
            }
        }

        # Final output format per route.
        processed_routes[idx] = {
            "score": score,  # backward compatibility
            "safety_score": round(score, 1),
            "absolute_safety_score": round(absolute_score, 1),
            "label": label,
            "route_variant": route_variant,
            "near_equal_safety": near_equal_safety,
            "comparison": comparison,
            "breakdown": breakdown_payload,
            "justification": justification,  # backward compatibility
            "confidence": meta.get("confidence", 90),  # backward compatibility
            "stats": stats,  # backward compatibility
            "route": r['route']
        }

    return {
        'routes': processed_routes,
        'safest_route': processed_routes[0]
    }