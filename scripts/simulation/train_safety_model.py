import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import pickle
import os

def prepare_data(df):
    """
    Cleans and encodes raw synthetic GPS data for the ML model.
    """
    # Create the binary target: 
    # If the label is 'none', it is a Safe ping (0). 
    # If it is a detour, drift, or stop, it is an Unsafe ping (1).
    df['is_unsafe'] = (df['anomaly_label'] != 'none').astype(int)
    
    # Label Encoders
    le_traffic = LabelEncoder()
    df['traffic_level_enc'] = le_traffic.fit_transform(df['traffic_level']) # Low, Med, High
    
    le_zone = LabelEncoder()
    df['zone_risk_enc'] = le_zone.fit_transform(df['zone_risk']) # Safe, Moderate, Dangerous
    
    le_lighting = LabelEncoder()
    df['lighting_enc'] = le_lighting.fit_transform(df['lighting'])
    
    le_isolation = LabelEncoder()
    df['isolation_enc'] = le_isolation.fit_transform(df['isolation'])
    
    le_profile = LabelEncoder()
    df['profile_enc'] = le_profile.fit_transform(df['profile_type'])
    
    # Calculate abnormal delay proxy (speed vs expected speed proxy)
    # If speed is drastically lower than traffic base, proxy for stop/delay
    df['is_stopped'] = (df['speed_kmh'] < 2.0).astype(int)
    
    # Time of Day proxy (Hour extracted from ISO string)
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)

    # Note: Full temporal delay (e.g. stop duration > 3 mins) is kept in the Heuristic engine.
    # The ML gets the instantaneous ping state to learn non-linear combinations.
    
    features = [
        'deviation_m', 
        'speed_kmh', 
        'is_stopped',
        'traffic_level_enc', 
        'zone_risk_enc', 
        'lighting_enc', 
        'isolation_enc', 
        'profile_enc',
        'is_night'
    ]
    
    X = df[features]
    y = df['is_unsafe']
    
    encoders = {
        'traffic': le_traffic,
        'zone': le_zone,
        'lighting': le_lighting,
        'isolation': le_isolation,
        'profile': le_profile
    }
    
    return X, y, encoders

def train_and_save_model():
    print("Loading Synthetic Dataset...")
    data_path = "/Users/smriti/ride-hailing-safety-project copy/datasets/processed/synthetic_gps_streams.csv"
    
    if not os.path.exists(data_path):
        print(f"Error: Could not find data at {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    print(f"Dataset Size: {len(df)} pings.")
    
    X, y, encoders = prepare_data(df)
    
    print("Splitting Data (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Intelligent Safety Model (Random Forest)...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced')
    model.fit(X_train, y_train)
    
    print("\n--- Model Evaluation ---")
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Accuracy: {accuracy * 100:.2f}%")
    print(classification_report(y_test, predictions, target_names=["Safe (0)", "Unsafe (1)"]))
    
    # Save the model and encoders
    model_dir = "/Users/smriti/ride-hailing-safety-project copy/backend/models"
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "safety_engine.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump({'model': model, 'encoders': encoders}, f)
        
    print(f"✅ Master Safety Engine Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
