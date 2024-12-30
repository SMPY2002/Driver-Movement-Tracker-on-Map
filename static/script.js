// <--------------------Initialize Leaflet map--------------------------------->
const map = L.map('map').setView([26.4915, 80.2846], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
// <-------------------End of Leaflet map initialization------------------------>

// <---------------- Declaring Global variables------------------------------->
let vehicleMarker = null;
let trackingIntervalId = null;
let pathCoordinates = [];
let currentPointIndex = 0;
let isTracking = false;
let lastTrackedPoint = null; // For resuming tracking after tab switch
let isPaused = false; // Flag to track if tracking is paused
let pausedPointIndex = null; // To remember where the tracking was paused

// <-----------------End of Global variables declaration----------------------->

// <---------------Function to fetch and update vehicle counts in status cards------------------------>
function updateVehicleCounts() {
    fetch('/static/data/vehicles.json')
        .then(response => response.json())
        .then(data => {
            // Update counts in the status cards
            document.getElementById('total-count').textContent =
                data.moving_vehicles.length + data.free_vehicles.length + data.idle_vehicles.length;

            document.getElementById('moving-count').textContent = data.moving_vehicles.length;
            document.getElementById('free-count').textContent = data.free_vehicles.length;
            document.getElementById('idle-count').textContent = data.idle_vehicles.length;
        })
        .catch(error => console.error('Error fetching vehicle data:', error));
}
// <-----------------End of function to update vehicle counts----------------------->

// <-----------------Custom car icon for moving vehicles----------------------------->
const carIcon = L.icon({
    iconUrl: 'static/images/e-Rik_icon.webp',  // Replace with your icon path
    iconSize: [32, 32],  // Set size of the icon
    iconAnchor: [16, 16],  // Adjust anchor point
    popupAnchor: [0, -16],
    className: 'car-icon',  // Optional: for applying custom styles
});

// <-----------------End of custom car icon for moving vehicles----------------------->

// <--------------------Function to load vehicle data from vehicles JSON File ----------------------->
async function loadVehicleData() {
    const response = await fetch('/static/data/vehicles.json');
    const data = await response.json();
    return data;
}
// <-----------------End of function to load vehicle data from vehicles JSON File----------------------->

// <--------------------------Populate the dropdown with moving vehicles-------------------------------->
async function populateDropdown() {
    const data = await loadVehicleData();
    const dropdown = document.getElementById('vehicle-select');
    dropdown.innerHTML = '<option value="">Select a Vehicle</option>'; // Reset dropdown

    data.moving_vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.vehicle_id;
        option.textContent = vehicle.vehicle_id;
        dropdown.appendChild(option);
    });
}

// <-----------------End of function to populate the dropdown with moving vehicles----------------------->

// <--------------------------------------Function to start live tracking-------------------------------->

function startLiveTracking(vehicleId, startTrackingButton) {
    if (!vehicleId) {
        alert('Please select a vehicle to track.');
        return;
    }

    // If tracking is already in progress
    if (isTracking && !isPaused) {
        // Show confirmation dialog
        const stopTracking = confirm('Tracking is in progress. Do you want to stop tracking?');
        if (stopTracking) {
            clearInterval(trackingIntervalId); // Stop the interval
            isTracking = false;
            isPaused = true; // Mark as paused
            pausedPointIndex = currentPointIndex; // Save the current point index
            updateButtonState(startTrackingButton, 'Resume Tracking', 'orange'); // Update button text
            alert('Tracking paused...');
        }
        return;
    }

    // If tracking is paused, ask whether to resume or cancel
    if (isPaused) {
        const resumeTracking = confirm('Do you want to resume tracking?');
        if (resumeTracking) {
            isPaused = false; // Unpause
            currentPointIndex = pausedPointIndex; // Resume from paused point
            animateTracking(startTrackingButton); // Restart tracking
        } else {
            // Cancel tracking
            isPaused = false;
            pausedPointIndex = null; // Reset paused index
            pathCoordinates = []; // Clear path coordinates
            resetMap()
            updateButtonState(startTrackingButton, 'Start Tracking', ''); // Reset button
            alert('Tracking cancelled.');
        }
        return;
    }

    // Reset the map and path if starting fresh
    resetMap();
    pathCoordinates = [];
    currentPointIndex = 0;

    // Initialize vehicle marker
    if (!vehicleMarker) {
        vehicleMarker = L.marker([0, 0], { icon: carIcon }).addTo(map);
    }

    // Fetch GPS data for the vehicle
    fetch(`/api/get_vehicle_gps_data/${vehicleId}`)
        .then(response => response.json())
        .then(gpsData => {
            if (!gpsData || gpsData.length === 0) {
                alert('No GPS data available for this vehicle.');
                return;
            }

            pathCoordinates = gpsData.map(data => ({
                lat: data.latitude,
                lng: data.longitude,
                status: data.status
            }));

            // Start tracking animation
            animateTracking(startTrackingButton);
        })
        .catch(error => {
            console.error('Error fetching GPS data:', error);
            alert('Failed to fetch GPS data.');
        });
}

