import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BoxIcon, ToolsIcon, UsersIcon, ClipboardIcon, CheckCircleIcon, ClockIcon, TrendingUpIcon, BarChartIcon } from '../../components/icons/SvgIcons';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    equipment: 0,
    materials: 0,
    technicians: 0,
    workOrders: {
      total: 0,
      completed: 0,
      pending: 0,
      postponed: 0
    }
  });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        
        // Prikupljanje podataka sa različitih endpointa
        const [equipment, materials, technicians, workOrderStats] = await Promise.all([
          axios.get(`${apiUrl}/api/equipment`),
          axios.get(`${apiUrl}/api/materials`),
          axios.get(`${apiUrl}/api/technicians`),
          axios.get(`${apiUrl}/api/workorders/statistics/summary`)
        ]);
        
        setStats({
          equipment: equipment.data.length,
          materials: materials.data.length,
          technicians: technicians.data.length,
          workOrders: {
            total: workOrderStats.data.total,
            completed: workOrderStats.data.completed,
            pending: workOrderStats.data.pending,
            postponed: workOrderStats.data.postponed
          }
        });
      } catch (error) {
        console.error('Greška pri učitavanju dashboard podataka:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Učitavanje dashboard podataka...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Pregled sistemskih informacija i ključnih metrika</p>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card" tabIndex="0">
          <div className="stat-icon equipment-icon">
            <BoxIcon />
          </div>
          <div className="stat-content">
            <h3>Oprema</h3>
            <p className="stat-value">{stats.equipment.toLocaleString()}</p>
            <Link to="/equipment" className="stat-link">
              Prikaži sve
            </Link>
          </div>
        </div>
        
        <div className="stat-card" tabIndex="0">
          <div className="stat-icon materials-icon">
            <ToolsIcon />
          </div>
          <div className="stat-content">
            <h3>Materijali</h3>
            <p className="stat-value">{stats.materials.toLocaleString()}</p>
            <Link to="/materials" className="stat-link">
              Prikaži sve
            </Link>
          </div>
        </div>
        
        <div className="stat-card" tabIndex="0">
          <div className="stat-icon technicians-icon">
            <UsersIcon />
          </div>
          <div className="stat-content">
            <h3>Tehničari</h3>
            <p className="stat-value">{stats.technicians.toLocaleString()}</p>
            <Link to="/technicians" className="stat-link">
              Prikaži sve
            </Link>
          </div>
        </div>
        
        <div className="stat-card" tabIndex="0">
          <div className="stat-icon workorders-icon">
            <ClipboardIcon />
          </div>
          <div className="stat-content">
            <h3>Radni nalozi</h3>
            <p className="stat-value">{stats.workOrders.total.toLocaleString()}</p>
            <Link to="/work-orders" className="stat-link">
              Prikaži sve
            </Link>
          </div>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h2 className="section-title">Status radnih naloga</h2>
          <div className="work-order-stats">
            <div className="work-order-stat">
              <div className="wo-icon completed">
                <CheckCircleIcon />
              </div>
              <div className="wo-stat-content">
                <h4>Završeni</h4>
                <p>{stats.workOrders.completed.toLocaleString()}</p>
              </div>
              <div className="stat-percentage">
                {stats.workOrders.total > 0 && 
                  <span className="percentage-value">
                    {Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)}%
                  </span>
                }
              </div>
            </div>
            
            <div className="work-order-stat">
              <div className="wo-icon pending">
                <ClockIcon />
              </div>
              <div className="wo-stat-content">
                <h4>U toku</h4>
                <p>{stats.workOrders.pending.toLocaleString()}</p>
              </div>
              <div className="stat-percentage">
                {stats.workOrders.total > 0 && 
                  <span className="percentage-value">
                    {Math.round((stats.workOrders.pending / stats.workOrders.total) * 100)}%
                  </span>
                }
              </div>
            </div>
            
            <div className="work-order-stat">
              <div className="wo-icon postponed">
                <ClockIcon />
              </div>
              <div className="wo-stat-content">
                <h4>Odloženi</h4>
                <p>{stats.workOrders.postponed.toLocaleString()}</p>
              </div>
              <div className="stat-percentage">
                {stats.workOrders.total > 0 && 
                  <span className="percentage-value">
                    {Math.round((stats.workOrders.postponed / stats.workOrders.total) * 100)}%
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-section">
          <h2 className="section-title">Brze akcije</h2>
          <div className="quick-links">
            <Link to="/work-orders/add" className="quick-link">
              <ClipboardIcon />
              <span>Novi radni nalog</span>
            </Link>
            
            <Link to="/equipment/upload" className="quick-link">
              <BoxIcon />
              <span>Dodaj opremu</span>
            </Link>
            
            <Link to="/materials/add" className="quick-link">
              <ToolsIcon />
              <span>Dodaj materijal</span>
            </Link>
            
            <Link to="/technicians/add" className="quick-link">
              <UsersIcon />
              <span>Dodaj tehničara</span>
            </Link>
          </div>
          
          <div className="section-footer">
            <Link to="/reports" className="view-all-link">
              <BarChartIcon />
              <span>Pogledaj sve izveštaje</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;