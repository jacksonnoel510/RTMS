import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_name: '',
    vehicle_image: null,
    vehicle_id: '',
    description: '',
    driver: '',
    owner: '',
    max_allowed_weight: '',
    status: 'active',
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
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  });

  const API_URL = 'http://localhost:8000/api/vehicles/';

  // Fetch vehicles with pagination
  const fetchVehicles = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}?page=${page}&page_size=${pageSize}`);
      
      if (!response.data) {
        throw new Error('Invalid API response structure');
      }
  
      const responseData = response.data.results || response.data;
      const totalCount = response.data.count || response.data.length || 0;
  
      const vehiclesArray = Array.isArray(responseData) ? responseData : [responseData];
      const mappedVehicles = vehiclesArray.map(vehicle => ({
        id: vehicle.id || '',
        vehicle_name: vehicle.vehicle_name || '',
        plate: vehicle.vehicle_id || 'N/A',
        type: vehicle.description || 'Truck',
        maxWeight: vehicle.max_allowed_weight || 0,
        driver: vehicle.driver || 'Unknown Driver',
        owner: vehicle.owner || 'Unknown Owner',
        status: vehicle.status || 'active',
        lastService: vehicle.last_report_generated || 'Never',
        photoUrl: vehicle.vehicle_image || null,
        vehicle_image: vehicle.vehicle_image || null
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
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPagination(prev => ({ ...prev, pageSize: newSize, currentPage: 1 }));
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

  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    fetchVehicles(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage, pagination.pageSize]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVehicle(prev => ({ ...prev, [name]: value }));
  };

  // Handle file upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewVehicle(prev => ({ ...prev, vehicle_image: file }));
    }
  };

  // Filter vehicles with proper null checks
  // In your VehicleManagement component, update the filteredVehicles function:

const filteredVehicles = vehicles.filter(vehicle => {
  // Ensure searchTerm is a string
  const searchLower = typeof searchTerm === 'string' ? searchTerm.toLowerCase() : '';
  
  // Safely get and convert vehicle properties to lowercase
  const plate = vehicle?.plate ? String(vehicle.plate).toLowerCase() : '';
  const type = vehicle?.type ? String(vehicle.type).toLowerCase() : '';
  const driver = vehicle?.driver ? String(vehicle.driver).toLowerCase() : '';
  const owner = vehicle?.owner ? String(vehicle.owner).toLowerCase() : '';

  // Check if any property includes the search term
  return (
    plate.includes(searchLower) || 
    type.includes(searchLower) ||
    driver.includes(searchLower) ||
    owner.includes(searchLower)
  );
});

// Also add error boundaries to your routes:
// In your router configuration (likely main.jsx or App.jsx):


  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_first_name');
    localStorage.removeItem('user_last_name');
    localStorage.removeItem('user_email');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      
      formData.append('vehicle_name', newVehicle.vehicle_name);
      formData.append('vehicle_id', newVehicle.vehicle_id);
      formData.append('description', newVehicle.description);
      formData.append('driver', newVehicle.driver);
      formData.append('owner', newVehicle.owner);
      formData.append('max_allowed_weight', newVehicle.max_allowed_weight);
      formData.append('status', newVehicle.status);
      
      if (fileInputRef.current?.files[0]) {
        formData.append('vehicle_image', fileInputRef.current.files[0]);
      } else if (newVehicle.vehicle_image && typeof newVehicle.vehicle_image === 'string') {
        formData.append('vehicle_image', newVehicle.vehicle_image);
      }

      if (editingId) {
        await axios.patch(`${API_URL}${editingId}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post(API_URL, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      fetchVehicles(pagination.currentPage, pagination.pageSize);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert(`Error saving vehicle: ${error.response?.data?.vehicle_image?.[0] || error.message}`);
    }
  };

  const resetForm = () => {
    setNewVehicle({
      vehicle_name: '',
      vehicle_id: '',
      description: '',
      max_allowed_weight: '',
      driver: '',
      owner: '',
      status: 'active',
      vehicle_image: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await axios.delete(`${API_URL}${id}/`);
        fetchVehicles(pagination.currentPage, pagination.pageSize);
      } catch (error) {
        console.error('Error deleting vehicle:', error.response?.data || error.message);
        alert(`Error deleting vehicle: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedVehicles.length} vehicles?`)) {
      try {
        await Promise.all(
          selectedVehicles.map(id => axios.delete(`${API_URL}${id}/`))
        );
        fetchVehicles(pagination.currentPage, pagination.pageSize);
        setSelectedVehicles([]);
        setShowBulkActions(false);
      } catch (error) {
        console.error('Error deleting vehicles:', error.response?.data || error.message);
        alert(`Error deleting vehicles: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleEdit = (vehicle) => {
    setNewVehicle({
      vehicle_name: vehicle.vehicle_name || '',
      vehicle_id: vehicle.vehicle_id || '',
      description: vehicle.description || '',
      max_allowed_weight: vehicle.maxWeight || '',
      driver: vehicle.driver || '',
      owner: vehicle.owner || '',
      status: vehicle.status || 'active',
      vehicle_image: vehicle.vehicle_image || null
    });
    setEditingId(vehicle.id);
    setShowModal(true);
  };

  const toggleVehicleSelection = (id) => {
    setSelectedVehicles(prev => 
      prev.includes(id) 
        ? prev.filter(vehicleId => vehicleId !== id) 
        : [...prev, id]
    );
  };

  const handleBulkStatusChange = (status) => {
    const updatedVehicles = vehicles.map(vehicle => 
      selectedVehicles.includes(vehicle.id) ? { ...vehicle, status } : vehicle
    );
    setVehicles(updatedVehicles);
    setSelectedVehicles([]);
  };

  const csvData = [
    ['Plate Number', 'Type', 'Max Weight', 'Driver', 'Status', 'Last Service'],
    ...vehicles.map(vehicle => [
      vehicle.plate || 'N/A',
      vehicle.type || 'N/A',
      vehicle.maxWeight || 'N/A',
      vehicle.driver || 'N/A',
      vehicle.status || 'N/A',
      vehicle.lastService || 'N/A'
    ])
  ];

  // JSX remains the same as in your original code
  return (
    <div className="vehicle-management-container">
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
                  <Link to="#" onClick={handleLogout}><FiLogOut className="nav-icon" /> Logout</Link>
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
            <div className="form-group">
                  <label>Vehicle Name *</label>
                  <input
                    type="text"
                    name="vehicle_name"
                    value={newVehicle.vehicle_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle ID *</label>
                  <input
                    type="text"
                    name="vehicle_id"
                    value={newVehicle.vehicle_id}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Weight (kg) *</label>
                  <input
                    type="number"
                    name="max_allowed_weight"
                    value={newVehicle.max_allowed_weight}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Description *</label>
                  <input
                    type="text"
                    name="description"
                    value={newVehicle.description}
                    onChange={handleInputChange}
                    required
                  />
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
                  name="owner"
                  value={newVehicle.owner}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
  <label>Vehicle Photo</label>
  <div className="photo-upload">
    {/* Show preview if image exists */}
    {newVehicle.vehicle_image && (
      <div className="photo-preview">
        <img 
          src={typeof newVehicle.vehicle_image === 'string' 
            ? newVehicle.vehicle_image 
            : URL.createObjectURL(newVehicle.vehicle_image)} 
          alt="Vehicle preview" 
          className="vehicle-thumbnail"
        />
        <button
          type="button"
          className="remove-photo"
          onClick={() => {
            setNewVehicle(prev => ({ ...prev, vehicle_image: null }));
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          Remove
        </button>
      </div>
    )}

    {/* File input with visible styling */}
    <label className="file-input-wrapper">
      <FiUpload className="upload-icon" />
      <span>Choose a file</span>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="file-input"
      />
      {newVehicle.vehicle_image && (
        <span className="file-name">
          {newVehicle.vehicle_image.name || 'Selected file'}
        </span>
      )}
    </label>
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