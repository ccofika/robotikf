// Kompletna zamena za fajl: src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { toast, ToastProvider } from './components/ui/toast';
import './styles/main.css'; // <-- DODAJ OVU LINIJU
import './App.css';
// Layouts
import { ShadcnSidebar } from './components/layout/ShadcnSidebar';
// Context
import { AuthContext } from './context/AuthContext';
import { OverdueWorkOrdersProvider, useOverdueWorkOrders } from './context/OverdueWorkOrdersContext';

// Pages
import Login from './pages/Auth/Login';
import Logout from './pages/Auth/Logout';
import Dashboard from './pages/Dashboard/Dashboard';
// Admin inventar stranice
import EquipmentList from './pages/CentralInventory/EquipmentList';
import EquipmentUpload from './pages/CentralInventory/EquipmentUpload';
import EditEquipment from './pages/CentralInventory/EditEquipment';
import MaterialsList from './pages/CentralInventory/MaterialsList';
import AddMaterial from './pages/CentralInventory/AddMaterial';
import EditMaterial from './pages/CentralInventory/EditMaterial';
import BasicEquipmentManager from './pages/BasicEquipment/BasicEquipmentManager';
import TechniciansList from './pages/TechniciansInventory/TechniciansList';
import AddTechnician from './pages/TechniciansInventory/AddTechnician';
import TechnicianDetail from './pages/TechniciansInventory/TechnicianDetail';
import AssignEquipment from './pages/TechniciansInventory/AssignEquipment';
import AssignMaterial from './pages/TechniciansInventory/AssignMaterial';
// Admin radni nalozi stranice
import WorkOrdersList from './pages/WorkOrders/WorkOrdersList';
import WorkOrdersUpload from './pages/WorkOrders/WorkOrdersUpload';
import AddWorkOrder from './pages/WorkOrders/AddWorkOrder';
import WorkOrderDetail from './pages/WorkOrders/WorkOrderDetail';
import WorkOrdersByTechnician from './pages/WorkOrders/WorkOrdersByTechnician';
// Tehnicar radni nalozi stranice
import TechnicianWorkOrders from './pages/WorkOrders/TechnicianWorkOrders';
import TechnicianWorkOrderDetail from './pages/WorkOrders/TechnicianWorkOrderDetail';
// Tehnicar inventar stranice
import TechnicianEquipment from './pages/TechniciansInventory/TechnicianEquipment';
import TechnicianMaterials from './pages/TechniciansInventory/TechnicianMaterials';
import TechnicianBasicEquipment from './pages/TechniciansInventory/TechnicianBasicEquipment';
// Komponenta za potvrđivanje opreme
import EquipmentConfirmation from './pages/TechniciansInventory/EquipmentConfirmation';
// Komponenta za overdue radne naloge
import OverdueWorkOrdersModal from './pages/WorkOrders/OverdueWorkOrdersModal';
// Korisnička stranica
import UsersList from './pages/Users/UsersList';
import ExportSpecification from './pages/Reports/ExportSpecification';
import Logs from './pages/Logs/Logs';
import DefectiveEquipment from './pages/DefectiveEquipment/DefectiveEquipment';
import Finances from './pages/Finances/Finances';

import UserEquipmentReport from './pages/Reports/UserEquipmentReport';
import VehicleFleet from './pages/VehicleFleet/VehicleFleet';
// API Services
import { techniciansAPI } from './services/api';

// Route Guard Component for overdue work orders
const OverdueRouteGuard = ({ children }) => {
  const location = useLocation();
  const { hasOverdueOrders, isAllowedPath, overdueOrders } = useOverdueWorkOrders();

  console.log('RouteGuard: hasOverdueOrders:', hasOverdueOrders);
  console.log('RouteGuard: overdueOrders:', overdueOrders);
  console.log('RouteGuard: current path:', location.pathname);
  console.log('RouteGuard: isAllowedPath:', isAllowedPath(location.pathname));

  // If there are overdue orders and current path is not allowed, show modal
  if (hasOverdueOrders && !isAllowedPath(location.pathname)) {
    console.log('RouteGuard: Showing overdue modal');
    return <OverdueWorkOrdersModal onModalComplete={() => {}} />;
  }

  console.log('RouteGuard: Showing normal content');
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEquipmentConfirmation, setShowEquipmentConfirmation] = useState(false);
  
  useEffect(() => {
    // Provera da li postoji korisnik u localStorage-u
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      // Proveri da li je token istekao
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = Date.now() >= payload.exp * 1000;

        if (isExpired) {
          // Token je istekao, obriši podatke
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        } else {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Greška pri validaciji tokena:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Proveri da li tehničar ima opremu koja čeka potvrdu
  useEffect(() => {
    const checkPendingEquipment = async () => {
      if (!user || user.role !== 'technician' || !user._id) return;
      
      try {
        const response = await techniciansAPI.getPendingEquipment(user._id);
        setShowEquipmentConfirmation(response.data.length > 0);
      } catch (error) {
        console.error('Greška pri proveravanju opreme koja čeka potvrdu:', error);
      }
    };

    checkPendingEquipment();
  }, [user]);
  
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) localStorage.setItem('token', token);
    toast.success('Uspešno ste se prijavili!');
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Uspešno ste se odjavili!');
    // Preusmjeri na login stranicu nakon logout-a
    window.location.href = '/login';
  };

  // Auto-refresh token svakih 23 sata
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const timeUntilExpiry = (payload.exp * 1000) - Date.now();

          // Refresh token 1 sat pre isteka
          if (timeUntilExpiry < 3600000 && timeUntilExpiry > 0) {
            console.log('Auto-refreshing token...');
            // Token će biti refresšovan automatski preko interceptora
          }
        } catch (error) {
          console.error('Greška pri proveri tokena:', error);
        }
      }
    }, 3600000); // Proveri svakih sat vremena

    return () => clearInterval(refreshInterval);
  }, [user]);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleEquipmentConfirmationComplete = () => {
    setShowEquipmentConfirmation(false);
  };
  
