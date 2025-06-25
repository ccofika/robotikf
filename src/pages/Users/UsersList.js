// Kreirati u direktorijumu: src/pages/Users/UsersList.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './UsersModern.css';
import { SearchIcon, UserIcon, PhoneIcon, MapPinIcon, ClipboardIcon, CloseIcon, RefreshIcon } from '../../components/icons/SvgIcons';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userWorkOrders, setUserWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${apiUrl}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju korisnika:', error);
      setError('Greška pri učitavanju korisnika. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje korisnika!');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    if (selectedUser) {
      await fetchUserWorkOrders(selectedUser._id);
    }
    setIsRefreshing(false);
    toast.success('Podaci su osveženi!');
  };
  
  const fetchUserWorkOrders = async (userId) => {
    setLoadingWorkOrders(true);
    try {
      const response = await axios.get(`${apiUrl}/api/users/${userId}/workorders`);
      setUserWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga korisnika:', error);
      toast.error('Neuspešno učitavanje radnih naloga korisnika!');
    } finally {
      setLoadingWorkOrders(false);
    }
  };
  
  const handleUserSelect = (user) => {
    if (selectedUser && selectedUser._id === user._id) {
      setSelectedUser(null);
      setUserWorkOrders([]);
    } else {
      setSelectedUser(user);
      fetchUserWorkOrders(user._id);
    }
  };
  
  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
  };
  
  // Filtriranje korisnika
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchTermLower) ||
      user.address.toLowerCase().includes(searchTermLower) ||
      user.phone.toLowerCase().includes(searchTermLower) ||
      user.tisId.toString().includes(searchTerm)
    );
  });
  
  // Formatiranje datuma
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };
  
  // Formatiranje statusa
  const getStatusLabel = (status) => {
    switch (status) {
      case 'zavrsen': return 'Završen';
      case 'nezavrsen': return 'Nezavršen';
      case 'odlozen': return 'Odložen';
      case 'otkazan': return 'Otkazan';
      default: return status;
    }
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'zavrsen': return 'status-completed';
      case 'nezavrsen': return 'status-pending';
      case 'odlozen': return 'status-postponed';
      case 'otkazan': return 'status-canceled';
      default: return '';
    }
  };
  
  return (
    <div className="users-container fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <UserIcon className="icon" />
          Korisnici
        </h1>
        <button 
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={isRefreshing}
          title="Osvežiti listu"
        >
          <RefreshIcon className={`icon ${isRefreshing ? 'spinning' : ''}`} />
        </button>
      </div>
      
      <div className="search-container">
        <div className="search-box">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Pretraga po imenu, adresi, telefonu ili TIS ID-u..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {searchTerm && (
            <CloseIcon 
              className="clear-search" 
              onClick={() => setSearchTerm('')}
              title="Obriši pretragu"
            />
          )}
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="users-grid">
        {loading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Učitavanje korisnika...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-results">
            <p>Nema pronađenih korisnika</p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div 
              key={user._id} 
              className={`user-card ${selectedUser?._id === user._id ? 'selected' : ''}`}
              onClick={() => handleUserSelect(user)}
            >
              <div className="user-card-header">
                <div className="user-icon">
                  <UserIcon />
                </div>
                <div className="user-name">{user.name}</div>
              </div>
              <div className="user-card-body">
                <div className="user-detail">
                  <MapPinIcon className="user-detail-icon" />
                  <span className="user-detail-text">{user.address}</span>
                </div>
                <div className="user-detail">
                  <PhoneIcon className="user-detail-icon" />
                  <span className="user-detail-text">{user.phone || 'Nije dostupan'}</span>
                </div>
                <div className="user-detail">
                  <ClipboardIcon className="user-detail-icon" />
                  <span className="user-detail-text">Radni nalozi: {user.workOrders?.length || 0}</span>
                </div>
              </div>
              <div className="user-card-footer">
                <div className="tis-id">TIS ID: {user.tisId}</div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {selectedUser && (
        <div className="user-workorders-container">
          <div className="user-workorders-header">
            <h2>Radni nalozi korisnika: {selectedUser.name}</h2>
            <button 
              className="btn-close" 
              onClick={() => { setSelectedUser(null); setUserWorkOrders([]); }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="user-workorders-body">
            {loadingWorkOrders ? (
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Učitavanje radnih naloga...</p>
              </div>
            ) : userWorkOrders.length === 0 ? (
              <div className="no-results">
                <p>Nema radnih naloga za ovog korisnika</p>
              </div>
            ) : (
              <div className="workorders-table-container">
                <table className="workorders-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Tip</th>
                      <th>Tehničar</th>
                      <th>Status</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userWorkOrders.map(order => (
                      <tr key={order._id}>
                        <td>{formatDate(order.date)}</td>
                        <td>{order.type}</td>
                        <td>{order.technicianId?.name || 'Nedodeljen'}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>
                          <Link to={`/work-orders/${order._id}`} className="btn btn-sm btn-view">
                            Detalji
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;