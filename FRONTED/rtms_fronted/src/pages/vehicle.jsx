import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiTruck, FiUser, FiPlus, FiEdit2, FiTrash2, FiSearch, 
  FiAlertTriangle, FiPieChart, FiSettings, FiLogOut, 
  FiDownload, FiUpload, FiCalendar, FiClock, FiCheck, FiX,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import { CSVLink } from 'react-csv';
import { PDFDownloadLink } from '@react-pdf/renderer';
import VehiclePDFReport from './VehiclePDFReport';
import '../css/VehicleManagement.css';
import axios from 'axios';

function VehicleManagement() {
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    maxWeight: '',
    type: 'Truck',
    driver: '',
    owner:'',
    status: 'active',
    photo: null
  });
  const [maintenanceData, setMaintenanceData] = useState({
    vehicleId: '',
    type: 'routine',
    date: '',
    description: '',
    cost: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [historyView, setHistoryView] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 8,
    totalItems: 0,
    totalPages: 1
  });

  const API_URL = 'http://localhost:8000/api/vehicles/';

  // Fetch vehicles from the backend with pagination
  const fetchVehicles = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}?page=${page}&page_size=${pageSize}`);
      
      // Check if response.data exists and has the expected structure
      if (!response.data) {
        throw new Error('Invalid API response structure');
      }
  
      // Handle different possible response structures
      const responseData = response.data.results || response.data;
      const totalCount = response.data.count || response.data.length || 0;
  
      // Ensure responseData is an array before mapping
      const vehiclesArray = Array.isArray(responseData) ? responseData : [responseData];
      
      // Map backend data to frontend expected format
      const mappedVehicles = vehiclesArray.map(vehicle => ({
        id: vehicle.id,
        plate: vehicle.vehicle_id || 'N/A',
        type: vehicle.description || 'Truck',
        maxWeight: vehicle.max_allowed_weight || 0,
        driver:vehicle.driver || 'unknown Driver',
        owner: vehicle.owner || 'Unknown Owner',
        status: vehicle.status || 'active',
        lastService: vehicle.last_report_generated || 'Never',
        lastReportedWeight: vehicle.last_reported_weight || 0,
        weightAlert: vehicle.weight_alert || false,
        photoUrl: vehicle.vehicle_image || null,
        history: vehicle.alert_history || []
      }));
      
      setVehicles(mappedVehicles);
      setPagination({
        currentPage: page,
        pageSize: pageSize,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      });
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      // Optionally set empty array if there's an error
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };
  

  // Initial fetch and when pagination changes
  useEffect(() => {
    fetchVehicles(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage, pagination.pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPagination(prev => ({ ...prev, pageSize: newSize, currentPage: 1 }));
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles?.filter(vehicle => {
    const plate = vehicle.plate?.toLowerCase() || '';
    const type = vehicle.type?.toLowerCase() || '';
    const driver = vehicle.driver?.toLowerCase() || '';
  
    return (
      plate.includes(searchTerm.toLowerCase()) || 
      type.includes(searchTerm.toLowerCase()) ||
      driver.includes(searchTerm.toLowerCase())
    );
  });

  // Handle file upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVehicle(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Vehicle CRUD operations
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVehicle(prev => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setNewVehicle({
      plate: '',
      maxWeight: '',
      type: 'Truck',
      driver: '',
      status: 'active',
      photo: null
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}${editingId}/`, newVehicle);
      } else {
        await axios.post(API_URL, newVehicle);
      }
      fetchVehicles(pagination.currentPage, pagination.pageSize);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await axios.delete(`${API_URL}${id}/`);
        fetchVehicles(pagination.currentPage, pagination.pageSize);
      } catch (error) {
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  const handleMaintenanceSubmit = (e) => {
    e.preventDefault();
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === maintenanceData.vehicleId) {
        const newHistory = {
          date: maintenanceData.date,
          event: `${maintenanceData.type} maintenance`,
          details: maintenanceData.description,
          cost: maintenanceData.cost
        };
        return {
          ...vehicle,
          lastService: maintenanceData.date,
          history: [newHistory, ...vehicle.history]
        };
      }
      return vehicle;
    });
    setVehicles(updatedVehicles);
    setShowMaintenanceModal(false);
    setMaintenanceData({
      vehicleId: '',
      type: 'routine',
      date: '',
      description: '',
      cost: ''
    });
  };

  // Bulk actions
  const toggleVehicleSelection = (id) => {
    setSelectedVehicles(prev => 
      prev.includes(id) 
        ? prev.filter(vehicleId => vehicleId !== id) 
        : [...prev, id]
    );
  };

  const handleBulkStatusChange = (status) => {
    setVehicles(vehicles.map(vehicle => 
      selectedVehicles.includes(vehicle.id) 
        ? { ...vehicle, status } 
        : vehicle
    ));
    setSelectedVehicles([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedVehicles.length} vehicles?`)) {
      setVehicles(vehicles.filter(v => !selectedVehicles.includes(v.id)));
      setSelectedVehicles([]);
      setShowBulkActions(false);
    }
  };

  // CSV data preparation
  const csvData = [
    ['Plate Number', 'Type', 'Max Weight', 'Driver', 'Status', 'Last Service'],
    ...vehicles.map(vehicle => [
      vehicle.plate,
      vehicle.type,
      vehicle.maxWeight,
      vehicle.driver,
      vehicle.status,
      vehicle.lastService
    ])
  ];

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
            <li className="active">
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
      <div className="main-content">
        <header className="content-header">
          <h1>Vehicle Management</h1>
          <div className="actions">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="action-buttons">
              <button className="add-btn" onClick={() => setShowModal(true)}>
                <FiPlus /> Add Vehicle
              </button>
              <div className="export-buttons">
                <CSVLink 
                  data={csvData} 
                  filename="vehicles.csv" 
                  className="export-btn csv"
                >
                  <FiDownload /> CSV
                </CSVLink>
                <PDFDownloadLink
                  document={<VehiclePDFReport vehicles={vehicles} />}
                  fileName="vehicles.pdf"
                  className="export-btn pdf"
                >
                  {({ loading }) => (
                    loading ? 'Loading...' : <><FiDownload /> PDF</>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        {selectedVehicles.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="selected-count">
              {selectedVehicles.length} selected
            </div>
            <div className="bulk-actions">
              <button 
                className="bulk-btn active"
                onClick={() => handleBulkStatusChange('active')}
              >
                <FiCheck /> Set Active
              </button>
              <button 
                className="bulk-btn inactive"
                onClick={() => handleBulkStatusChange('inactive')}
              >
                <FiX /> Set Inactive
              </button>
              <button 
                className="bulk-btn delete"
                onClick={handleBulkDelete}
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Vehicle Table */}
        <div className="vehicle-grid">
          {loading ? (
            <div className="loading-spinner">
              <p>Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length > 0 ? (
            <>
              <table className="vehicle-table">
                <thead>
                  <tr>
                    <th width="50px"></th>
                    <th>Plate Number</th>
                    <th>Type</th>
                    <th>Max Weight (kg)</th>
                    <th>Owner</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Last Service</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(vehicle => (
                    <tr key={vehicle.id} className={vehicle.status}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedVehicles.includes(vehicle.id)}
                          onChange={() => toggleVehicleSelection(vehicle.id)}
                        />
                      </td>
                      <td>
                        {vehicle.photoUrl && (
                          <img 
                            src={vehicle.photoUrl} 
                            alt={vehicle.plate} 
                            className="vehicle-thumbnail"
                          />
                        )}
                        {vehicle.plate}
                      </td>
                      <td>{vehicle.type}</td>
                      <td>{vehicle.maxWeight ? vehicle.maxWeight.toLocaleString() : 'N/A'}</td>
                      <td>
                        <FiUser className="user-icon" /> {vehicle.owner}
                      </td>
                      <td>
                        <FiUser className="user-icon" /> {vehicle.driver}
                      </td>
                      <td>
                        <span className={`status-badge ${vehicle.status}`}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td>{vehicle.lastService}</td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn maintenance"
                          onClick={() => {
                            setMaintenanceData(prev => ({ ...prev, vehicleId: vehicle.id }));
                            setShowMaintenanceModal(true);
                          }}
                          title="Schedule Maintenance"
                        >
                          <FiCalendar />
                        </button>
                        <button 
                          className="action-btn history"
                          onClick={() => setHistoryView(vehicle)}
                          title="View History"
                        >
                          <FiClock />
                        </button>
                        <button 
                          className="action-btn edit"
                          onClick={() => {
                            setNewVehicle(vehicle);
                            setEditingId(vehicle.id);
                            setShowModal(true);
                          }}
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDelete(vehicle.id)}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              <div className="pagination-controls">
                <div className="page-size-selector">
                  <span>Items per page:</span>
                  <select 
                    value={pagination.pageSize} 
                    onChange={handlePageSizeChange}
                  >
                    <option value="5">5</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
                
                <div className="page-navigation">
                  <button 
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                  >
                    <FiChevronsLeft />
                  </button>
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    <FiChevronLeft />
                  </button>
                  
                  <span className="page-info">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <FiChevronRight />
                  </button>
                  <button 
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <FiChevronsRight />
                  </button>
                </div>
                
                <div className="total-items">
                  Total Vehicles: {pagination.totalItems}
                </div>
              </div>
            </>
          ) : (
            <div className="no-vehicles">
              <p>No vehicles found. Add a new vehicle to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Plate Number *</label>
                  <input
                    type="text"
                    name="plate"
                    value={newVehicle.plate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Weight (kg) *</label>
                  <input
                    type="number"
                    name="maxWeight"
                    value={newVehicle.maxWeight}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Type *</label>
                  <select
                    name="type"
                    value={newVehicle.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Truck">Truck</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Van">Van</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={newVehicle.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className='form-row'>

              <div className="form-group">
                <label>Driver Name *</label>
                <input
                  type="text"
                  name="driver"
                  value={newVehicle.driver}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner *</label>
                <input
                  type="text"
                  name="driver"
                  value={newVehicle.driver}
                  onChange={handleInputChange}
                  required
                />
              </div>
                 
              </div>
              
              <div className="form-group">
                <label>Vehicle Photo</label>
                <div className="photo-upload">
                  {newVehicle.photo ? (
                    <div className="photo-preview">
                      <img src={newVehicle.photo} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-photo"
                        onClick={() => setNewVehicle(prev => ({ ...prev, photo: null }))}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="upload-area"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FiUpload className="upload-icon" />
                      <p>Click to upload photo</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingId ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Schedule Maintenance</h2>
            <form onSubmit={handleMaintenanceSubmit}>
              <div className="form-group">
                <label>Vehicle</label>
                <select
                  name="vehicleId"
                  value={maintenanceData.vehicleId}
                  onChange={handleMaintenanceChange}
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.driver}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Maintenance Type *</label>
                  <select
                    name="type"
                    value={maintenanceData.type}
                    onChange={handleMaintenanceChange}
                    required
                  >
                    <option value="routine">Routine</option>
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={maintenanceData.date}
                    onChange={handleMaintenanceChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={maintenanceData.description}
                  onChange={handleMaintenanceChange}
                  required
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={maintenanceData.cost}
                  onChange={handleMaintenanceChange}
                  placeholder="Enter cost if applicable"
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowMaintenanceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Schedule Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History View Modal */}
      {historyView && (
        <div className="modal-overlay">
          <div className="modal history-modal">
            <div className="modal-header">
              <h2>Vehicle History - {historyView.plate}</h2>
              <button className="close-btn" onClick={() => setHistoryView(null)}>
                &times;
              </button>
            </div>
            <div className="history-content">
              <div className="vehicle-info">
                {historyView.photoUrl && (
                  <img src={historyView.photoUrl} alt={historyView.plate} className="vehicle-photo" />
                )}
                <div className="info-details">
                  <h3>{historyView.plate}</h3>
                  <p><strong>Type:</strong> {historyView.type}</p>
                  <p><strong>Driver:</strong> {historyView.driver}</p>
                  <p><strong>Max Weight:</strong> {historyView.maxWeight} kg</p>
                </div>
              </div>
              
              <div className="history-timeline">
                <h3>Maintenance History</h3>
                {historyView.history && historyView.history.length > 0 ? (
                  <ul>
                    {historyView.history.map((item, index) => (
                      <li key={index} className="history-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="event-date">{item.date}</span>
                            <span className={`event-type ${item.event.toLowerCase().includes('routine') ? 'routine' : ''}`}>
                              {item.event}
                            </span>
                            {item.cost && (
                              <span className="event-cost">${item.cost}</span>
                            )}
                          </div>
                          <p className="event-details">{item.details}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-history">No maintenance history recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleManagement;