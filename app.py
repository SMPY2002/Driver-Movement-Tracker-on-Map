from flask import Flask, jsonify, render_template, send_from_directory, request
from gps_service import generate_vehicle_gps_data  # This is my GPS service module(creating sample data)
import json
import os
import datetime

app = Flask(__name__, static_folder='static')

# <-------------------------Function to Save Ride Data to history.json------------------------->

from datetime import datetime

def save_ride_to_history(vehicle_id, path, history_file="static/data/history.json"):
    """
    Saves ride data to history.json when a journey is completed, ensuring that
    ride_no is reset every day for each vehicle.

    Args:
        vehicle_id (str): The ID of the vehicle.
        path (list): The list of GPS points representing the journey.
        history_file (str): Path to the history.json file.
    """
    try:
        # Extract start and end timestamps from the path
        start_time = path[0]["timestamp"]
        end_time = path[-1]["timestamp"]

        # Format path to match the expected history.json format
        formatted_path = [
            {
                "latitude": point["latitude"],
                "longitude": point["longitude"],
                "status": point["status"],
                "timestamp": point["timestamp"]
            }
            for point in path
        ]

        # Load existing history data
        if os.path.exists(history_file):
            with open(history_file, "r") as file:
                history_data = json.load(file)
        else:
            history_data = {"history": []}

        # Get the current date in YYYY-MM-DD format
        current_date = datetime.utcnow().strftime("%Y-%m-%d")

        # Find the rides for the given vehicle_id
        vehicle_rides = [ride for ride in history_data["history"] if ride["vehicle_id"] == vehicle_id]
        
        # Find the last ride for the vehicle, if any
        last_ride = None
        if vehicle_rides:
            last_ride = max(vehicle_rides, key=lambda x: x["ride_no"])

        # If there are no rides or the last ride was on a different day, reset ride_no
        if not last_ride or last_ride["start_time"].split('T')[0] != current_date:
            next_ride_no = 1  # Start from 1 if it's a new day or no rides yet
        else:
            next_ride_no = last_ride["ride_no"] + 1  # Increment from the last ride's ride_no

        # Create a new journey entry
        new_journey = {
            "ride_no": next_ride_no,
            "vehicle_id": vehicle_id,
            "start_time": start_time,
            "end_time": end_time,
            "path": formatted_path
        }

        # Append the new journey entry to the history data
        history_data["history"].append(new_journey)

        # Save the updated history data back to the file
        with open(history_file, "w") as file:
            json.dump(history_data, file, indent=4)

        print(f"Ride {next_ride_no} for vehicle {vehicle_id} saved successfully on {current_date}.")

    except Exception as e:
        print(f"Error saving journey to history: {e}")

# <-------------------------Function to Save Ride Data to history.json------------------------->

# <--------------------------------------All Routes-------------------------------------------->

# <-------------------------------------Route for Home Page---------------------------------->

@app.route('/')
def home():
    return render_template('index.html')

