import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    role: 'User',
    email: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mapCenter, setMapCenter] = useState([-6.369028, 34.888822]); // Center of Tanzania
  const [mapZoom, setMapZoom] = useState(3); // Adjusted to show all Tanzania
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const API_URL = 'http://localhost:8000/api/';

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}auth/user/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setUserProfile({
        name: `${response.data.first_name} ${response.data.last_name}`,
        role: response.data.role || 'User',
        email: response.data.email || '',
        avatar: response.data.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}auth/token/refresh/`, {
              refresh: refreshToken
            });
            
            localStorage.setItem('access_token', refreshResponse.data.access);
            return fetchUserProfile();
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
        handleLogout();
      }
    }
  };

  // Fetch vehicles and alerts data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [vehiclesResponse, alertsResponse] = await Promise.all([
        axios.get(`${API_URL}vehicles/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }),
        axios.get(`${API_URL}alerts/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        })
      ]);

      const processedVehicles = vehiclesResponse.data.results.map(vehicle => {
        const hasLocation = vehicle.latitude && vehicle.longitude;
        const location = hasLocation 
          ? [parseFloat(vehicle.latitude), parseFloat(vehicle.longitude)]
          : [-6.369028, 34.888822];

        if (hasLocation && allVehicles.length === 0) {
          setMapCenter(location);
          setMapZoom(12); // Zoom in when showing individual vehicle
        }

        return {
          id: vehicle.id,
          plate: vehicle.vehicle_id || 'N/A',
          driver: vehicle.driver || vehicle.owner || 'Unknown',
          weight: vehicle.current_weight || vehicle.last_reported_weight || 0,
          maxWeight: vehicle.max_allowed_weight || 22000,
          status: vehicle.weight_alert ? 'overload' : 'normal',
          location,
          lastUpdate: vehicle.last_reported_location 
            ? new Date(vehicle.last_reported_location).toLocaleString()
            : 'N/A',
          vehicleImage: vehicle.vehicle_image,
          vehicleName: vehicle.vehicle_name || 'Unknown Vehicle',
          speed: vehicle.speed || 0,
          heading: vehicle.heading || 0
        };
      });

      const processedAlerts = alertsResponse.data.results?.map(alert => ({
        id: alert.id,
        type: alert.alert_type || 'Weight Alert',
        vehicle: alert.vehicle_id || 'Unknown',
        time: alert.timestamp ? new Date(alert.timestamp).toLocaleString() : new Date().toLocaleString(),
        severity: alert.severity || 'high',
        location: alert.latitude && alert.longitude 
          ? [parseFloat(alert.latitude), parseFloat(alert.longitude)]
          : null
      })) || [];

      setAllVehicles(processedVehicles);
      setDisplayVehicles(processedVehicles.slice(0, 2));
      setAllAlerts(processedAlerts);
      setDisplayAlerts(processedAlerts.slice(0, 1));
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_first_name');
    localStorage.removeItem('user_last_name');
    localStorage.removeItem('user_email');
    navigate('/login');
  };

  // Set up real-time updates
  useEffect(() => {
    fetchUserProfile();
    fetchDashboardData();

    const dataPollingInterval = setInterval(() => {
      fetchDashboardData();
    }, 1500000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 100000);

    return () => {
      clearInterval(dataPollingInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Calculate weight percentage
  const calculateWeightPercentage = (weight, maxWeight) => {
    return Math.min(100, (weight / maxWeight) * 100);
  };

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  // Custom vehicle popup content
  const renderVehiclePopup = (vehicle) => (
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
      {vehicle.speed > 0 && <p>Speed: {vehicle.speed} km/h</p>}
      {vehicle.heading > 0 && <p>Heading: {vehicle.heading}°</p>}
      <p>Last Update: {vehicle.lastUpdate}</p>
    </div>
  );

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
              <Link to="/logout" onClick={handleLogout}><FiLogOut className="nav-icon" /> Log Out</Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>Real-Time Vehicle Weight Monitoring</h1>
          
          <div className="header-right">
            <div className="current-time">
              <FiClock className="time-icon" /> 
              {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
            </div>
            
            {/* User Profile Section */}
            <div className="user-profile" onClick={toggleProfileDropdown}>
              <div className="profile-avatar-container">
                <img 
                  src={userProfile.avatar} 
                  alt="User Profile" 
                  className="profile-avatar"
                />
                {!showProfileDropdown && (
                  <div className="profile-name-mobile">
                    {userProfile.name.split(' ')[0]}
                  </div>
                )}
              </div>
              
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-info">
                    <img 
                      src={userProfile.avatar} 
                      alt="User Profile" 
                      className="dropdown-avatar"
                    />
                    <div className="profile-details">
                      <h4>{userProfile.name}</h4>
                      <p>{userProfile.role}</p>
                      {userProfile.email && <p className="profile-email">{userProfile.email}</p>}
                    </div>
                  </div>
                  <div className="dropdown-menu">
                    <Link to="/profile" className="dropdown-item">
                      <FiUser className="menu-icon" /> My Profile
                    </Link>
                    <Link to="/settings" className="dropdown-item">
                      <FiSettings className="menu-icon" /> Settings
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout-button"
                      onClick={handleLogout}
                    >
                      <FiLogOut className="menu-icon" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error} <button onClick={fetchDashboardData}>Retry</button>
          </div>
        )}

        <div className="dashboard-layout">
          {/* Left side content */}
          <div className="dashboard-content-left">
            {/* Overview Cards */}
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

            {/* Vehicle Status Section */}
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
                      {vehicle.speed > 0 && <p>Speed: {vehicle.speed} km/h</p>}
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
                        {alert.location && (
                          <button 
                            className="view-location-btn"
                            onClick={() => {
                              setMapCenter(alert.location);
                              setMapZoom(6); // Changed from 2 to 12 for better view
                            }}
                          >
                            <FiMapPin /> View Location
                          </button>
                        )}
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

          {/* Right side map */}
          <div className="dashboard-content-right">
            <div className="map-section">
              <h2 className="section-title">
                <FiMapPin className="section-icon" /> Live Vehicle Locations
              </h2>
              <div className="map-container">
                <MapContainer 
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  minZoom={6}
                  maxZoom={6}
                  maxBounds={[
                    [-12.5, 29.0], // Southwest corner of Tanzania
                    [-0.9, 41.0]   // Northeast corner of Tanzania
                  ]}
                  maxBoundsViscosity={1.0}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {allVehicles.map(vehicle => (
                    <Marker 
                      key={vehicle.id} 
                      position={vehicle.location}
                      icon={vehicle.status === 'overload' ? overloadIcon : normalIcon}
                      eventHandlers={{
                        click: () => {
                          setMapCenter(vehicle.location);
                          setMapZoom(6); // Changed from 2 to 12 for better view
                        }
                      }}
                    >
                      <Popup>
                        {renderVehiclePopup(vehicle)}
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