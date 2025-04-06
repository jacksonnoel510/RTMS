import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../css/Dashboard.css';
import { FiAlertTriangle, FiTruck, FiUser, FiClock, FiPieChart, FiSettings, FiLogOut } from 'react-icons/fi';

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [vehicles, setVehicles] = useState([
    { id: 1, plate: 'T 456 ABC', driver: 'mpolo', weight: 15000, maxWeight: 22000, status: 'normal' },
    { id: 2, plate: 'T 789 XYZ', driver: 'MARIA', weight: 25000, maxWeight: 22000, status: 'overload' }
  ]);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'Overload', vehicle: 'T 789 XYZ', time: '2025-03-27 14:30:45', severity: 'high' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // In a real app, you would fetch data from API here
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          <h1>Real-Time Vehicle Monitoring</h1>
          <div className="current-time">
            <FiClock className="time-icon" /> 
            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </div>
        </header>

        <div className="dashboard-content">
          {/* Status Overview Cards */}
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
              <FiTruck className="section-icon" /> Vehicle Status
            </h2>
            
            <div className="vehicle-cards">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className={`vehicle-card ${vehicle.status}`}>
                  <div className="vehicle-header">
                    <h3>{vehicle.plate}</h3>
                    <span className="vehicle-status">{vehicle.status}</span>
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
                            width: `${Math.min(100, (vehicle.weight / vehicle.maxWeight) * 100)}%`,
                            backgroundColor: vehicle.status === 'overload' ? '#e74c3c' : '#2ecc71'
                          }}
                        ></div>
                      </div>
                    </div>
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
                      <span className="alert-severity">{alert.severity}</span>
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