// <-----------------End of function to start live tracking----------------------->

// <-------------------------Function to animate the tracking------------------------------------------>
function animateTracking(startTrackingButton) {
    if (pathCoordinates.length === 0) {
        alert('No path data available to track.');
        return;
    }

    isTracking = true; // Set tracking flag
    updateButtonState(startTrackingButton, 'Tracking...', 'blue'); // Update button text
    const intervalDelay = 3000; // Delay in milliseconds between updates

    trackingIntervalId = setInterval(() => {
        if (currentPointIndex >= pathCoordinates.length) {
            // Stop tracking when destination is reached
            clearInterval(trackingIntervalId);
            isTracking = false;
            updateButtonState(startTrackingButton, 'Ride Completed', 'green');

            // Reset button to the initial state after a short delay
            setTimeout(() => {
                updateButtonState(startTrackingButton, 'Start Tracking', '');
            }, 2000);
            return;
        }

        const currentPoint = pathCoordinates[currentPointIndex];
        const nextPoint = pathCoordinates[currentPointIndex + 1];

        // Update the vehicle marker's position
        vehicleMarker.setLatLng([currentPoint.lat, currentPoint.lng]);
        if (currentPointIndex === 0) {
            map.setView([currentPoint.lat, currentPoint.lng], 16); // Center map initially
        }

        // Calculate rotation angle based on movement from current to next point
        if (nextPoint) {
            const angle = calculateAngle(currentPoint, nextPoint);
            vehicleMarker.setIcon(L.icon({
                iconUrl: 'static/images/e-Rik_icon.webp',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                rotationAngle: angle // Set the rotation angle dynamically
            }));
        }

        // Draw the path segment
        if (nextPoint) {
            const segmentColor = currentPoint.status === 'break' ? 'red' : 'green';
            const polyline = L.polyline([[currentPoint.lat, currentPoint.lng], [nextPoint.lat, nextPoint.lng]], {
                color: segmentColor,
                weight: 4
            }).addTo(map);

            // Add a marker at breakpoints
            if (currentPoint.status === 'break') {
                const breakMarker = L.marker([currentPoint.lat, currentPoint.lng]).addTo(map);
                breakMarker.bindPopup(`<b>Status:</b> Break<br><b>Location:</b> ${currentPoint.lat}, ${currentPoint.lng}`).openPopup();
            }
        }

        lastTrackedPoint = currentPoint; // Save the last tracked point
        currentPointIndex++;
    }, intervalDelay);
}

// <-------------------------------------End of function to animate the tracking-------------------------------------------->

// <----------------------------------------------------------->
// Function to calculate angle between two points
function calculateAngle(currentPoint, nextPoint) {
    const dx = nextPoint.lng - currentPoint.lng;
    const dy = nextPoint.lat - currentPoint.lat;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees
    return angle;  // Return the angle in degrees
}
// <--------------------------------------------------------------

// <-------------------------------Reset Map Function-------------------------------------->
function resetMap() {
    map.eachLayer(layer => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            map.removeLayer(layer); // Remove all polylines and markers
        }
    });

    if (vehicleMarker) {
        vehicleMarker.remove(); // Remove the vehicle marker
        vehicleMarker = null;
    }
}
// <-------------------------------End of Reset Map Function-------------------------------------->

// <------------------------------Function to update the button's text and appearance------------------------------------>

function updateButtonState(button, text, color) {
    button.textContent = text;
    button.style.backgroundColor = color || '';
    button.style.color = 'white';
}
// <-------------------------------------End of function to update the button's text and appearance------------------------------------>

// <-----------------------------------Display free vehicles on the map----------------------------------------------------->

async function showFreeVehicles() {
    const data = await loadVehicleData();
    data.free_vehicles.forEach(vehicle => {
        const marker = L.marker([vehicle.lat, vehicle.lng]).addTo(map); // Default marker
        marker.bindPopup(`<b>Vehicle ID:</b> ${vehicle.vehicle_id}<br><b>Status:</b> Free`);
    });

}
// <-----------------------------------End of function to display free vehicles on the map---------------------------------------->

