import React, { useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Logout = () => {
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    // Automatski izloguj korisnika čim se komponenta učita
    logout();
  }, [logout]);

  // Preusmeri na login stranicu
  return <Navigate to="/login" replace />;
};

export default Logout;