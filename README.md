# Real-Time Ride Safety Monitoring & Predictive Risk Intelligence System

A cutting-edge, portfolio-ready Intelligent Safety layer built for Ride-Hailing Applications. It uses a combination of mathematical heuristics and an advanced Machine Learning engine to monitor rides in real-time, instantly identifying deviations, suspicious stops, and context-aware anomalies.

## Features Built
1. **Pre-Ride Contextual Scoring:** Dynamically scores generated routes based on isolation density, crime zones, and lighting conditions before the ride even starts.
2. **Profile-Based Risk Thresholds:** Applies custom Risk Multipliers based on the rider's profile (e.g., heightened alert sensitivity for Female or Elderly riders late at night).
3. **Real-Time GPS Simulation Engine:** A complete synthetic data generator (`generate_synthetic_rides.py`) that mocks thousands of rides to provide baseline training data.
4. **Hybrid Risk Engine (Heuristics + ML):** Uses true Haversine mathematics to detect physical deviations and context-aware formulas to detect abnormal delays, overriding basic heuristics with a trained Scikit-Learn Random Forest Classifier that accurately flags non-linear dangers.
5. **WebSocket Live Streaming:** Flask-SocketIO pushes 0-100 real-time Risk Intelligence calculations directly to the React frontend every 5 seconds.
6. **Live Risk Dashboard:** A gorgeous React UI featuring an animated Recharts tracker, instantaneous Danger Alerts, and an integrated "Examiner Demo Control" panel to manually fire anomalies during live presentations.

## How to Run the Full Tech Stack

### 1. Start the Live Risk API (WebSocket Gateway)
Runs the Python analytical engine that receives GPS pings and calculates real-time Machine Learning danger scores.
```bash
cd backend
python app.py
```

### 2. Start the Frontend Dashboard
Runs the React Map and the Live Intelligence Dashboard.
```bash
cd frontend
npm start
```

### 3. Demo the Intelligence Live
1. Open the Web App.
2. Search for a route (e.g., Pune Station to Hinjewadi).
3. Click "Book AI Route".
4. Use the **Examiner Demo Controls** at the bottom of the active ride panel to hit "Start 5s GPS Sync".
5. Click **"Inject Detour"** or **"Force Dark Stop"** to watch the ML Risk Score skyrocket and trigger the safety alarms automatically!
