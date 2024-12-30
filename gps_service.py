import requests
from datetime import datetime, timedelta
import random

def get_route(start_lat, start_lon, end_lat, end_lon):
    """Fetch route from OSRM API."""
    url = f'http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson'
    response = requests.get(url)
    data = response.json()
    
    if 'routes' in data:
        return data['routes'][0]['geometry']['coordinates']
    else:
        return []

def generate_vehicle_gps_data(vehicle_id, start_lat, start_lon, end_lat, end_lon):
    """Generate GPS data dynamically for the vehicle."""
    route = get_route(start_lat, start_lon, end_lat, end_lon)
    if not route:
        return []

    gps_data = []
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    for i, (lon, lat) in enumerate(route):
        status = "ride" if random.random() < 0.9 else "break"
        data_point = {
            'vehicle_id': vehicle_id,
            'timestamp': timestamp,
            'longitude': lon,
            'latitude': lat,
            'status': status
        }
        gps_data.append(data_point)
        
        timestamp = (datetime.utcnow() + timedelta(seconds=i * 30)).strftime('%Y-%m-%dT%H:%M:%SZ')
        
    return gps_data
