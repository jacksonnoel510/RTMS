import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiTruck, FiDollarSign, FiAlertTriangle, FiPieChart, 
  FiSettings, FiLogOut, FiCalendar, FiClock, FiRefreshCw,
  FiBarChart2, FiFilter, FiSearch, FiDownload, FiInfo, FiPrinter, FiEdit
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
  
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num !== 'number') return num;
    return num.toLocaleString();
  };

  // Fetch penalties from backend
  const fetchPenalties = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log(token)
      if (!token) {
        navigate('/login');
        return;
      }

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
      console.log(response)
      const data = Array.isArray(response?.data) ? response.data : [];
      setPenalties(data);
      setFilteredPenalties(data);
    } catch (error) {
      console.error('Error fetching penalties:', error);
      toast.error('Failed to load penalty data');
      setPenalties([]);
      setFilteredPenalties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!Array.isArray(filteredPenalties)) return 0;
    return filteredPenalties.reduce((total, penalty) => {
      const amount = penalty?.amount || 0;
      return total + amount;
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
      
      // Update local state
      const updatedPenalties = penalties.map(p => 
        p.id === penaltyId ? { ...p, paid: true, status: 'paid' } : p
      );
      setPenalties(updatedPenalties);
      setFilteredPenalties(updatedPenalties);
      
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
      
      // Update local state
      const updatedPenalties = penalties.map(p => 
        p.id === penaltyId ? { 
          ...p, 
          status: newStatus,
          paid: newStatus === 'paid' 
        } : p
      );
      setPenalties(updatedPenalties);
      setFilteredPenalties(updatedPenalties);
      
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
    ['Vehicle ID', 'Registration', 'Overload (kg)', 'Violation Date', 'Amount (TZS)', 'Status', 'Paid', 'Reference'],
    ...filteredPenalties.map(penalty => [
      penalty.vehicle?.vehicle_id || 'N/A',
      penalty.vehicle?.registration_number || 'N/A',
      penalty.overload_amount || 'N/A',
      penalty.timestamp ? new Date(penalty.timestamp).toLocaleDateString() : 'N/A',
      penalty.amount || 'N/A',
      penalty.status || 'N/A',
      penalty.paid ? 'Yes' : 'No',
      penalty.reference_number || 'N/A'
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
                  value={penaltyRate.amount}
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
              <div className="card-label">Total Violations</div>
              <div className="card-trend">
                {penalties.length > 0 && (
                  <span>{Math.round((filteredPenalties.length / penalties.length) * 100)}% of total</span>
                )}
              </div>
            </div>
            <div className="summary-card">
              <div className="card-value">{calculateTotal()?.toLocaleString() || '0'} TZS</div>
              <div className="card-label">Total Penalties</div>
              <div className="card-trend">
                {penalties.length > 0 && (
                  <span>
                    {Math.round((filteredPenalties.reduce((t, p) => t + (p?.amount || 0), 0) / 
                      penalties.reduce((t, p) => t + (p?.amount || 0), 0)) * 100)}% of total
                  </span>
                )}
              </div>
            </div>
            <div className="summary-card">
              <div className="card-value">
                {filteredPenalties.filter(p => p?.paid).length}
              </div>
              <div className="card-label">Paid Penalties</div>
              <div className="card-trend">
                {filteredPenalties.length > 0 && (
                  <span>
                    {Math.round((filteredPenalties.filter(p => p?.paid).length / 
                      filteredPenalties.length) * 100)}% paid
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
              Showing {paginatedData.length} of {filteredPenalties.length} records
            </div>
            <div className="table-actions">
              <div className="search-box">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search in results..." 
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    setFilteredPenalties(
                      penalties.filter(p => 
                        p.vehicle?.vehicle_id?.toLowerCase().includes(searchTerm) ||
                        (p.vehicle?.registration_number && p.vehicle.registration_number.toLowerCase().includes(searchTerm)) ||
                        (p.overload_amount?.toString().includes(searchTerm)) ||
                        (p.amount?.toString().includes(searchTerm)) ||
                        p.status?.toLowerCase().includes(searchTerm)
                      )
                    );
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          
          <table className="penalties-table">
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Registration</th>
                <th>Overload (kg)</th>
                <th>Violation Date</th>
                <th>Amount (TZS)</th>
                <th>Status</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((penalty) => (
                  <tr key={penalty.id}>
                    <td>
                      <Link to={`/vehicle-management/${penalty.vehicle?.id}`} className="vehicle-link">
                        {penalty.vehicle?.vehicle_id || 'N/A'}
                      </Link>
                    </td>
                    <td>{penalty.vehicle?.registration_number || 'N/A'}</td>

                    <td className={penalty.overload_amount > 1000 ? 'severe-overload' : ''}>
                      {typeof penalty.overload_amount === 'number'
                        ? penalty.overload_amount.toLocaleString()
                        : 'N/A'}
                    </td>

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

                    <td>
                      {typeof penalty.amount === 'number'
                        ? penalty.amount.toLocaleString()
                        : 'N/A'}
                    </td>

                    <td>
                      <span className={`status-badge ${penalty.status}`}>
                        {penalty.status || 'N/A'}
                        {penalty.paid && penalty.status === 'paid' && ' ✓'}
                      </span>
                    </td>

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
                              }
                            }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No penalty records found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls no-print">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={currentPage === pageNum ? 'active' : ''}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="ellipsis">...</span>
                )}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PenaltyManagement;