// <-----------------------------------------------Display idle vehicles on the map----------------------------------------------->
async function showIdleVehicles() {
    const data = await loadVehicleData();
    data.idle_vehicles.forEach(vehicle => {
        const marker = L.marker([vehicle.lat, vehicle.lng]).addTo(map); // Default marker
        marker.bindPopup(`<b>Vehicle ID:</b> ${vehicle.vehicle_id}<br><b>Status:</b> Idle`);
    });

}

// <-----------------------------------End of function to display idle vehicles on the map---------------------------------------->

// <-----------------------------------Event listeners for Free and Idle sections--------------------------------------->
const freeSection = document.getElementById('free-vehicles');
const idleSection = document.getElementById('idle-vehicles');

freeSection.addEventListener('click', () => {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== vehicleMarker) {
            map.removeLayer(layer);
        }
    });
    showFreeVehicles();
});

idleSection.addEventListener('click', () => {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== vehicleMarker) {
            map.removeLayer(layer);
        }
    });
    showIdleVehicles();
});
// <-----------------------------------End of event listeners for Free and Idle sections--------------------------------------->

// <---------------------------------Event listeners for status card buttons----------------------------------------------->
document.addEventListener('DOMContentLoaded', () => {

    const startTrackingButton = document.getElementById('start-tracking');
    const vehicleSelect = document.getElementById('vehicle-select');

    startTrackingButton.addEventListener('click', () => {
        const vehicleId = vehicleSelect.value;
        if (lastTrackedPoint) {
            pathCoordinates.unshift(lastTrackedPoint); // Resume from the last tracked point
        }
        startLiveTracking(vehicleId, startTrackingButton);
    });

    // Populate the dropdown on page load
    populateDropdown();

    // Update vehicle counts when the page loads
    updateVehicleCounts();

    // Attach click event listeners to status card buttons
    document.getElementById('free-vehicles').addEventListener('click', () => {
        console.log('Displaying free vehicles on the map');
    });

    document.getElementById('idle-vehicles').addEventListener('click', () => {
        console.log('Displaying idle vehicles on the map');
    });

    document.getElementById('moving-vehicles').addEventListener('click', () => {
        console.log('Displaying moving vehicles on the map');
    });

    // Fetch and populate vehicle dropdown in history section
    loadHistoryVehicles();

    // Tab switching logic
    const liveTab = document.getElementById('live-tab');
    const historyTab = document.getElementById('history-tab');
    const liveSection = document.getElementById('live-section');
    const historySection = document.getElementById('history-section');

    liveTab.addEventListener('click', () => {
        liveTab.classList.add('active');
        historyTab.classList.remove('active');
        liveSection.classList.remove('hidden');
        historySection.classList.add('hidden');
    });

    historyTab.addEventListener('click', () => {
        historyTab.classList.add('active');
        liveTab.classList.remove('active');
        historySection.classList.remove('hidden');
        liveSection.classList.add('hidden');
    });
});
// <---------------------------------End of event listeners for status card buttons----------------------------------------------->

// <----------------------------------Fetch and populate vehicle history dropdown------------------------------------------->
function loadHistoryVehicles() {
    fetch('/api/get_all_vehicles')
        .then(response => response.json())
        .then(data => {
            const vehicleDropdown = document.getElementById('vehicle-history');
            vehicleDropdown.innerHTML = '<option value="">Select a Vehicle</option>'; // Reset dropdown

            // Populate the dropdown with all vehicles
            data.moving_vehicles.concat(data.free_vehicles, data.idle_vehicles).forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.vehicle_id;
                option.textContent = vehicle.vehicle_id;
                vehicleDropdown.appendChild(option);
            });
        });
}
// <----------------------------------End of function to fetch and populate vehicle history dropdown---------------------------------------->

// <-------------------------------------Fetch rides for a selected vehicle and populate the ride_no dropdown---------------------------->

