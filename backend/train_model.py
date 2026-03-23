import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

# Global variables for model and scaler
model = None
scaler = None

def load_and_preprocess_data():
    # Load the dataset
    df = pd.read_csv('safety_data.csv')
    
    # Calculate safety score based on features
    # Higher crime rate and traffic congestion decrease safety
    # Better road conditions, lighting, and closer emergency services increase safety
    df['Safety_Score'] = (
        (10 - df['Crime Rate (Incidents per Year)'] / 20) +  # Normalize crime rate
        (10 - df['Traffic Congestion']) +  # Traffic congestion (1-10)
        (df['Weather Conditions (Visibility in meters)'] / 100) +  # Visibility
        (10 - df['Accident History (Accidents per Year)'] / 5) +  # Normalize accident history
        df['Road Conditions (Score 1-10)'] +
        df['Lighting Conditions (Score 1-10)'] +
        (10 - df['Emergency Services Distance (km)'])  # Closer is better
    ) / 7  # Average of all factors
    
    # Scale the safety score to 0-100
    df['Safety_Score'] = (df['Safety_Score'] / df['Safety_Score'].max()) * 100
    
    # Features for training
    features = [
        'Crime Rate (Incidents per Year)',
        'Traffic Congestion',
        'Weather Conditions (Visibility in meters)',
        'Accident History (Accidents per Year)',
        'Road Conditions (Score 1-10)',
        'Lighting Conditions (Score 1-10)',
        'Emergency Services Distance (km)'
    ]
    
    X = df[features]
    y = df['Safety_Score']
    
    return X, y, df

def train_model():
    global model, scaler
    
    # Check if model already exists
    if os.path.exists('models/safety_model.joblib') and os.path.exists('models/scaler.joblib'):
        try:
            model = joblib.load('models/safety_model.joblib')
            scaler = joblib.load('models/scaler.joblib')
            return model, scaler
        except:
            print("Error loading existing model, retraining...")
    
    # Load and preprocess data
    X, y, df = load_and_preprocess_data()
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train the model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate the model
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"Mean Squared Error: {mse:.2f}")
    print(f"R2 Score: {r2:.2f}")
    
    # Save the model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/safety_model.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    return model, scaler

def predict_safety_score(features):
    global model, scaler
    if model is None or scaler is None:
        train_model()
    features_scaled = scaler.transform([features])
    return model.predict(features_scaled)[0]

# Initialize model when module is imported
train_model()

if __name__ == "__main__":
    train_model() 