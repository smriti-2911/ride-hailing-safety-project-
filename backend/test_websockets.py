import socketio
import time
import datetime

# Standard Python SocketIO client
sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Live Risk Engine Server!")
    # Step 1: Start a monitored ride
    sio.emit('start_ride', {'ride_id': 'demo_123', 'expected_distance_km': 5.0})

@sio.event
def server_message(data):
    print(f"Message from server: {data}")

@sio.event
def ride_status(data):
    print(f"Status update: {data}")
    # Step 2: Send a dangerous ping to test the ML engine live
    
    ping = {
        'ride_id': 'demo_123',
        'timestamp': datetime.datetime.now().replace(hour=2).isoformat(),
        'actual_lat': 18.52, 'actual_lon': 73.85,
        'expected_lat': 18.53, 'expected_lon': 73.85, # 1.1km deviation
        'speed_kmh': 40,
        'traffic_level': 'Low',
        'zone_risk': 'Moderate',
        'lighting': 'Poorly-lit',
        'isolation': 'Isolated',
        'profile_type': 'Female'
    }
    
    print("\n📡 Emitting Live 5s Ping...")
    sio.emit('gps_ping', ping)

@sio.event
def risk_update(data):
    print(f"\n🧠 Intelligence Result Received:")
    print(f"Live Score: {data['live_score']}/100")
    print(f"Status: {data['status']}")
    print(f"Reasons: {data['reasons']}")
    print(f"ML Contrib: {data['ml_contribution']:.2f}")
    time.sleep(1)
    sio.disconnect()

@sio.event
def disconnect():
    print("Disconnected from server.")

if __name__ == '__main__':
    print("Testing WebSocket connection to localhost:5001...")
    try:
        sio.connect('http://localhost:5001')
        sio.wait()
    except Exception as e:
        print(f"Connection failed: {e}")