# Route to get live GPS data for a specific vehicle
@app.route('/api/get_vehicle_gps_data/<vehicle_id>', methods=['GET'])
def get_vehicle_gps_data(vehicle_id):
    try:
        with open('static/data/vehicles.json', 'r') as file:
            data = json.load(file)

        # Search for the vehicle in the moving_vehicles section
        for vehicle in data['moving_vehicles']:
            if vehicle['vehicle_id'] == vehicle_id:
                start_lat = vehicle['start_lat']
                start_lng = vehicle['start_lng']
                end_lat = vehicle['end_lat']
                end_lng = vehicle['end_lng']
                # Generate GPS data between start and end points
                gps_data = generate_vehicle_gps_data(vehicle_id, start_lat, start_lng, end_lat, end_lng)
                # Save the generated gps_data directly to history.json
                if gps_data:
                    save_ride_to_history(vehicle_id, gps_data)

                return jsonify(gps_data)

        return jsonify({'error': 'Vehicle not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# <------------------------------------------------------------------------------------------>

# <--------------------------------------Route for All Vehicles-------------------------------->
# Route to get all vehicles data (moving, free, idle)
@app.route('/api/get_all_vehicles', methods=['GET'])
def get_all_vehicles():
    try:
        with open('static/data/vehicles.json', 'r') as file:
            data = json.load(file)
        return jsonify(data)  # Return the JSON content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#<------------------------------------------------------------------------------------------>
# <--------------------------------------Route for all Vehicle in History data--------------------------->
# Fetch all vehicles from the history data
@app.route('/api/get_allhistory_vehicles', methods=['GET'])
def get_allhistory_vehicles():
    try:
        with open('static/data/history.json', 'r') as file:
            history_data = json.load(file)

        # Extract all unique vehicle IDs from the history data
        vehicle_ids = set()
        for ride in history_data["history"]:
            vehicle_ids.add(ride["vehicle_id"])

        # Return the list of vehicle IDs
        return jsonify({
            "moving_vehicles": list(vehicle_ids),  # Can be split into categories if required
            "free_vehicles": [],
            "idle_vehicles": []
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# <------------------------------------------------------------------------------------------>

# <----------------------Route for Specific Vehicle journey details coming from history data------------------------>
# Fetch rides for a specific vehicle
@app.route('/api/get_vehicle_history/<vehicle_id>', methods=['GET'])
def get_vehicle_history(vehicle_id):
    try:
        # Read the history.json file
        with open('static/data/history.json', 'r') as file:
            history_data = json.load(file)

        # Filter rides for the given vehicle_id
        rides = [ride for ride in history_data["history"] if ride["vehicle_id"] == vehicle_id]

        # Extract ride_no and other relevant info for the selected vehicle
        ride_no_data = [{
            "ride_no": ride["ride_no"],
            "start_time": ride.get("start_time", "N/A"),
            "end_time": ride.get("end_time", "N/A")
        } for ride in rides]
        
        # Return the filtered rides with their respective ride_no
        return jsonify({"rides": ride_no_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# <------------------------------------------------------------------------------------------------------------->

# <----------------------Route for Selected Vehicle ride details coming from history data------------------------>
# Fetch details of a specific ride
@app.route('/api/get_ride_details/<ride_no>', methods=['GET'])
def get_ride_details(ride_no):
    try:
        # Open and read the history.json file
        with open('static/data/history.json', 'r') as file:
            history_data = json.load(file)

        # Find the specific ride using the ride_no
        ride = next((ride for ride in history_data["history"] if ride["ride_no"] == int(ride_no)), None)

        if ride:
            # Return ride details if found
            return jsonify({"ride": ride}), 200
        else:
            # If the ride is not found, return an error message
            return jsonify({'error': 'Ride not found'}), 404
    except Exception as e:
        # Handle any errors
        return jsonify({'error': str(e)}), 500
    
# <------------------------------------------------------------------------------------------------------------->

# <----------------------Route for Selected Vehicle ride details(based on filter option) coming from history data------------------------>

@app.route('/api/get_ride_detailshistory/<int:ride_no>', methods=['GET'])
def get_ride_detailshistory(ride_no):
    try:
        with open('static/data/history.json', 'r') as file:
            data = json.load(file)

        vehicle_id = request.args.get('vehicle_id')
        filter_option = request.args.get('filter', 'ride')  # Defaults to "ride"

        print(f"Received request: ride_no={ride_no}, vehicle_id={vehicle_id}, filter={filter_option}")

        for ride in data['history']:
            if ride['ride_no'] == ride_no and ride['vehicle_id'] == vehicle_id:
                if filter_option == "ride":
                    return jsonify({'route': ride['path']})
                elif filter_option == "break-points":
                    break_points = [point for point in ride['path'] if point['status'] == 'break']
                    return jsonify({'route': break_points})

        return jsonify({'error': 'Ride or Vehicle not found'}), 404

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

# <------------------------------------------------------------------------------------------------------------->

# <----------------------Route for Static Files ------------------------>
# Route to serve static files (e.g., vehicles.json)
@app.route('/static/<path:filename>')
def serve_static_file(filename):
    return send_from_directory('static', filename)

# <------------------------------------------------------------------------------------------------------------->

if __name__ == '__main__':
    app.run(debug=True)