document.getElementById('vehicle-history').addEventListener('change', function () {
    const vehicleId = this.value;

    if (vehicleId) {
        fetch(`/api/get_vehicle_history/${vehicleId}`)
            .then(response => response.json())
            .then(data => {
                const rideNoDropdown = document.getElementById('ride-dropdown');
                rideNoDropdown.innerHTML = '<option value="">Select Ride Number</option>'; // Reset dropdown

                if (data.rides && data.rides.length > 0) {
                    // Populate ride_no dropdown with ride numbers
                    data.rides.forEach(ride => {
                        const option = document.createElement('option');
                        option.value = ride.ride_no;
                        option.textContent = `Ride No: ${ride.ride_no}`;
                        rideNoDropdown.appendChild(option);
                    });
                } else {
                    // Handle case where no rides exist for this vehicle
                    const option = document.createElement('option');
                    option.textContent = "No rides available";
                    rideNoDropdown.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Error fetching ride history:', error);
            });
    } else {
        // If no vehicle is selected, reset the ride_no dropdown
        document.getElementById('ride-dropdown').innerHTML = '<option value="">Select Ride Number</option>';
    }
});
// <-------------------------------------End of fetching rides for a selected vehicle and populating the ride_no dropdown----------------------->

// <---------------------------------Fetch and display ride details when a specific ride is selected----------------------------->
document.getElementById('ride-dropdown').addEventListener('change', function () {
    const rideNo = this.value;

    if (rideNo) {
        fetch(`/api/get_ride_details/${rideNo}`)
            .then(response => response.json())
            .then(data => {
                const ride = data.ride;

                if (ride) {
                    // "From" Box: Display Start Time
                    const fromBox = document.getElementById('from-box');
                    fromBox.value = `Start Time: ${ride.start_time}`;

                    // "To" Box: Display End Time
                    const toBox = document.getElementById('to-box');
                    toBox.value = `End Time: ${ride.end_time}`;
                }
            })
            .catch(error => {
                console.error('Error fetching ride details:', error);
            });
    } else {
        // If no ride is selected, clear the From/To boxes
        document.getElementById('from-box').value = '';
        document.getElementById('to-box').value = '';
    }
});
// <---------------------------------End of fetching and displaying ride details when a specific ride is selected--------------------------->

// <-----------------------------------------Handle Show History Button Click----------------------------------------------->
document.getElementById('show-history-btn').addEventListener('click', function () {
    const vehicleId = document.getElementById('vehicle-history').value;
    const rideNo = document.getElementById('ride-dropdown').value;
    const filterOption = document.getElementById('filter-dropdown').value;

    if (vehicleId && rideNo) {
        // Fetch ride details with filter
        fetch(`/api/get_ride_detailshistory/${rideNo}?vehicle_id=${vehicleId}&filter=${filterOption}`)
            .then(response => response.json())
            .then(data => {
                if (data.route) {
                    // Clear existing layers
                    if (window.ridePathLayer) {
                        map.removeLayer(window.ridePathLayer);
                    }
                    if (window.breakPointLayer) {
                        map.removeLayer(window.breakPointLayer);
                    }
                    if (window.startEndMarkers) {
                        window.startEndMarkers.forEach(marker => map.removeLayer(marker));
                    }

                    // Initialize layers for reuse
                    window.ridePathLayer = L.layerGroup().addTo(map);
                    window.breakPointLayer = L.layerGroup().addTo(map);
                    window.startEndMarkers = [];

                    if (filterOption === "ride") {
                        // Draw the complete route in blue
                        const pathCoordinates = data.route.map(point => [point.latitude, point.longitude]);
                        const polyline = L.polyline(pathCoordinates, { color: 'blue', weight: 4 }).addTo(window.ridePathLayer);

                        // Add markers for start and end locations
                        if (data.route.length > 0) {
                            const startPoint = data.route[0];
                            const endPoint = data.route[data.route.length - 1];

                            const startMarker = L.marker([startPoint.latitude, startPoint.longitude])
                                .addTo(map)
                                .bindPopup('Start Location');

                            const endMarker = L.marker([endPoint.latitude, endPoint.longitude])
                                .addTo(map)
                                .bindPopup('End Location');


                            window.startEndMarkers.push(startMarker, endMarker);
                        }

                        map.fitBounds(polyline.getBounds());
                    } else if (filterOption === "break-points") {
                        // Show only break points with red markers
                        data.route.forEach(point => {
                            if (point.status === 'break') {
                                L.marker([point.latitude, point.longitude], {
                                    icon: L.icon({
                                        iconUrl: '/static/images/red_marker.webp',
                                        iconSize: [40, 41],
                                        iconAnchor: [21, 41],
                                    })
                                }).addTo(window.breakPointLayer)
                                    .bindPopup(`Break at ${point.timestamp}`);
                            }
                        });

                        // Fit map to bounds of the break points if available
                        if (window.breakPointLayer.getLayers().length > 0) {
                            map.fitBounds(window.breakPointLayer.getBounds());
                        } else {
                            alert('No breakpoints found for this ride.');
                        }
                    }
                } else {
                    alert('No data available for the selected ride or filter.');
                }
            })
            .catch(error => console.error('Error fetching ride details:', error));
    } else {
        alert('Please select both vehicle and ride before showing history.');
    }
});
// <-----------------------------------------End of handling Show History Button Click----------------------------------------------->




