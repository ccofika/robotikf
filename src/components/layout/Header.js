import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LogoutIcon, UserIcon, MenuIcon } from '../icons/SvgIcons';
import { AuthContext } from '../../context/AuthContext';
import './Header.css';

const Header = ({ toggleMobileMenu }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="header">
      {/* Mobilno dugme za meni */}
      <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Otvori glavni meni">
        <MenuIcon size={20} />
      </button>
      
      <div className="logo">
        <Link to={user?.role === 'admin' ? '/' : '/my-work-orders'}>
          <h1>TelCo Manager</h1>
        </Link>
      </div>
      
      <div className="user-info">
        <div className="user-details">
          <div className="user-avatar">
            <UserIcon className="user-icon" size={20} />
          </div>
          <div className="user-text">
            <span className="username">{user?.name || 'Korisnik'}</span>
            <span className="role">{user?.role === 'admin' ? 'Administrator' : 'Tehničar'}</span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn" title="Odjavite se">
          <LogoutIcon size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;