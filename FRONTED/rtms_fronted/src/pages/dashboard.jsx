import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../css/Dashboard.css';
import { FiAlertTriangle, FiTruck, FiUser, FiClock, FiPieChart, FiSettings, FiLogOut, FiMapPin } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [vehicles, setVehicles] = useState([
    { 
      id: 1, 
      plate: 'T 456 ABC', 
      driver: 'mpolo', 
      weight: 15000, 
      maxWeight: 22000, 
      status: 'normal',
      location: [-6.369028, 34.888822], 
      lastUpdate: '2023-05-17 14:30:45'
    },
    { 
      id: 2, 
      plate: 'T 789 XYZ', 
      driver: 'MARIA', 
      weight: 25000, 
      maxWeight: 22000, 
      status: 'overload',
      location: [-0.023559, 37.906193], // Paris coordinates
      lastUpdate: '2023-05-17 15:45:30'
    },
    { 
        id: 3, 
        plate: 'T 789 XYZ', 
        driver: 'MJUNI', 
        weight: 30000, 
        maxWeight: 22000, 
        status: 'overload',
        location: [ -8.909401, 33.460774], // Paris coordinates
        lastUpdate: '2023-05-17 15:45:30'
      }
  ]);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'Overload', vehicle: 'T 789 XYZ', time: '2023-05-17 15:45:30', severity: 'high' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // In a real app, you would fetch data from API here
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate weight percentage
  const calculateWeightPercentage = (weight, maxWeight) => {
    return Math.min(100, (weight / maxWeight) * 100);
  };

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
              <Link to="/alerts"><FiAlertTriangle className="nav-icon" /> Alerts</Link>
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
                    [-12.5, 29.0], // Southwest corner (Mbeya, Rukwa)
                    [-0.9, 41.0]   // Northeast corner (Kilimanjaro region to Kenya border)
                ]}
                maxBoundsViscosity={1.0} // Prevent dragging out
                >


                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {vehicles.map(vehicle => (
                  <Marker 
                    key={vehicle.id} 
                    position={vehicle.location}
                    icon={vehicle.status === 'overload' ? overloadIcon : normalIcon}
                  >
                    <Popup>
                      <div className="map-popup">
                        <h3>{vehicle.plate}</h3>
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


        <div className="dashboard-content">
          {/* Map Section */}
          
          {/* Overview Cards */}
          <div className="overview-cards">
            <div className="overview-card total-vehicles">
              <h3>Total Vehicles</h3>
              <p>{vehicles.length}</p>
            </div>
            <div className="overview-card normal-vehicles">
              <h3>Normal Status</h3>
              <p>{vehicles.filter(v => v.status === 'normal').length}</p>
            </div>
            <div className="overview-card alert-vehicles">
              <h3>Active Alerts</h3>
              <p>{alerts.length}</p>
            </div>
          </div>

          {/* Vehicle Status Section */}
          <div className="vehicle-status-section">
            <h2 className="section-title">
              <FiTruck className="section-icon" /> Vehicle Weight Status
            </h2>
            
            <div className="vehicle-cards">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className={`vehicle-card ${vehicle.status}`}>
                  <div className="vehicle-header">
                    <h3>{vehicle.plate}</h3>
                    <span className="vehicle-status">{vehicle.status.toUpperCase()}</span>
                  </div>
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

          {/* Alerts Section */}
          <div className="alerts-section">
            <h2 className="section-title">
              <FiAlertTriangle className="section-icon" /> Active Alerts
            </h2>
            
            {alerts.length > 0 ? (
              <div className="alerts-list">
                {alerts.map(alert => (
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
      </div>
    </div>
    
  );
}

export default Dashboard;