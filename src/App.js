// Kompletna zamena za fajl: src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/main.css'; // <-- DODAJ OVU LINIJU
import './App.css';
// Layouts
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
// Context
import { AuthContext } from './context/AuthContext';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
// Admin inventar stranice
import EquipmentList from './pages/CentralInventory/EquipmentList';
import EquipmentUpload from './pages/CentralInventory/EquipmentUpload';
import EditEquipment from './pages/CentralInventory/EditEquipment';
import MaterialsList from './pages/CentralInventory/MaterialsList';
import AddMaterial from './pages/CentralInventory/AddMaterial';
import EditMaterial from './pages/CentralInventory/EditMaterial';
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
// Komponenta za potvrđivanje opreme
import EquipmentConfirmation from './pages/TechniciansInventory/EquipmentConfirmation';
// Korisnička stranica
import UsersList from './pages/Users/UsersList';
import ExportSpecification from './pages/Reports/ExportSpecification';

import UserEquipmentReport from './pages/Reports/UserEquipmentReport';
// API Services
import { techniciansAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEquipmentConfirmation, setShowEquipmentConfirmation] = useState(false);
  
  useEffect(() => {
    // Provera da li postoji korisnik u localStorage-u
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Greška pri parsiranju korisničkih podataka:', error);
        localStorage.removeItem('user');
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
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
    <AuthContext.Provider value={{ user, login, logout }}>
      <Router>
        <div className={`app ${showEquipmentConfirmation ? 'blocked-by-confirmation' : ''}`}>
          {user && <Header toggleMobileMenu={toggleMobileMenu} />}
          <main className="main-content">
            {user && <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />}
            <div className="content-container">
              <Routes>
                {/* Javne rute */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                
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
                    user.role === 'admin' ? <Dashboard /> : <Navigate to="/my-work-orders" />
                  ) : <Navigate to="/login" />
                } />
                
                {/* Inventar rute */}
                <Route path="/equipment" element={
                  user?.role === 'admin' ? <EquipmentList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/equipment/upload" element={
                  user?.role === 'admin' ? <EquipmentUpload /> : <Navigate to="/access-denied" />
                } />
                <Route path="/equipment/edit/:id" element={
                  user?.role === 'admin' ? <EditEquipment /> : <Navigate to="/access-denied" />
                } />
                                <Route path="/materials" element={
                  user?.role === 'admin' ? <MaterialsList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/materials/add" element={
                  user?.role === 'admin' ? <AddMaterial /> : <Navigate to="/access-denied" />
                } />
                <Route path="/materials/edit/:id" element={
                  user?.role === 'admin' ? <EditMaterial /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians" element={
                  user?.role === 'admin' ? <TechniciansList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/add" element={
                  user?.role === 'admin' ? <AddTechnician /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id" element={
                  user?.role === 'admin' ? <TechnicianDetail /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id/assign-equipment" element={
                  user?.role === 'admin' ? <AssignEquipment /> : <Navigate to="/access-denied" />
                } />
                <Route path="/technicians/:id/assign-material" element={
                  user?.role === 'admin' ? <AssignMaterial /> : <Navigate to="/access-denied" />
                } />
                
                {/* Radni nalozi rute za admina */}
                <Route path="/work-orders" element={
                  user?.role === 'admin' ? <WorkOrdersByTechnician /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/list" element={
                  user?.role === 'admin' ? <WorkOrdersList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/upload" element={
                  user?.role === 'admin' ? <WorkOrdersUpload /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/add" element={
                  user?.role === 'admin' ? <AddWorkOrder /> : <Navigate to="/access-denied" />
                } />
                <Route path="/work-orders/:id" element={
                  user?.role === 'admin' ? <WorkOrderDetail /> : <Navigate to="/access-denied" />
                } />
                
                {/* Korisnici ruta za admina */}
                <Route path="/users" element={
                  user?.role === 'admin' ? <UsersList /> : <Navigate to="/access-denied" />
                } />
                <Route path="/export" element={
                  user?.role === 'admin' ? <ExportSpecification /> : <Navigate to="/access-denied" />
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
                <Route path="/reports/user-equipment" element={
                  <PrivateRoute>
                    <UserEquipmentReport />
                  </PrivateRoute>
                } />
                
                {/* Fallback ruta */}
                <Route path="*" element={
                  <Navigate to={user ? (user.role === 'admin' ? '/' : '/my-work-orders') : '/login'} />
                } />
              </Routes>
            </div>
          </main>
          {/* Prilagođene postavke za ToastContainer - za poboljšanje izgleda notifikacija */}
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            style={{ fontSize: '14px' }}
            toastStyle={{ 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '12px 16px' 
            }}
            closeButton={({ closeToast }) => (
              <button
                onClick={closeToast}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#7f8c8d',
                  fontSize: '16px',
                  opacity: '0.7',
                  cursor: 'pointer',
                  padding: '0 5px',
                  marginLeft: '10px'
                }}
              >
                ✖
              </button>
            )}
          />
          
          {/* Komponenta za potvrđivanje opreme - prikazuje se kao overlay kad je potrebno */}
          {showEquipmentConfirmation && user?.role === 'technician' && (
            <EquipmentConfirmation onConfirmationComplete={handleEquipmentConfirmationComplete} />
          )}
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;