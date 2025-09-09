import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { workOrdersAPI } from '../services/api';

export const OverdueWorkOrdersContext = createContext({
  overdueOrders: [],
  hasOverdueOrders: false,
  loading: false,
  checkOverdueOrders: () => {},
  clearOverdueOrders: () => {},
  isAllowedPath: () => false,
});

export const OverdueWorkOrdersProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Paths that are allowed when there are overdue work orders
  const allowedPaths = [
    '/my-work-orders/', // Allow access to work order detail pages
    '/login',
    '/access-denied'
  ];

  const checkOverdueOrders = async () => {
    if (!user || user.role !== 'technician' || !user._id) {
      console.log('OverdueWorkOrders: User not technician or no ID');
      setOverdueOrders([]);
      return;
    }

    console.log('OverdueWorkOrders: Checking overdue orders for technician:', user._id);
    setLoading(true);
    try {
      const response = await workOrdersAPI.getTechnicianOverdueWorkOrders(user._id);
      console.log('OverdueWorkOrders: API response:', response.data);
      setOverdueOrders(response.data);
    } catch (error) {
      console.error('Greška pri proveravanju overdue radnih naloga:', error);
      setOverdueOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const clearOverdueOrders = () => {
    setOverdueOrders([]);
  };

  const isAllowedPath = (pathname) => {
    // Always allow login and access-denied
    if (['/login', '/access-denied'].includes(pathname)) {
      return true;
    }

    // If no overdue orders, allow all paths
    if (overdueOrders.length === 0) {
      return true;
    }

    // Allow access to work order detail pages for overdue work orders
    if (pathname.startsWith('/my-work-orders/')) {
      const workOrderId = pathname.replace('/my-work-orders/', '');
      // Check if this is one of the overdue work orders
      const isOverdueWorkOrder = overdueOrders.some(order => order._id === workOrderId);
      return isOverdueWorkOrder;
    }

    return false;
  };

  // Check for overdue orders periodically
  useEffect(() => {
    if (user && user.role === 'technician') {
      checkOverdueOrders();
      
      // Check every 2 minutes for updates
      const interval = setInterval(checkOverdueOrders, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const contextValue = {
    overdueOrders,
    hasOverdueOrders: overdueOrders.length > 0,
    loading,
    checkOverdueOrders,
    clearOverdueOrders,
    isAllowedPath,
  };

  return (
    <OverdueWorkOrdersContext.Provider value={contextValue}>
      {children}
    </OverdueWorkOrdersContext.Provider>
  );
};

export const useOverdueWorkOrders = () => {
  const context = useContext(OverdueWorkOrdersContext);
  if (!context) {
    throw new Error('useOverdueWorkOrders must be used within an OverdueWorkOrdersProvider');
  }
  return context;
};