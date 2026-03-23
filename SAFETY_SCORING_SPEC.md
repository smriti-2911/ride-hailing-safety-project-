# Safety Scoring Specification v1.0

**Project:** NavSafe — Ride-Hailing Safety Monitoring  
**Purpose:** Document the exact, defensible logic behind route safety scores.  
**Audience:** Developers, reviewers, faculty, stakeholders.

---

## 1. Core Principle

Safety score is a **direct, monotonic function of route exposure**.  
There is no arbitrary calibration, no relative normalization, and no hidden scaling.  
Each route receives an **independent absolute score** based solely on its own exposure profile.

---

## 2. Score Interpretation (Bands)

| Score Range | Label           | Interpretation                          |
|-------------|-----------------|-----------------------------------------|
| 80–100      | Very Safe       | Lowest exposure; recommended choice     |
| 65–80       | Moderately Safe | Moderate exposure; acceptable choice   |
| 50–65       | Caution         | Elevated exposure; consider alternatives|
| 0–50        | High Risk       | High exposure; avoid when possible      |

---

## 3. Segment-Level Risk

For each route segment (interpolated ~40m spacing), we compute local risk from nearby safety data points using inverse-distance weighting.

### Feature Weights

| Factor             | Weight | Rationale                                      |
|--------------------|--------|------------------------------------------------|
| Crime              | 0.40   | Primary urban safety correlate                 |
| Adjusted isolation | 0.25   | Low traffic + low activity increases perceived risk |
| Lighting (poor)     | 0.20   | Poor lighting correlates with higher incident risk |
| Activity inverse   | 0.15   | Low human presence (traffic, POI density)      |

### Formulas

```
isolation = 1 - traffic
activity_score = 0.7×traffic + 0.3×local_density_proxy
adjusted_isolation = isolation × (1 - activity_score)

seg_risk = 0.40×crime + 0.25×adjusted_isolation + 0.20×lighting_poor + 0.15×(1 - activity_score)
```

All inputs are normalized to [0, 1] using robust dataset bounds (P10–P90).

---

## 4. Context Model

Time and user sensitivity multipliers:

```
T (time):     day = 0,    night (22:00–05:00) = 0.25
M (mode):     normal = 0,  high = 0.30,  extreme = 0.60

context_risk = seg_risk × (1 + T + M)
```

---

## 5. Route-Level Integration

```
route_risk = Σ(context_risk × segment_distance) / total_distance
```

Interpretation: distance-weighted average risk along the route.

---

## 6. Structural Penalties (Ratio-Based)

```
high_risk_zone_ratio   = (segments with seg_risk > 0.6) / total_segments
continuous_risk_ratio  = longest_risky_stretch_meters / total_distance_meters
structure_penalty      = 0.20×high_risk_zone_ratio + 0.15×continuous_risk_ratio
```

`max_segment_risk` = maximum `seg_risk` over all segments (worst stretch intensity).

---

## 7. Absolute Exposure Fractions (Defensible Addition)

These are the fraction of route length in elevated-risk conditions:

```
high_risk_frac   = high_risk_km / route_length_km    (clamped [0,1])
low_activity_frac = low_activity_km / route_length_km  (clamped [0,1])
```

- `high_risk_km`: total length of segments with `seg_risk > 0.6`
- `low_activity_km`: total length of segments with `activity_score < 0.35`

These terms ensure that routes with different absolute risky lengths receive different scores, even when average risk is similar.

---

## 8. Final Risk (Weighted Combination)

All terms are combined with explicit weights (sum = 1.0):

| Term             | Weight | Purpose                                   |
|------------------|--------|-------------------------------------------|
| route_risk       | 0.35   | Base exposure along the route             |
| structure_penalty| 0.12   | Continuity and concentration of risk      |
| max_segment_risk | 0.10   | Worst stretch intensity                   |
| high_risk_frac   | 0.18   | Fraction of route in high-risk zones      |
| low_activity_frac| 0.25   | Fraction of route in low-activity areas   |

```
final_risk = 0.35×route_risk + 0.12×structure + 0.10×max_segment_risk + 0.18×high_risk_frac + 0.25×low_activity_frac
final_risk = clamp(final_risk, 0, 1)
```

---

## 9. Safety Score

```
safety_score = 100 × (1 - final_risk)
safety_score = clamp(safety_score, 0, 100)
```

Direct, monotonic mapping: higher exposure → lower score.

---

## 10. Confidence Score

```
confidence = 1 - (variance(segment_risks) / 0.25)
confidence = clamp(confidence × 100, 0, 100)
```

Interpretation: stable segment risks → higher confidence; high variance → lower confidence.

---

## 11. Determinism

- No randomness anywhere in the pipeline
- Same route + same safety data → same score
- No baseline centering, no percentile blending, no relative normalization

---

## 12. Example Interpretation

For a route with:

- `route_risk = 0.30`
- `structure_penalty = 0.08`
- `max_segment_risk = 0.55`
- `high_risk_frac = 0.05`
- `low_activity_frac = 0.20`

```
final_risk = 0.35×0.30 + 0.12×0.08 + 0.10×0.55 + 0.18×0.05 + 0.25×0.20
           = 0.105 + 0.0096 + 0.055 + 0.009 + 0.05
           = 0.2286
safety_score = 100 × (1 - 0.2286) ≈ 77
```

Label: Moderately Safe.

---

## 13. File References

- **Engine:** `backend/services/heuristic_engine.py` — `calculate_exposure_route_risk()`
- **Controller:** `backend/controllers/safety_controller.py` — `get_safety_scores()`
- **Data:** `models/safety.py` — `SafetyData` (crime_rate, traffic_congestion, lighting_conditions)

---

*Last updated: Per implementation. This spec is the single source of truth for safety scoring logic.*
