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
import { FiBell, FiCheck, FiX, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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

// Safe number formatting function
const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  if (typeof num !== 'number') return num;
  return num.toLocaleString();
};

function VehicleReports() {
  const navigate = useNavigate();
  const API_URL = 'http://localhost:8000/api/';
  
  // State management
  const [reportData, setReportData] = useState({
    criticalAlerts: 0,
    warningAlerts: 0,
    normalVehicles: 0,
    overloadAlerts: []
  });
  console.log(reportData);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [activeTab, setActiveTab] = useState('overview');
  const [alertFilters, setAlertFilters] = useState({
    status: 'all',
    location: '',
    minOverload: 0
  });

  // Safe data processing for alerts
  const processAlertData = (alert) => ({
    id: alert.id || 0,
    vehicleId: alert.vehicle?.vehicle_id || 'Unknown',
    weight: alert.current_weight || 0,
    overload: (alert.current_weight || 0) - (alert.vehicle?.max_allowed_weight || 0),
    location: alert.location || 'Unknown Location',
    time: alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A',
    status: alert.severity === 'high' ? 'critical' : 
           alert.severity === 'medium' ? 'sensor malfunction' : 'normal',
    coordinates: alert.latitude && alert.longitude ? 
                [parseFloat(alert.latitude), parseFloat(alert.longitude)] : 
                [-6.7924, 39.2083]
  });

  // Fetch report data from backend
  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}reports/summary/`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data || {};
      setReportData({
        criticalAlerts: data.critical_alerts || 0,
        warningAlerts: data.warning_alerts || 0,
        normalVehicles: data.normal_vehicles || 0,
        overloadAlerts: (data.overload_alerts || []).map(processAlertData)
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
      // Set empty state on error
      setReportData({
        criticalAlerts: 0,
        warningAlerts: 0,
        normalVehicles: 0,
        overloadAlerts: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch alert frequency data for charts
  const fetchAlertFrequencyData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}reports/alert-frequency/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = response.data || {};
      return {
        labels: data.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Critical Alerts',
            data: data.critical || [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(231, 76, 60, 0.7)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 1
          },
          {
            label: 'Warning Alerts',
            data: data.warning || [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(230, 126, 34, 0.7)',
            borderColor: 'rgba(230, 126, 34, 1)',
            borderWidth: 1
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching alert frequency data:', error);
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Critical Alerts',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(231, 76, 60, 0.7)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 1
          },
          {
            label: 'Warning Alerts',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(230, 126, 34, 0.7)',
            borderColor: 'rgba(230, 126, 34, 1)',
            borderWidth: 1
          }
        ]
      };
    }
  };

  // Fetch weight trend data
  const fetchWeightTrendData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}reports/weight-trends/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = response.data || {};
      return {
        labels: data.times || ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
        datasets: [
          {
            label: 'Average Vehicle Weight (kg)',
            data: data.average_weights || [0, 0, 0, 0, 0, 0],
            fill: true,
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderColor: 'rgba(52, 152, 219, 1)',
            tension: 0.4
          },
          {
            label: 'Max Weight Limit',
            data: Array(6).fill(15000),
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching weight trend data:', error);
      return {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
        datasets: [
          {
            label: 'Average Vehicle Weight (kg)',
            data: [0, 0, 0, 0, 0, 0],
            fill: true,
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderColor: 'rgba(52, 152, 219, 1)',
            tension: 0.4
          },
          {
            label: 'Max Weight Limit',
            data: Array(6).fill(15000),
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
          }
        ]
      };
    }
  };

  const [alertFrequencyData, setAlertFrequencyData] = useState(null);
  const [weightTrendData, setWeightTrendData] = useState(null);

  // Load all report data
  const loadReportData = async () => {
    setIsLoading(true);
    try {
      await fetchReportData();
      const frequencyData = await fetchAlertFrequencyData();
      setAlertFrequencyData(frequencyData);
      
      const trendData = await fetchWeightTrendData();
      setWeightTrendData(trendData);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
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
    if (!alert) return false;
    
    // Status filter
    if (alertFilters.status !== 'all' && alert.status !== alertFilters.status) {
      return false;
    }
    // Location filter
    if (alertFilters.location && !(alert.location || '').toLowerCase().includes(alertFilters.location.toLowerCase())) {
      return false;
    }
    // Overload filter
    if ((alert.overload || 0) < alertFilters.minOverload) {
      return false;
    }
    return true;
  });

  // Safe CSV data preparation
  const csvData = [
    ['Vehicle ID', 'Weight', 'Overload', 'Location', 'Time', 'Status'],
    ...filteredAlerts.map(alert => [
      alert.vehicleId || 'N/A',
      `${formatNumber(alert.weight)} kg`,
      `${alert.overload > 0 ? '+' : ''}${formatNumber(alert.overload)} kg`,
      alert.location || 'N/A',
      alert.time || 'N/A',
      alert.status || 'N/A'
    ])
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_first_name');
    localStorage.removeItem('user_last_name');
    localStorage.removeItem('user_email');
    navigate('/login');
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const NotifyAction = ({ alert, onNotificationSent }) => {
    const [isNotifying, setIsNotifying] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState(null);
  
    const handleNotify = async () => {
      setIsNotifying(true);
      setNotificationStatus(null);
      
      try {
        const token = localStorage.getItem('access_token');
        await axios.post(
          `${API_URL}alerts/${alert.id}/notify/`, 
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        setNotificationStatus('success');
        onNotificationSent(alert.id);
        toast.success(`Notification sent for ${alert.vehicleId}`);
      } catch (error) {
        setNotificationStatus('failed');
        toast.error('Failed to send notification');
      } finally {
        setIsNotifying(false);
      }
    };

    return (
      <div className="notification-action">
        {notificationStatus === 'success' ? (
          <span className="notification-success">
            <FiCheck /> Sent
          </span>
        ) : notificationStatus === 'failed' ? (
          <span className="notification-failed">
            <FiX /> Failed
          </span>
        ) : (
          <button 
            className={`notify-btn ${alert.status}`}
            onClick={handleNotify}
            disabled={isNotifying}
          >
            {isNotifying ? 'Sending...' : <FiBell />}
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="vehicle-management-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

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
            <li className="active">
              <Link to="/reports"><FiBarChart2 className="nav-icon" /> Reports</Link>
            </li>
            <li>
              <Link to="/settings"><FiSettings className="nav-icon" /> System Settings</Link>
            </li>
            <li className="logout">
              <Link to="#" onClick={handleLogout}><FiLogOut className="nav-icon" /> Logout</Link>
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
                    <div className="card-value">{formatNumber(reportData.normalVehicles)}</div>
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
                          <td>{alert.vehicleId || 'N/A'}</td>
                          <td>{formatNumber(alert.weight)} kg</td>
                          <td>
                            <span className={`overload-badge ${alert.overload > 0 ? 'positive' : 'negative'}`}>
                              {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg
                            </span>
                          </td>
                          <td>
                            <FiMapPin /> {alert.location || 'N/A'}
                          </td>
                          <td>{alert.time || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${alert.status}`}>
                              {alert.status || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <NotifyAction alert={alert} onNotificationSent={() => {}} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'alerts' && alertFrequencyData && (
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
                        <td>{alert.vehicleId || 'N/A'}</td>
                        <td>{formatNumber(alert.weight)} kg</td>
                        <td>
                          <span className={`overload-badge ${alert.overload > 0 ? 'positive' : 'negative'}`}>
                            {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg
                          </span>
                        </td>
                        <td>
                          <FiMapPin /> {alert.location || 'N/A'}
                        </td>
                        <td>{alert.time || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${alert.status}`}>
                            {alert.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trends' && weightTrendData && (
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
                  zoom={5.5} 
                  style={{ height: '500px', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {reportData.overloadAlerts.map(alert => (
                    <Marker key={alert.id} position={alert.coordinates || [-6.7924, 39.2083]}>
                      <Popup>
                        <strong>{alert.vehicleId || 'N/A'}</strong><br />
                        {alert.location || 'N/A'}<br />
                        Weight: {formatNumber(alert.weight)} kg<br />
                        Overload: {alert.overload > 0 ? '+' : ''}{formatNumber(alert.overload)} kg<br />
                        Status: <span className={`status-text ${alert.status}`}>{alert.status || 'N/A'}</span>
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