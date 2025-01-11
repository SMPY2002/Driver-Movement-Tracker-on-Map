# Driver Movement Tracking Admin Dashboard

## Overview

This project is a **Driver Movement Tracking Admin Dashboard** designed to help companies or organizations with multiple vehicles manage and monitor their fleet efficiently. The dashboard provides real-time GPS tracking, route history, and insightful details about vehicle statuses. The project includes both a frontend and backend, delivering a robust solution for live vehicle monitoring and route analysis.

---

## Key Features

1. **Real-Time GPS Tracking**:
   - Tracks driver movement in real-time using GPS coordinates displayed on a **Leaflet map**.
   - Shows the vehicle's journey with a **polyline path** and markers for break points.

2. **Route History**:
   - Saves completed journeys in a `history.json` file for future reference.
   - Tracks each journey with a **ride number** and organizes data day-wise.

3. **Dashboard Metrics**:
   - Displays summary metrics on the navbar:
     - **Total Vehicles**
     - **Moving Vehicles**
     - **Free Vehicles**
     - **Idle Vehicles**

4. **User-Friendly UI(Not Responsive for Mobile View)**:
   - Left sidebar with toggle options for **Live Tracking** and **History** views.
   - Right panel displaying a Leaflet map for visualizing vehicle movement.
    **Preview**
     ![Screenshot 2025-01-11 105450](https://github.com/user-attachments/assets/572542da-eda6-4ff4-89fa-666b5a7efac8)

5. **Simulated Real-Time GPS Data**:
   - Uses **OpenStreetMap's OSRM Routing API** to generate realistic GPS data, including:
     - Vehicle ID
     - Timestamp
     - Latitude and Longitude
     - Status (e.g., break, ride, idle)

6. **Advanced Admin Control**:
   - Provides robust tracking and monitoring tools for better control over vehicle movements.
   - Enables route analysis and tracking driver behavior for operational efficiency.

---

## Tech Stack

### **Frontend**:
- HTML, CSS, JavaScript
- **Leaflet.js**: For interactive map rendering and tracking.

### **Backend**:
- Flask (Python)
- **OpenStreetMap's OSRM API**: For generating route and GPS data.
- JSON: For data storage.
- CORS
---

## Setup Instructions

### **Clone the Repository**:
```bash
git clone https://github.com/SMPY2002/Driver-Movement-Tracker-on-Map.git
cd Driver-Movement-Tracker-on-Map
```

### **Install Backend Dependencies**:
1. Set up a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```
2. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

### **Run the Backend**:
```bash
python app.py
```

### **Open the Frontend**:
- Open `index.html` in a browser to load the Admin Dashboard UI.

---

## Project Workflow

1. **Simulate Real-Time GPS Data**:
   - The backend generates GPS data for vehicles using OSRM API.
   - Data includes vehicle ID, timestamp, latitude, longitude, and status (break, ride, idle).
   - Data is formatted into JSON and sent to the frontend via API calls.

2. **Display Data on Leaflet Map**:
   - The frontend receives GPS data and updates the map in real-time.
   - Polyline paths show the vehicle routes, with markers for break points.

3. **Save Ride History**:
   - Completed rides are stored in `history.json`, organized by ride number and day.
   - Admins can toggle between live tracking and history view from the sidebar.

4. **Interactive Metrics**:
   - Navbar metrics dynamically update to reflect the number of total, moving, free, and idle vehicles.

---

## Future Enhancements

- **Driver Profiles**:
  - Associate drivers with vehicle data for better management.
- **Geofencing**:
  - Alert admin when vehicles deviate from predefined routes.
- **Advanced Analytics**:
  - Visualize route performance and identify bottlenecks.
- **Mobile App Integration**:
  - Extend functionality to a mobile platform for on-the-go access.
- **Database Integration**:
  - Store ride history in a database for scalability and reliability.

---

## Acknowledgments

- **Inspiration**: Designed to improve fleet management and provide real-time insights for logistics and delivery operations.
- **Technologies Used**: Flask, Leaflet, OpenStreetMap, OSRM API.

---

## License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute this project as per the license terms.

---

## Contact
For any queries or suggestions, please reach out via:
- Email: <smpy1405@gmail.com>
- GitHub: [SMPY2002](https://github.com/SMPY2002)
