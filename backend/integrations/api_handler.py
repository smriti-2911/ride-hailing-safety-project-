import requests

def fetch_api_data(url, params={}):
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    return None