const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  return user ? children : <Navigate to="/login" replace />;
};

  if (loading) {
    return <div className="loading">Učitavanje...</div>;
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      <OverdueWorkOrdersProvider>
        <ToastProvider>
          <Router>
            <div className={`app ${showEquipmentConfirmation ? 'blocked-by-confirmation' : ''}`}>
              {user && <ShadcnSidebar />}
              <main className={`${user ? 'md:ml-16' : ''} transition-all duration-300 ease-in-out`}>
                <div className={`${user ? 'pt-16 md:pt-6' : ''} p-6 min-h-screen`}>
                  <OverdueRouteGuard>
                <Routes>
                {/* Javne rute */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/logout" element={<Logout />} />
                
                {/* Ruta za pristup odbijen */}
                <Route path="/access-denied" element={
                  <div className="access-denied">
                    <h2>Pristup odbijen</h2>
                    <p>Nemate potrebne dozvole za pristup ovoj stranici.</p>
                    <button onClick={logout} className="btn">Odjavite se</button>
                  </div>
                } />
                
                {/* Admin rute */}
                <Route path="/" element={
                  user ? (
                    (user.role === 'admin' || user.role === 'superadmin') ? <Dashboard /> : <Navigate to="/my-work-orders" />
                  ) : <Navigate to="/login" />
                } />
                
                {/* Inventar rute */}
                <Route path="/equipment" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <EquipmentList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/equipment/upload" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <EquipmentUpload /> : <Navigate to="/access-denied" />
                } />
                <Route path="/equipment/edit/:id" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <EditEquipment /> : <Navigate to="/access-denied" />
                } />
                                <Route path="/materials" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <MaterialsList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/materials/add" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <AddMaterial /> : <Navigate to="/access-denied" />
                } />
                <Route path="/materials/edit/:id" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <EditMaterial /> : <Navigate to="/access-denied" />
                } />
                <Route path="/basic-equipment" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <BasicEquipmentManager /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <TechniciansList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/add" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <AddTechnician /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <TechnicianDetail /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id/assign-equipment" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <AssignEquipment /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id/assign-material" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <AssignMaterial /> : <Navigate to="/access-denied" />
                } />
                
                {/* Radni nalozi rute za admina */}
                <Route path="/work-orders" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <WorkOrdersByTechnician /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/list" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <WorkOrdersList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/upload" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <WorkOrdersUpload /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/add" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <AddWorkOrder /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/:id" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <WorkOrderDetail /> : <Navigate to="/access-denied" />
                } />
                
                {/* Korisnici ruta za admina */}
                <Route path="/users" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <UsersList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/export" element={
                  user?.role === 'superadmin' ? <ExportSpecification /> : <Navigate to="/access-denied" />
                } />
                <Route path="/logs" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <Logs /> : <Navigate to="/access-denied" />
                } />
                <Route path="/vehicles" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <VehicleFleet /> : <Navigate to="/access-denied" />
                } />
                <Route path="/defective-equipment" element={
                  (user?.role === 'admin' || user?.role === 'superadmin') ? <DefectiveEquipment /> : <Navigate to="/access-denied" />
                } />
                <Route path="/finances" element={
                  user?.role === 'superadmin' ? <Finances /> : <Navigate to="/access-denied" />
                } />
                
                {/* Radni nalozi rute za tehničara */}
                <Route path="/my-work-orders" element={
                  user ? <TechnicianWorkOrders /> : <Navigate to="/login" />
                } />
                <Route path="/my-work-orders/:id" element={
                  user ? <TechnicianWorkOrderDetail /> : <Navigate to="/login" />
                } />
                
                {/* Inventar rute za tehničara */}
                <Route path="/my-equipment" element={
                  user ? <TechnicianEquipment /> : <Navigate to="/login" />
                } />
                <Route path="/my-materials" element={
                  user ? <TechnicianMaterials /> : <Navigate to="/login" />
                } />
                <Route path="/my-basic-equipment" element={
                  user ? <TechnicianBasicEquipment /> : <Navigate to="/login" />
                } />
                <Route path="/reports/user-equipment" element={
                  <PrivateRoute>
                    <UserEquipmentReport />
                  </PrivateRoute>
                } />
                
                {/* Fallback ruta */}
                <Route path="*" element={
                  <Navigate to={user ? ((user.role === 'admin' || user.role === 'superadmin') ? '/' : '/my-work-orders') : '/login'} />
                } />
                </Routes>
                  </OverdueRouteGuard>
              </div>
            </main>
            
            {/* Komponenta za potvrđivanje opreme - prikazuje se kao overlay kad je potrebno */}
            {showEquipmentConfirmation && user?.role === 'technician' && (
              <EquipmentConfirmation onConfirmationComplete={handleEquipmentConfirmationComplete} />
            )}
          </div>
        </Router>
      </ToastProvider>
      </OverdueWorkOrdersProvider>
    </AuthContext.Provider>
  );
}

export default App;