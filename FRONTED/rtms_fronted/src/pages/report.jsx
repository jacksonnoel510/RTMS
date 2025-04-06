import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiTruck, FiUser, FiAlertTriangle, FiPieChart, FiSettings, 
  FiLogOut, FiDownload, FiCalendar, FiClock, FiRefreshCw,
  FiMapPin, FiTrendingUp, FiTrendingDown, FiBarChart2, FiFilter
} from 'react-icons/fi';
import { CSVLink } from 'react-csv';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fix for leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function VehicleReports() {
  // State management
  const [reportData, setReportData] = useState({
    criticalAlerts: 12,
    warningAlerts: 28,
    normalVehicles: 156,
    overloadAlerts: [
      {
        id: 1,
        vehicleId: 'TZA-4518-CT',
        weight: 18520,
        overload: 3520,
        location: 'Kurasini Highway',
        time: '10:25 AM',
        status: 'critical',
        coordinates: [-6.8235, 39.2695] // Dar es Salaam coordinates
      },
      {
        id: 2,
        vehicleId: 'TZA-8323-BT',
        weight: 16750,
        overload: 1750,
        location: 'Dar Port Road',
        time: '09:15 AM',
        status: 'warning',
        coordinates: [-6.8276, 39.2705]
      },
      {
        id: 3,
        vehicleId: 'TZA-7787-CT',
        weight: 14250,
        overload: -750,
        location: 'TANROADS Junction',
        time: '9:47 AM',
        status: 'normal',
        coordinates: [-6.8168, 39.2804]
      },
      {
        id: 4,
        vehicleId: 'TZA-4198-BT',
        weight: 19120,
        overload: 4120,
        location: 'Kunduchi Highway',
        time: '08:05 AM',
        status: 'critical',
        coordinates: [-6.6685, 39.2283]
      },
      {
        id: 5,
        vehicleId: 'TZA-6521-CT',
        weight: 16380,
        overload: 1380,
        location: 'UDSM Road',
        time: '08:05 AM',
        status: 'warning',
        coordinates: [-6.7823, 39.2089]
      }
    ]
  });
  const [dateRange, setDateRange] = useState({
    start: '2025-04-01',
    end: '2025-04-30'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [alertFilters, setAlertFilters] = useState({
    status: 'all',
    location: '',
    minOverload: 0
  });

  // Alert frequency data for charts
  const alertFrequencyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Critical Alerts',
        data: [5, 8, 6, 12, 9, 7],
        backgroundColor: 'rgba(231, 76, 60, 0.7)',
        borderColor: 'rgba(231, 76, 60, 1)',
        borderWidth: 1
      },
      {
        label: 'Warning Alerts',
        data: [10, 15, 12, 28, 20, 18],
        backgroundColor: 'rgba(230, 126, 34, 0.7)',
        borderColor: 'rgba(230, 126, 34, 1)',
        borderWidth: 1
      }
    ]
  };

  // Weight trend data
  const weightTrendData = {
    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [
      {
        label: 'Average Vehicle Weight (kg)',
        data: [12000, 14500, 15500, 16200, 14800, 13500],
        fill: true,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: 'rgba(52, 152, 219, 1)',
        tension: 0.4
      },
      {
        label: 'Max Weight Limit',
        data: [15000, 15000, 15000, 15000, 15000, 15000],
        borderColor: 'rgba(231, 76, 60, 1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  // Simulate loading report data
  const loadReportData = () => {
    setIsLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  // Handle alert filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setAlertFilters(prev => ({ ...prev, [name]: value }));
  };

  // Generate report
  const generateReport = (e) => {
    e.preventDefault();
    loadReportData();
  };

  // Filter alerts based on current filters
  const filteredAlerts = reportData.overloadAlerts.filter(alert => {
    // Status filter
    if (alertFilters.status !== 'all' && alert.status !== alertFilters.status) {
      return false;
    }
    // Location filter
    if (alertFilters.location && !alert.location.toLowerCase().includes(alertFilters.location.toLowerCase())) {
      return false;
    }
    // Overload filter
    if (alert.overload < alertFilters.minOverload) {
      return false;
    }
    return true;
  });

  // CSV data preparation
  const csvData = [
    ['Vehicle ID', 'Weight', 'Overload', 'Location', 'Time', 'Status'],
    ...filteredAlerts.map(alert => [
      alert.vehicleId,
      `${alert.weight.toLocaleString()} kg`,
      `${alert.overload > 0 ? '+' : ''}${alert.overload.toLocaleString()} kg`,
      alert.location,
      alert.time,
      alert.status
    ])
  ];

  // Format number with thousands separator
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  useEffect(() => {
    loadReportData();
  }, []);

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
            <li>
              <Link to="/dashboard"><FiPieChart className="nav-icon" /> Dashboard</Link>
            </li>
            <li>
              <Link to="/vehicle-management"><FiTruck className="nav-icon" /> Vehicle Management</Link>
            </li>
            <li>
              <Link to="/alerts"><FiAlertTriangle className="nav-icon" /> Alerts</Link>
            </li>
            <li className="active">
              <Link to="/reports"><FiBarChart2 className="nav-icon" /> Reports</Link>
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
      <div className="main-content">
        <header className="content-header">
          <h1>Vehicle Load Reports</h1>
          <form className="date-controls" onSubmit={generateReport}>
            <div className="form-row">
              <div className="form-group">
                <label>From:</label>
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateChange}
                  className="modern-date"
                />
              </div>
              <div className="form-group">
                <label>To:</label>
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateChange}
                  className="modern-date"
                />
              </div>
              <button type="submit" className="generate-btn" disabled={isLoading}>
                {isLoading ? (
                  <FiRefreshCw className="spin" />
                ) : (
                  <>
                    <FiRefreshCw /> Generate
                  </>
                )}
              </button>
            </div>
          </form>
        </header>

        {/* Report Tabs */}
        <div className="report-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts
          </button>
          <button
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
          <button
            className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            Locations
          </button>
        </div>

        {/* Report Content */}
        <div className="report-content">
          {activeTab === 'overview' && (
            <>
              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card critical">
                  <div className="card-icon">
                    <FiAlertTriangle />
                  </div>
                  <div className="card-content">
                    <div className="card-value">{formatNumber(reportData.criticalAlerts)}</div>
                    <div className="card-label">Critical Alerts</div>
                    <div className="card-trend trend-up">
                      <FiTrendingUp /> 18% from last period
                    </div>
                  </div>
                </div>

                <div className="summary-card warning">
                  <div className="card-icon">
                    <FiAlertTriangle />
                  </div>
                  <div className="card-content">
                    <div className="card-value">{formatNumber(reportData.warningAlerts)}</div>
                    <div className="card-label">Warning Alerts</div>
                    <div className="card-trend trend-neutral">
                      → No change
                    </div>
                  </div>
                </div>

                <div className="summary-card normal">
                  <div className="card-icon">
                    <FiTruck />
                  </div>
                  <div className="card-content">
                    <div className="card-value">{reportData.normalVehicles}</div>
                    <div className="card-label">Normal Vehicles</div>
                    <div className="card-trend trend-down">
                      <FiTrendingDown /> 5% from last period
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="recent-alerts">
                <h3>
                  <FiAlertTriangle /> Recent Overload Alerts
                </h3>
                <div className="alert-actions">
                  <CSVLink 
                    data={csvData} 
                    filename="overload-alerts.csv" 
                    className="export-btn csv"
                  >
                    <FiDownload /> Export CSV
                  </CSVLink>
                </div>
                
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
                      {filteredAlerts.slice(0, 5).map((alert, index) => (
                        <tr key={index} className={`alert-row ${alert.status}`}>
                          <td>{alert.vehicleId}</td>
                          <td>{formatNumber(alert.weight)} kg</td>
                          <td>
                            <span className={`overload-badge ${alert.overload > 0 ? 'positive' : 'negative'}`}>
                              {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg
                            </span>
                          </td>
                          <td>
                            <FiMapPin /> {alert.location}
                          </td>
                          <td>{alert.time}</td>
                          <td>
                            <span className={`status-badge ${alert.status}`}>
                              {alert.status}
                            </span>
                          </td>
                          <td>
                            <button className="action-btn notify">
                              Notify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'alerts' && (
            <div className="alert-analysis">
              <div className="analysis-header">
                <h3>Alert Analysis</h3>
                <div className="alert-filters">
                  <div className="filter-group">
                    <label>Status:</label>
                    <select
                      name="status"
                      value={alertFilters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="all">All Statuses</option>
                      <option value="critical">Critical Only</option>
                      <option value="warning">Warning Only</option>
                      <option value="normal">Normal Only</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      name="location"
                      value={alertFilters.location}
                      onChange={handleFilterChange}
                      placeholder="Filter by location"
                    />
                  </div>
                  <div className="filter-group">
                    <label>Min Overload (kg):</label>
                    <input
                      type="number"
                      name="minOverload"
                      value={alertFilters.minOverload}
                      onChange={handleFilterChange}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="alert-chart-container">
                <Bar 
                  data={alertFrequencyData}
                  options={{
                    responsive: true,
                    plugins: {
                      title: {
                        display: true,
                        text: 'Alert Frequency (Last 6 Months)',
                        font: {
                          size: 16
                        }
                      },
                      legend: {
                        position: 'top',
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
                  }}
                />
              </div>
              
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert, index) => (
                      <tr key={index} className={`alert-row ${alert.status}`}>
                        <td>{alert.vehicleId}</td>
                        <td>{formatNumber(alert.weight)} kg</td>
                        <td>
                          <span className={`overload-badge ${alert.overload > 0 ? 'positive' : 'negative'}`}>
                            {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg
                          </span>
                        </td>
                        <td>
                          <FiMapPin /> {alert.location}
                        </td>
                        <td>{alert.time}</td>
                        <td>
                          <span className={`status-badge ${alert.status}`}>
                            {alert.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="trend-analysis">
              <h3>Weight Trend Analysis</h3>
              
              <div className="trend-chart-container">
                <Line 
                  data={weightTrendData}
                  options={{
                    responsive: true,
                    plugins: {
                      title: {
                        display: true,
                        text: 'Daily Weight Trends',
                        font: {
                          size: 16
                        }
                      },
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: false,
                        title: {
                          display: true,
                          text: 'Weight (kg)'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="trend-stats">
                <div className="stat-card">
                  <div className="stat-value">15,200 kg</div>
                  <div className="stat-label">Average Daily Weight</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">12%</div>
                  <div className="stat-label">Over Limit Trips</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">3:00 PM</div>
                  <div className="stat-label">Peak Overload Time</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="location-analysis">
              <h3>Alert Location Heatmap</h3>
              
              <div className="map-container">
                <MapContainer 
                  center={[-6.7924, 39.2083]} 
                  zoom={12} 
                  style={{ height: '500px', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {reportData.overloadAlerts.map(alert => (
                    <Marker key={alert.id} position={alert.coordinates || [-6.7924, 39.2083]}>
                      <Popup>
                        <strong>{alert.vehicleId}</strong><br />
                        {alert.location}<br />
                        Weight: {formatNumber(alert.weight)} kg<br />
                        Overload: {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg<br />
                        Status: <span className={`status-text ${alert.status}`}>{alert.status}</span>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              
              <div className="location-stats">
                <div className="stat-card">
                  <div className="stat-value">Kurasini Highway</div>
                  <div className="stat-label">Most Critical Alerts</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">5</div>
                  <div className="stat-label">Hotspot Locations</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleReports;