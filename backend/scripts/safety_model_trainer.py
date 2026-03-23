"""
Part 2: Train RandomForestRegressor to APPROXIMATE heuristic_risk.
Target: heuristic_risk. Features: exactly as spec.
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Must match heuristic_engine.REQUIRED_FEATURES
FEATURES = [
    'avg_crime', 'avg_traffic', 'avg_lighting_poor',
    'high_risk_ratio', 'continuous_risk_ratio', 'max_segment_risk',
    'route_length', 'time_of_day'
]
TARGET = 'heuristic_risk'


def generate_synthetic_data(num_samples=5000):
    """Synthetic data where target approximates heuristic formula."""
    np.random.seed(42)
    avg_crime = np.random.uniform(0, 0.8, num_samples)
    avg_traffic = np.random.uniform(0.2, 0.9, num_samples)
    avg_lighting_poor = np.random.uniform(0, 0.5, num_samples)
    high_risk_ratio = np.random.uniform(0, 0.3, num_samples)
    continuous_risk_ratio = np.random.uniform(0, 0.2, num_samples)
    max_segment_risk = np.random.uniform(0.2, 0.8, num_samples)
    route_length = np.random.uniform(1, 25, num_samples)
    time_of_day = np.random.choice([0, 1], num_samples)

    # Target = heuristic-like (no randomness for determinism)
    normalized_risk = 0.4 * avg_crime + 0.25 * (1 - avg_traffic) + 0.2 * avg_lighting_poor
    structural = 0.30 * high_risk_ratio + 0.30 * continuous_risk_ratio + 0.25 * (high_risk_ratio * 2) + 0.15 * max_segment_risk
    heuristic_risk = np.clip(normalized_risk + 0.85 * structural, 0, 1.0)

    return pd.DataFrame({
        'avg_crime': avg_crime,
        'avg_traffic': avg_traffic,
        'avg_lighting_poor': avg_lighting_poor,
        'high_risk_ratio': high_risk_ratio,
        'continuous_risk_ratio': continuous_risk_ratio,
        'max_segment_risk': max_segment_risk,
        'route_length': route_length,
        'time_of_day': time_of_day,
        'heuristic_risk': heuristic_risk
    })


def train_model():
    print("Training ML model (target=heuristic_risk, features=spec)...")
    df = generate_synthetic_data(8000)
    X = df[FEATURES]
    y = df[TARGET]
    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X, y)

    model_path = os.path.join(os.path.dirname(__file__), '../models/safety_model.joblib')
    feat_path = os.path.join(os.path.dirname(__file__), '../models/feature_names.joblib')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    joblib.dump(FEATURES, feat_path)
    print(f"Saved to {model_path}")
    print(f"Features: {FEATURES}")


if __name__ == "__main__":
    train_model()
