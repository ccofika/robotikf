// Kompletna zamena za fajl: src/components/layout/Sidebar.js
import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChartIcon, 
  BoxIcon, 
  ToolsIcon, 
  ClipboardIcon, 
  HardHatIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CloseIcon,
  UsersIcon,
  ExcelIcon,
  HistoryIcon,
  AlertTriangleIcon
} from '../icons/SvgIcons';
import { AuthContext } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  
  // Proverava da li je mobilni ekran
  const isMobile = () => window.innerWidth <= 768;
  
  useEffect(() => {
    // Postavljamo collapsed stanje na osnovu veličine ekrana
    const handleResize = () => {
      if (isMobile()) {
        setCollapsed(true);
      }
    };
    
    // Inicijalno postavljanje
    handleResize();
    
    // Dodajemo event listener za praćenje promene veličine ekrana
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Toggle sidebar za desktop verziju
  const toggleSidebar = () => {
    if (!isMobile()) {
      setCollapsed(!collapsed);
    }
  };
  
  // Zatvara mobilni meni
  const closeMobileMenu = () => {
    if (isMobile()) {
      setMobileOpen(false);
    }
  };
  
  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Dugme za zatvaranje na mobilnim uređajima */}
        {isMobile() && (
          <button className="close-mobile-menu" onClick={closeMobileMenu} aria-label="Zatvori meni">
            <CloseIcon size={20} />
          </button>
        )}
        
        {/* Dugme za skupljanje/širenje sidebar-a na desktop uređajima */}
        <button className="collapse-btn" onClick={toggleSidebar}>
          {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
        </button>
        
        <nav className="sidebar-nav">
          <ul>
            {user?.role === 'admin' && (
              <>
                <li>
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Dashboard"
                  >
                    <ChartIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Dashboard'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/equipment" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Oprema"
                  >
                    <BoxIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Oprema'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/materials" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Materijali"
                  >
                    <ToolsIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Materijali'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/technicians" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Tehničari"
                  >
                    <HardHatIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Tehničari'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/work-orders" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Radni nalozi"
                  >
                    <ClipboardIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Radni nalozi'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/users" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Korisnici"
                  >
                    <UsersIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Korisnici'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/export" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Export"
                  >
                    <ExcelIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Export'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/logs" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Logovi"
                  >
                    <HistoryIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Logovi'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/defective-equipment" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Neispravna oprema"
                  >
                    <AlertTriangleIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Neispravna oprema'}</span>
                  </NavLink>
                </li>
              </>
              
            )}
            
            {user?.role === 'technician' && (
              <>
                <li>
                  <NavLink 
                    to="/my-work-orders" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Moji radni nalozi"
                  >
                    <ClipboardIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Moji radni nalozi'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/my-equipment" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Moja oprema"
                  >
                    <BoxIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Moja oprema'}</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/my-materials" 
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={closeMobileMenu}
                    data-title="Moji materijali"
                  >
                    <ToolsIcon size={20} /> 
                    <span>{(!collapsed || mobileOpen) && 'Moji materijali'}</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          {(!collapsed || mobileOpen) && (
            <>
              <p>TelCo Inventory System</p>
              <p>v1.2.0</p>
            </>
          )}
        </div>
      </aside>
      
      {/* Overlay za mobilni meni kad je otvoren */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
      )}
    </>
  );
};

export default Sidebar;