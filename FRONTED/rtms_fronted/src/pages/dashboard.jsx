import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../css/Dashboard.css';
import { FiAlertTriangle, FiTruck, FiUser, FiClock, FiPieChart, FiSettings, FiLogOut, FiMapPin } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Custom marker icons
const normalIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const overloadIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [allVehicles, setAllVehicles] = useState([]);
  const [displayVehicles, setDisplayVehicles] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [displayAlerts, setDisplayAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:8000/api/';

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch vehicles data
      const vehiclesResponse = await axios.get(`${API_URL}vehicles/`);
      const alertsResponse = await axios.get(`${API_URL}alerts/`);
      
      // Transform API data to match frontend structure
      const transformedVehicles = vehiclesResponse.data.results.map(vehicle => ({
        id: vehicle.id,
        plate: vehicle.vehicle_id || 'N/A',
        driver: vehicle.driver || vehicle.owner || 'Unknown',
        weight: vehicle.current_weight || vehicle.last_reported_weight || 0,
        maxWeight: vehicle.max_allowed_weight || 22000,
        status: vehicle.weight_alert ? 'overload' : 'normal',
        location: vehicle.latitude && vehicle.longitude 
          ? [parseFloat(vehicle.latitude), parseFloat(vehicle.longitude)]
          : [-6.369028, 34.888822],
        lastUpdate: vehicle.last_reported_location || vehicle.last_report_generated || 'N/A',
        vehicleImage: vehicle.vehicle_image,
        vehicleName: vehicle.vehicle_name || 'Unknown Vehicle'
      }));

      // Transform alerts data if available
      const transformedAlerts = alertsResponse.data.results ? alertsResponse.data.results.map(alert => ({
        id: alert.id,
        type: alert.alert_type || 'Weight Alert',
        vehicle: alert.vehicle_id || 'Unknown',
        time: alert.timestamp || new Date().toLocaleString(),
        severity: alert.severity || 'high'
      })) : [];

      setAllVehicles(transformedVehicles);
      setDisplayVehicles(transformedVehicles.slice(0, 2)); // Only show first 2 vehicles
      setAllAlerts(transformedAlerts);
      setDisplayAlerts(transformedAlerts.slice(0, 1)); // Only show first alert
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
      // Fallback to sample data if API fails
      const sampleVehicles = [
        { 
          id: 1, 
          plate: 'T 456 ABC', 
          driver: 'mpolo', 
          weight: 15000, 
          maxWeight: 22000, 
          status: 'normal',
          location: [-6.369028, 34.888822], 
          lastUpdate: new Date().toLocaleString(),
          vehicleImage: null,
          vehicleName: 'Sample Vehicle 1'
        },
        { 
          id: 2, 
          plate: 'T 789 XYZ', 
          driver: 'MARIA', 
          weight: 25000, 
          maxWeight: 22000, 
          status: 'overload',
          location: [-0.023559, 37.906193],
          lastUpdate: new Date().toLocaleString(),
          vehicleImage: null,
          vehicleName: 'Sample Vehicle 2'
        },
        { 
          id: 3, 
          plate: 'T 123 DEF', 
          driver: 'JOHN', 
          weight: 18000, 
          maxWeight: 22000, 
          status: 'normal',
          location: [-3.3822, 36.6821],
          lastUpdate: new Date().toLocaleString(),
          vehicleImage: null,
          vehicleName: 'Sample Vehicle 3'
        }
      ];
      const sampleAlerts = [
        {
          id: 1,
          type: 'Overload',
          vehicle: 'T 789 XYZ',
          time: new Date().toLocaleString(),
          severity: 'high'
        },
        {
          id: 2,
          type: 'Maintenance',
          vehicle: 'T 123 DEF',
          time: new Date().toLocaleString(),
          severity: 'medium'
        }
      ];
      
      setAllVehicles(sampleVehicles);
      setDisplayVehicles(sampleVehicles.slice(0, 2));
      setAllAlerts(sampleAlerts);
      setDisplayAlerts(sampleAlerts.slice(0, 1));
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchData(); // Initial fetch
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchData(); // Refresh data every 30 seconds
    }, 30000);
    
    return () => clearInterval(timer);
  }, []);

  // Calculate weight percentage
  const calculateWeightPercentage = (weight, maxWeight) => {
    return Math.min(100, (weight / maxWeight) * 100);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>
            <FiTruck className="sidebar-icon" /> Vehicle Monitoring
          </h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className="active">
              <Link to="/dashboard"><FiPieChart className="nav-icon" /> Dashboard</Link>
            </li>
            <li>
              <Link to="/vehicle-management"><FiTruck className="nav-icon" /> Vehicle Management</Link>
            </li>
            <li>
              <Link to="/reports"><FiPieChart className="nav-icon" /> Reports</Link>
            </li>
            <li>
              <Link to="/settings"><FiSettings className="nav-icon" /> System Settings</Link>
            </li>
            <li className="logout">
              <Link to="/logout"><FiLogOut className="nav-icon" /> Log Out</Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>Real-Time Vehicle Weight Monitoring</h1>
          <div className="current-time">
            <FiClock className="time-icon" /> 
            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error} <button onClick={fetchData}>Retry</button>
          </div>
        )}

        <div className="dashboard-layout">
          {/* Left side content */}
          <div className="dashboard-content-left">
            {/* Overview Cards - Show accurate counts from all data */}
            <div className="overview-cards">
              <div className="overview-card total-vehicles">
                <h3>Total Vehicles</h3>
                <p>{allVehicles.length}</p>
              </div>
              <div className="overview-card normal-vehicles">
                <h3>Normal Status</h3>
                <p>{allVehicles.filter(v => v.status === 'normal').length}</p>
              </div>
              <div className="overview-card alert-vehicles">
                <h3>Active Alerts</h3>
                <p>{allAlerts.length}</p>
              </div>
            </div>

            {/* Vehicle Status Section - Show only 2 vehicles */}
            <div className="vehicle-status-section">
              <h2 className="section-title">
                <FiTruck className="section-icon" /> Vehicle Weight Status
              </h2>
              
              <div className="vehicle-cards">
                {displayVehicles.map(vehicle => (
                  <div key={vehicle.id} className={`vehicle-card ${vehicle.status}`}>
                    <div className="vehicle-header">
                      <h3>{vehicle.vehicleName} ({vehicle.plate})</h3>
                      <span className="vehicle-status">{vehicle.status.toUpperCase()}</span>
                    </div>
                    {vehicle.vehicleImage && (
                      <img 
                        src={vehicle.vehicleImage} 
                        alt={vehicle.vehicleName}
                        className="vehicle-thumbnail"
                      />
                    )}
                    <div className="vehicle-details">
                      <p><FiUser className="detail-icon" /> {vehicle.driver}</p>
                      <div className="weight-meter">
                        <div className="weight-info">
                          <span>Current: {vehicle.weight} kg</span>
                          <span>Max: {vehicle.maxWeight} kg</span>
                        </div>
                        <div className="meter-container">
                          <div 
                            className="meter-fill"
                            style={{
                              width: `${calculateWeightPercentage(vehicle.weight, vehicle.maxWeight)}%`,
                              backgroundColor: vehicle.status === 'overload' ? '#e74c3c' : '#2ecc71'
                            }}
                          ></div>
                        </div>
                      </div>
                      <p className="last-update">Last Update: {vehicle.lastUpdate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts Section - Show only 1 alert */}
            <div className="alerts-section">
              <h2 className="section-title">
                <FiAlertTriangle className="section-icon" /> Active Alerts
              </h2>
              
              {displayAlerts.length > 0 ? (
                <div className="alerts-list">
                  {displayAlerts.map(alert => (
                    <div key={alert.id} className={`alert-card ${alert.severity}`}>
                      <div className="alert-header">
                        <h3>{alert.type}</h3>
                        <span className="alert-severity">{alert.severity.toUpperCase()}</span>
                      </div>
                      <div className="alert-details">
                        <p>Vehicle: {alert.vehicle}</p>
                        <p>Time: {alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-alerts">
                  <p>No active alerts at this time</p>
                </div>
              )}
            </div>
          </div>

          {/* Right side map - showing all vehicles with locations */}
          <div className="dashboard-content-right">
            <div className="map-section">
              <h2 className="section-title">
                <FiMapPin className="section-icon" /> Live Vehicle Locations
              </h2>
              <div className="map-container">
                <MapContainer 
                  center={[-6.369028, 34.888822]} 
                  zoom={6} 
                  style={{ height: '100%', width: '100%' }}
                  maxBounds={[
                    [-12.5, 29.0], // Southwest corner
                    [-0.9, 41.0]   // Northeast corner
                  ]}
                  maxBoundsViscosity={1.0}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {allVehicles.filter(v => v.location).map(vehicle => (
                    <Marker 
                      key={vehicle.id} 
                      position={vehicle.location}
                      icon={vehicle.status === 'overload' ? overloadIcon : normalIcon}
                    >
                      <Popup>
                        <div className="map-popup">
                          <h3>{vehicle.vehicleName} ({vehicle.plate})</h3>
                          {vehicle.vehicleImage && (
                            <img 
                              src={vehicle.vehicleImage} 
                              alt={vehicle.vehicleName}
                              className="popup-thumbnail"
                            />
                          )}
                          <p><FiUser /> Driver: {vehicle.driver}</p>
                          <p>Status: <span className={vehicle.status}>{vehicle.status.toUpperCase()}</span></p>
                          <p>Weight: {vehicle.weight} / {vehicle.maxWeight} kg</p>
                          <div className="weight-meter-popup">
                            <div 
                              className="meter-fill-popup"
                              style={{
                                width: `${calculateWeightPercentage(vehicle.weight, vehicle.maxWeight)}%`,
                                backgroundColor: vehicle.status === 'overload' ? '#e74c3c' : '#2ecc71'
                              }}
                            ></div>
                          </div>
                          <p>Last Update: {vehicle.lastUpdate}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;