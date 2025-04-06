import { useState, useEffect } from 'react';
import { 
  FiTruck, FiUser, FiAlertTriangle, FiPieChart, FiSettings, 
  FiLogOut, FiDownload, FiCalendar, FiClock, FiRefreshCw,
  FiMapPin, FiTrendingUp, FiTrendingDown, FiBarChart2, FiHome
} from 'react-icons/fi';
import { CSVLink } from 'react-csv';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Initialize ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Fix for leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const VehicleDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [alertData, setAlertData] = useState({
    criticalAlerts: 12,
    warningAlerts: 28,
    normalReadings: "30/4/2025",
    filterCount: 156,
    recentAlerts: [
      {
        id: 1,
        vehicleId: "TZA-4518-CT",
        weight: 18520,
        overload: 3520,
        location: "Kurasini Highway",
        time: "10:25 AM",
        status: "critical",
        action: "notify",
        coordinates: [-6.8235, 39.2695] // Dar es Salaam coordinates
      },
      // More alert data...
    ]
  });
  const [isLoading, setIsLoading] = useState(false);

  // Simulate data loading
  const loadData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format numbers with thousands separator
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  // Chart data configuration
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Critical Alerts',
        data: [3, 5, 2, 4, 6, 1, 2],
        backgroundColor: 'rgba(231, 76, 60, 0.8)',
      },
      {
        label: 'Warning Alerts',
        data: [8, 5, 7, 4, 5, 3, 6],
        backgroundColor: 'rgba(230, 126, 34, 0.8)',
      },
      {
        label: 'Normal Readings',
        data: [45, 50, 48, 52, 49, 55, 60],
        backgroundColor: 'rgba(46, 204, 113, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Alert Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Alerts'
        }
      }
    }
  };

  return (
    <div className="vehicle-management-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>
            <FiTruck className="sidebar-icon" /> Vehicle Monitoring
          </h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''}>
              <button onClick={() => setActiveTab('dashboard')}>
                <FiHome className="nav-icon" /> Dashboard
              </button>
            </li>
            <li className={activeTab === 'alerts' ? 'active' : ''}>
              <button onClick={() => setActiveTab('alerts')}>
                <FiAlertTriangle className="nav-icon" /> Alerts
              </button>
            </li>
            <li className={activeTab === 'reports' ? 'active' : ''}>
              <button onClick={() => setActiveTab('reports')}>
                <FiBarChart2 className="nav-icon" /> Reports
              </button>
            </li>
            <li>
              <button>
                <FiSettings className="nav-icon" /> Settings
              </button>
            </li>
            <li className="logout">
              <button>
                <FiLogOut className="nav-icon" /> Log Out
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'dashboard' && (
          <>
            <header className="content-header">
              <h1>Dashboard Overview</h1>
              <div className="header-controls">
                <button 
                  className="refresh-btn"
                  onClick={loadData}
                  disabled={isLoading}
                >
                  <FiRefreshCw className={isLoading ? "spin" : ""} />
                  {isLoading ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>
            </header>

            {/* Dashboard Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card critical">
                <div className="card-content">
                  <div className="card-value">{alertData.criticalAlerts}</div>
                  <div className="card-label">Critical Alerts</div>
                  <div className="card-trend trend-up">
                    <FiTrendingUp /> 18% from yesterday
                  </div>
                </div>
                <div className="card-icon">
                  <FiAlertTriangle />
                </div>
              </div>

              {/* More summary cards... */}
            </div>

            {/* Dashboard Charts */}
            <div className="dashboard-charts">
              <div className="chart-container">
                <h3><FiBarChart2 /> Weekly Alert Trends</h3>
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="map-container">
                <h3><FiMapPin /> Alert Locations</h3>
                <div className="map-wrapper">
                  <MapContainer 
                    center={[-6.7924, 39.2083]} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {alertData.recentAlerts.map(alert => (
                      <Marker key={alert.id} position={alert.coordinates || [-6.7924, 39.2083]}>
                        <Popup>
                          <strong>{alert.vehicleId}</strong><br />
                          {alert.location}<br />
                          Overload: {formatNumber(alert.overload)} kg
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'alerts' && (
          <>
            <header className="content-header">
              <h1>Vehicle Load Alerts</h1>
              <div className="header-controls">
                <button 
                  className="refresh-btn"
                  onClick={loadData}
                  disabled={isLoading}
                >
                  <FiRefreshCw className={isLoading ? "spin" : ""} />
                  {isLoading ? "Refreshing..." : "Refresh Data"}
                </button>
                <CSVLink 
                  data={alertData.recentAlerts.map(alert => ({
                    'Vehicle ID': alert.vehicleId,
                    'Weight': `${formatNumber(alert.weight)} kg`,
                    'Overload': `${alert.overload > 0 ? '+' : ''}${formatNumber(alert.overload)} kg`,
                    'Location': alert.location,
                    'Time': alert.time,
                    'Status': alert.status.charAt(0).toUpperCase() + alert.status.slice(1)
                  }))} 
                  filename="vehicle-alerts.csv"
                  className="export-btn"
                >
                  <FiDownload /> Export CSV
                </CSVLink>
              </div>
            </header>

            {/* Alert Table */}
            <div className="alert-table-container">
              <table className="alert-table">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Weight</th>
                    <th>Overload</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alertData.recentAlerts.map(alert => (
                    <tr key={alert.id} className={`alert-row ${alert.status}`}>
                      <td>{alert.vehicleId}</td>
                      <td>{formatNumber(alert.weight)} kg</td>
                      <td>
                        <span className={`overload-badge ${alert.overload > 0 ? 'positive' : 'negative'}`}>
                          {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg
                        </span>
                      </td>
                      <td>
                        <FiMapPin className="location-icon" /> {alert.location}
                      </td>
                      <td>{alert.time}</td>
                      <td>
                        <span className={`status-badge ${alert.status}`}>
                          {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button className={`action-btn ${alert.action}`}>
                          {alert.action === 'notify' ? <FiBell /> : <FiClock />}
                          {alert.action.charAt(0).toUpperCase() + alert.action.slice(1)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <header className="content-header">
              <h1>Vehicle Reports</h1>
              <div className="header-controls">
                <button className="generate-btn">
                  <FiCalendar /> Generate Monthly Report
                </button>
              </div>
            </header>

            {/* Report Content */}
            <div className="report-content">
              <div className="report-section">
                <h3>Performance Overview</h3>
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="report-section">
                <h3>Geographical Distribution</h3>
                <div className="map-wrapper" style={{ height: '400px' }}>
                  <MapContainer 
                    center={[-6.7924, 39.2083]} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {alertData.recentAlerts.map(alert => (
                      <Marker key={alert.id} position={alert.coordinates || [-6.7924, 39.2083]}>
                        <Popup>
                          <strong>{alert.vehicleId}</strong><br />
                          {alert.location}<br />
                          Status: {alert.status}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VehicleDashboard;