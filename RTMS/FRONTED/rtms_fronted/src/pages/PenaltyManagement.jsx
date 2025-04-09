import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiTruck, FiDollarSign, FiAlertTriangle, FiPieChart, 
  FiSettings, FiLogOut, FiCalendar, FiClock, FiRefreshCw,
  FiBarChart2, FiFilter, FiSearch, FiDownload, FiInfo, 
  FiPrinter, FiEdit, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { CSVLink } from 'react-csv';
import { useReactToPrint } from 'react-to-print';

const PenaltyManagement = () => {
  const navigate = useNavigate();
  const API_URL = 'http://localhost:8000/api/';
  const componentRef = useRef();
  
  // State management
  const [penalties, setPenalties] = useState([]);
  const [groupedPenalties, setGroupedPenalties] = useState({});
  const [filteredPenalties, setFilteredPenalties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [penaltyRate, setPenaltyRate] = useState({
    amount: 50000,
    effective_from: new Date().toISOString(),
    notes: ''
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    vehicleId: '',
    status: 'all',
    minOverload: '',
    maxOverload: '',
    paid: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num !== 'number') return num;
    return num.toLocaleString();
  };

  // Group penalties by vehicle
  const groupPenaltiesByVehicle = (penalties) => {
    const grouped = {};
    
    penalties.forEach(penalty => {
      const vehicleId = penalty.vehicle?.vehicle_id || 'unknown';
      if (!grouped[vehicleId]) {
        grouped[vehicleId] = {
          vehicle: penalty.vehicle,
          penalties: [],
          totalAmount: 0,
          unpaidAmount: 0,
          totalOverload: 0,
          count: 0,
          paidCount: 0
        };
      }
      
      grouped[vehicleId].penalties.push(penalty);
      grouped[vehicleId].totalAmount += penalty.amount || 0;
      grouped[vehicleId].totalOverload += penalty.overload_amount || 0;
      grouped[vehicleId].count++;
      
      if (!penalty.paid) {
        grouped[vehicleId].unpaidAmount += penalty.amount || 0;
      } else {
        grouped[vehicleId].paidCount++;
      }
    });
    
    return grouped;
  };

  // Fetch penalties from backend
  const fetchPenalties = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      console.log(token)
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...(filters.vehicleId && { vehicle_id: filters.vehicleId }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.paid && { paid: filters.paid === 'paid' }),
        ...(filters.minOverload && { min_overload: filters.minOverload }),
        ...(filters.maxOverload && { max_overload: filters.maxOverload })
      };

      const response = await axios.get(`${API_URL}penalties/`, {
        params,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = Array.isArray(response?.data) ? response.data : [];
      setPenalties(data);
      
      // Group penalties by vehicle
      const grouped = groupPenaltiesByVehicle(data);
      setGroupedPenalties(grouped);
      
      // Create flat array for filtering/pagination
      const vehicleArray = Object.keys(grouped).map(key => ({
        vehicleId: key,
        ...grouped[key]
      }));
      setFilteredPenalties(vehicleArray);
    } catch (error) {
      console.error('Error fetching penalties:', error);
      toast.error('Failed to load penalty data');
      setPenalties([]);
      setGroupedPenalties({});
      setFilteredPenalties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!Array.isArray(filteredPenalties)) return 0;
    return filteredPenalties.reduce((total, vehicle) => {
      return total + (vehicle.totalAmount || 0);
    }, 0);
  };

  // Fetch current penalty rate
  const fetchPenaltyRate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}penalties/rate/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(response)
      setPenaltyRate(response.data);
    } catch (error) {
      console.error('Error fetching penalty rate:', error);
      toast.error('Failed to load penalty rate');
    }
  };

  // Update penalty rate
  const updatePenaltyRate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}penalties/rate/`,
        { rate: penaltyRate.amount, notes: penaltyRate.notes },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPenaltyRate(response.data);
      toast.success('Penalty rate updated successfully');
    } catch (error) {
      console.error('Error updating penalty rate:', error);
      toast.error('Failed to update penalty rate');
    }
  };

  // Mark penalty as paid
  const markAsPaid = async (penaltyId, referenceNumber = '') => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}penalties/${penaltyId}/mark-paid/`,
        { reference_number: referenceNumber },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Refresh data after payment
      await fetchPenalties();
      toast.success('Penalty marked as paid successfully');
    } catch (error) {
      console.error('Error marking penalty as paid:', error);
      toast.error('Failed to update penalty status');
    }
  };

  // Update penalty status
  const updatePenaltyStatus = async (penaltyId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}penalties/${penaltyId}/status/`,
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Refresh data after status update
      await fetchPenalties();
      toast.success(`Penalty status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating penalty status:', error);
      toast.error('Failed to update penalty status');
    }
  };

  // Handle changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    setPenaltyRate(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchPenalties();
    setCurrentPage(1);
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      vehicleId: '',
      status: 'all',
      minOverload: '',
      maxOverload: '',
      paid: ''
    });
    fetchPenalties();
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredPenalties.length / itemsPerPage);
  const paginatedData = filteredPenalties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV data for export
  const csvData = [
    ['Vehicle ID', 'Registration', 'Total Penalties', 'Paid Penalties', 'Total Amount (TZS)', 'Unpaid Amount (TZS)', 'Total Overload (kg)'],
    ...filteredPenalties.map(vehicle => [
      vehicle.vehicle?.vehicle_id || 'N/A',
      vehicle.vehicle?.registration_number || 'N/A',
      vehicle.count,
      vehicle.paidCount,
      vehicle.totalAmount,
      vehicle.unpaidAmount,
      vehicle.totalOverload
    ])
  ];

  // Print functionality
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: `
      @page { size: auto; margin: 5mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        table { width: 100%; font-size: 12px; }
        .summary-card { break-inside: avoid; }
        .no-print { display: none; }
      }
    `
  });

  // Initialize data
  useEffect(() => {
    fetchPenaltyRate();
    fetchPenalties();
  }, []);

  if (isLoading) {
    return (
      <div className="vehicle-management-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading penalty data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-management-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2><FiTruck className="sidebar-icon" /> Vehicle Monitoring</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li><Link to="/dashboard"><FiPieChart className="nav-icon" /> Dashboard</Link></li>
            <li><Link to="/vehicle-management"><FiTruck className="nav-icon" /> Vehicle Management</Link></li>
            <li><Link to="/reports"><FiBarChart2 className="nav-icon" /> Reports</Link></li>
            <li className="active"><Link to="/penalties"><FiDollarSign className="nav-icon" /> Penalties</Link></li>
            <li><Link to="/settings"><FiSettings className="nav-icon" /> System Settings</Link></li>
            <li className="logout">
              <Link to="#" onClick={() => {
                localStorage.removeItem('access_token');
                navigate('/login');
              }}><FiLogOut className="nav-icon" /> Logout</Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content" ref={componentRef}>
        <header className="content-header">
          <div className="header-title">
            <h1>Vehicle Overload Penalties</h1>
            <div className="header-actions no-print">
              <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
                <FiFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <CSVLink data={csvData} filename="penalty-report.csv" className="export-btn">
                <FiDownload /> Export
              </CSVLink>
              <button className="print-btn" onClick={handlePrint}>
                <FiPrinter /> Print
              </button>
            </div>
          </div>
          
          <form className="date-controls no-print" onSubmit={(e) => { e.preventDefault(); fetchPenalties(); }}>
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
              <button type="submit" className="generate-btn">
                <FiRefreshCw /> Generate
              </button>
            </div>
          </form>
        </header>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel no-print">
            <div className="filter-group">
              <label>Vehicle ID/Reg:</label>
              <input
                type="text"
                name="vehicleId"
                value={filters.vehicleId}
                onChange={handleFilterChange}
                placeholder="Search vehicle"
              />
            </div>
            <div className="filter-group">
              <label>Status:</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="disputed">Disputed</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Payment:</label>
              <select name="paid" value={filters.paid} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Overload Range (kg):</label>
              <div className="range-inputs">
                <input
                  type="number"
                  name="minOverload"
                  value={filters.minOverload}
                  onChange={handleFilterChange}
                  placeholder="Min"
                  min="0"
                />
                <span>to</span>
                <input
                  type="number"
                  name="maxOverload"
                  value={filters.maxOverload}
                  onChange={handleFilterChange}
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>
            <div className="filter-actions">
              <button className="apply-btn" onClick={applyFilters}>Apply Filters</button>
              <button className="reset-btn" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        )}

        {/* Penalty Settings */}
        <div className="penalty-settings">
          <div className="settings-header">
            <h3><FiAlertTriangle /> Penalty Rate Configuration</h3>
            <div className="info-tooltip">
              <FiInfo size={16} />
              <span className="tooltip-text">
                Current rate: {penaltyRate?.rate?.toLocaleString() || 'N/A'} TZS<br />
                Effective from: {penaltyRate?.effective_from ? new Date(penaltyRate.effective_from).toLocaleDateString() : 'N/A'}<br />
                {penaltyRate?.notes || ''}
              </span>
            </div>
          </div>
          <div className="settings-form no-print">
            <div className="form-group">
              <label>New Rate (TZS):</label>
              <div className="rate-input-container">
                <input
                  type="number"
                  name="amount"
                  value={penaltyRate.rate}
                  onChange={handleRateChange}
                  min="0"
                  step="1000"
                />
                <span className="currency">TZS</span>
              </div>
            </div>
            <div className="form-group">
              <label>Change Notes:</label>
              <input
                type="text"
                name="notes"
                value={penaltyRate.notes}
                onChange={handleRateChange}
                placeholder="Reason for rate change"
              />
            </div>
            <button className="update-btn" onClick={updatePenaltyRate}>
              Update Rate
            </button>
          </div>
          <div className="penalty-summary">
            <div className="summary-card">
              <div className="card-value">{filteredPenalties.length}</div>
              <div className="card-label">Total Vehicles</div>
              <div className="card-trend">
                {Object.keys(groupedPenalties).length > 0 && (
                  <span>{Math.round((filteredPenalties.length / Object.keys(groupedPenalties).length) * 100)}% of total</span>
                )}
              </div>
            </div>
            <div className="summary-card">
              <div className="card-value">{calculateTotal()?.toLocaleString() || '0'} Tsh</div>
              <div className="card-label">Total Penalties</div>
              <div className="card-trend">
                {Object.keys(groupedPenalties).length > 0 && (
                  <span>
                    {Math.round((filteredPenalties.reduce((t, v) => t + (v?.totalAmount || 0), 0) / 
                      Object.values(groupedPenalties).reduce((t, v) => t + (v?.totalAmount || 0), 0)) * 100)}% of total
                  </span>
                )}
              </div>
            </div>
            <div className="summary-card">
            <div className="card-value">
                        {filteredPenalties.reduce((count, vehicle) => count + vehicle.paidCount, 0)}
                        (
                        {filteredPenalties
                          .reduce((count, vehicle) => count + vehicle.paidCount * penaltyRate.rate, 0)
                          .toLocaleString()}
                        Tsh)
                      </div>

              <div className="card-label">PaidPenalties(AmountPaid)</div>
              <div className="card-trend">
                {filteredPenalties.length > 0 && (
                  <span>
                    {Math.round(
                      (filteredPenalties.reduce((count, vehicle) => count + vehicle.paidCount, 0) /
                      filteredPenalties.reduce((count, vehicle) => count + vehicle.count, 0)) * 100
                    )}% paid
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Penalties Table */}
        <div className="penalties-table-container">
          <div className="table-header no-print">
            <div className="results-count">
              Showing {paginatedData.length} of {filteredPenalties.length} vehicles
            </div>
            <div className="table-actions">
              <div className="search-box">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search vehicles..." 
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    
                    if (!searchTerm) {
                      const allVehicles = Object.keys(groupedPenalties).map(vehicleId => ({
                        vehicleId,
                        ...groupedPenalties[vehicleId]
                      }));
                      setFilteredPenalties(allVehicles);
                      setCurrentPage(1);
                      return;
                    }

                    const filtered = Object.keys(groupedPenalties)
                      .filter(vehicleId => {
                        const vehicle = groupedPenalties[vehicleId]?.vehicle;
                        if (!vehicle) return false;
                        
                        const vehicleIdMatch = vehicle.vehicle_id?.toLowerCase().includes(searchTerm) ?? false;
                        const regNumberMatch = vehicle.registration_number?.toLowerCase().includes(searchTerm) ?? false;
                        const ownerMatch = vehicle.owner?.toLowerCase().includes(searchTerm) ?? false;
                        
                        return vehicleIdMatch || regNumberMatch || ownerMatch;
                      })
                      .map(vehicleId => ({
                        vehicleId,
                        ...groupedPenalties[vehicleId]
                      }));

                    setFilteredPenalties(filtered);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          
          <table className="penalties-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Owner</th>
                <th>Total Penalties</th>
                <th>Total Overload (kg)</th>
                <th>Total Amount (TZS)</th>
                <th>Unpaid Amount (TZS)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map(({ vehicleId, vehicle, count, totalAmount, unpaidAmount, totalOverload, penalties, paidCount }) => (
                  <tr key={vehicleId} className="vehicle-summary-row">
                    <td>
                      <div className="vehicle-info">
                        <Link to={`/vehicle-management/${vehicle?.id}`} className="vehicle-link">
                          {vehicle?.vehicle_id || 'N/A'} ({vehicle?.vehicle_name || 'N/A'})
                        </Link>
                        {/* <span className="registration">{vehicle?.owner || 'N/A'}</span> */}
                      </div>
                    </td>
                    <td>{vehicle?.owner || 'N/A'}</td>
                    <td>
                      <div className="penalty-count">
                        <span className="total-count">{count}</span>
                        {paidCount > 0 && (
                          <span className="paid-count">({paidCount} paid)</span>
                        )}
                      </div>
                    </td>
                    <td>{formatNumber(totalOverload)}</td>
                    <td>{formatNumber(totalAmount)}</td>
                    <td className={unpaidAmount > 0 ? 'unpaid-amount' : ''}>
                      {formatNumber(unpaidAmount)}
                    </td>
                    <td>
                    <div className="action-buttons">
  {/* Details button with tooltip */}
                    <div className="tooltip-container">
                      <button 
                        className="action-btn icon-btn"
                        onClick={() => {
                          setSelectedVehicle({
                            vehicleId,
                            vehicle,
                            penalties,
                            totalAmount,
                            unpaidAmount,
                            totalOverload,
                            count,
                            paidCount
                          });
                          setShowDetailsModal(true);
                        }}
                        aria-label="View details"
                      >
                        <FiInfo />
                      </button>
                      <span className="tooltip">View Details</span>
                    </div>

  {/* Pay All button with conditional rendering and tooltip */}
                      {unpaidAmount > 0 && (
                        <div className="tooltip-container">
                          <button 
                            className="action-btn icon-btn pay-btn"
                            onClick={() => {
                              const ref = prompt('Enter payment reference number for all unpaid penalties:');
                              if (ref !== null) {
                                penalties.forEach(penalty => {
                                  if (!penalty.paid) {
                                    markAsPaid(penalty.id, ref);
                                  }
                                });
                              }
                            }}
                            aria-label="Pay all penalties"
                          >
                            <FiDollarSign />
                          </button>
                          <span className="tooltip">Pay All ({unpaidAmount})</span>
                        </div>
                      )}
                    </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No vehicle records found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Penalty Details Modal */}
          {showDetailsModal && selectedVehicle && (
            <div className="penalty-details-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>
                    Penalty Details for {selectedVehicle.vehicle?.vehicle_id || 'N/A'}
                    <span className="registration">{selectedVehicle.vehicle?.registration_number || 'N/A'}</span>
                  </h3>
                  <button 
                    className="close-modal"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <div className="vehicle-summary">
                    <div className="summary-item">
                      <span className="label">Total Penalties:</span>
                      <span className="value">{selectedVehicle.count}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Total Amount:</span>
                      <span className="value">{formatNumber(selectedVehicle.totalAmount)} TZS</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Unpaid Amount:</span>
                      <span className="value unpaid">{formatNumber(selectedVehicle.unpaidAmount)} TZS</span>
                    </div>
                  </div>
                  <table className="penalty-details-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Overload (kg)</th>
                        <th>Amount (TZS)</th>
                        <th>Status</th>
                        <th>Reference</th>
                        <th className="no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVehicle.penalties.map(penalty => (
                        <tr key={penalty.id} className={penalty.paid ? 'paid-penalty' : 'unpaid-penalty'}>
                          <td>
                            {penalty.timestamp
                              ? new Date(penalty.timestamp).toLocaleDateString()
                              : 'N/A'}
                            <div className="time-text">
                              {penalty.timestamp
                                ? new Date(penalty.timestamp).toLocaleTimeString()
                                : ''}
                            </div>
                          </td>
                          <td>{formatNumber(penalty.overload_amount)}</td>
                          <td>{formatNumber(penalty.amount)}</td>
                          <td>
                            <span className={`status-badge ${penalty.status}`}>
                              {penalty.status || 'N/A'}
                              {penalty.paid && penalty.status === 'paid' && ' ✓'}
                            </span>
                          </td>
                          <td>{penalty.reference_number || 'N/A'}</td>
                          <td className="no-print">
                            <div className="action-buttons">
                              <button 
                                className="action-btn status-btn"
                                onClick={() => {
                                  const newStatus = prompt(
                                    'Update status (paid/unpaid/disputed/waived):', 
                                    penalty.status
                                  );
                                  if (newStatus && ['paid','unpaid','disputed','waived'].includes(newStatus)) {
                                    updatePenaltyStatus(penalty.id, newStatus);
                                    setShowDetailsModal(false);
                                  }
                                }}
                              >
                                <FiEdit /> Status
                              </button>
                              {!penalty.paid && (
                                <button 
                                  className="action-btn pay-btn"
                                  onClick={() => {
                                    const ref = prompt('Enter payment reference number:');
                                    if (ref !== null) {
                                      markAsPaid(penalty.id, ref);
                                      setShowDetailsModal(false);
                                    }
                                  }}
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer">
                  <button 
                    className="modal-close-btn"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
  <div className="pagination-container no-print">
    <div className="pagination-controls">
      <button 
        className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
      >
        &lt; Previous
      </button>
      
      <div className="page-numbers">
        {/* Always show first page */}
        {totalPages > 0 && (
          <button
            className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
        )}

        {/* Show ellipsis if current page is far from start */}
        {currentPage > 3 && totalPages > 5 && (
          <span className="ellipsis">...</span>
        )}

        {/* Middle pages */}
        {Array.from({ length: Math.min(5, totalPages - 2) }, (_, i) => {
          let pageNum;
          if (currentPage <= 3) {
            pageNum = i + 2;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 1 + i;
          }

          if (pageNum > 1 && pageNum < totalPages) {
            return (
              <button
                key={pageNum}
                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          }
          return null;
        })}

        {/* Show ellipsis if current page is far from end */}
        {currentPage < totalPages - 2 && totalPages > 5 && (
          <span className="ellipsis">...</span>
        )}

        {/* Always show last page if there's more than 1 page */}
        {totalPages > 1 && (
          <button
            className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </button>
        )}
      </div>
      
      <button 
        className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        Next &gt;
      </button>
    </div>
  </div>
)}
        </div>
      </div>

      {/* Modal CSS */}
      <style jsx>{`
        .penalty-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .modal-header .registration {
          font-size: 0.9em;
          color: #666;
          font-weight: normal;
        }
        
        .close-modal {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex-grow: 1;
        }
        
        .vehicle-summary {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
        }
        
        .summary-item .label {
          font-size: 0.9em;
          color: #666;
        }
        
        .summary-item .value {
          font-weight: bold;
        }
        
        .summary-item .value.unpaid {
          color: #dc3545;
        }
        
        .penalty-details-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .penalty-details-table th {
          background-color: #f8f9fa;
          padding: 10px;
          text-align: left;
        }
        
        .penalty-details-table td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
        }
        
        .modal-close-btn {
          padding: 8px 16px;
          background-color:#e67e22;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
          /* Action buttons container */
.action-buttons {
  display: flex;
  gap: 8px;
}

/* Base button styles */
.action-btn {
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icon button style */
.icon-btn {
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  color: #555;
}

.icon-btn:hover {
 background-color: rgba(155, 89, 182, 0.1);
    color: #9b59b6;
}

/* Pay button specific style */
.pay-btn {
  color: #fff;
  background: #4CAF50;
}

.pay-btn:hover {
  background: #3e8e41;
}

/* Tooltip container */
.tooltip-container {
  position: relative;
  display: inline-block;
}

/* Tooltip text */
.tooltip {
  visibility: hidden;
  width: 120px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 14px;
}

/* Show tooltip on hover */
.tooltip-container:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

/* Optional: Add arrow to tooltip */
.tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}
  /* Pagination container */
.pagination-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  width: 100%;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Page numbers container */
.page-numbers {
  display: flex;
  gap: 5px;
}

/* Base button styles */
.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: #fff;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  text-align: center;
}

.pagination-btn:hover:not(.disabled) {
  background-color: #f0f0f0;
}

/* Active page button */
.pagination-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

/* Disabled buttons */
.pagination-btn.disabled {
  color: #aaa;
  cursor: not-allowed;
  background-color: #f8f8f8;
}

/* Ellipsis styling */
.ellipsis {
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: #666;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .pagination-btn {
    padding: 6px 8px;
    min-width: 30px;
  }
  
  .pagination-controls {
    gap: 3px;
  }
}
        
        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
          }
          
          .vehicle-summary {
            flex-direction: column;
            gap: 10px;
          }
          
          .penalty-details-table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default PenaltyManagement;