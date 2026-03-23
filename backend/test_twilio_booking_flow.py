import requests

BASE_URL = "http://localhost:5001/api"

print("Logging in...")
res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "testsim5@example.com",
    "password": "password123"
})
if res.status_code != 200:
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "testuser_sim5",
        "email": "testsim5@example.com",
        "password": "password123",
        "phone": "+918087965908",
        "emergency_contact": "+918087965908" # Replace this locally if needed
    })
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "testsim5@example.com", "password": "password123"})

token = res.json().get('access_token')
headers = {"Authorization": f"Bearer {token}"}

print("Simulating SOS Deviation to trigger Twilio...")
# Fetching the valid Ride ID 2 from our DB insertion earlier
dev_payload = {
    "ride_id": 2, 
    "current_location": "18.5,73.8"
}
dev_res = requests.post(f"{BASE_URL}/ride/check-deviation", json=dev_payload, headers=headers)
print("Deviation Response Status:", dev_res.status_code)
print("Deviation Response:", dev_res.text)

