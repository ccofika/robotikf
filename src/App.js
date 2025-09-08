// Kompletna zamena za fajl: src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast, ToastProvider } from './components/ui/toast';
import './styles/main.css'; // <-- DODAJ OVU LINIJU
import './App.css';
// Layouts
import { ShadcnSidebar } from './components/layout/ShadcnSidebar';
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
import Logs from './pages/Logs/Logs';
import DefectiveEquipment from './pages/DefectiveEquipment/DefectiveEquipment';

import UserEquipmentReport from './pages/Reports/UserEquipmentReport';
import VehicleFleet from './pages/VehicleFleet/VehicleFleet';
// API Services
import { techniciansAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
      <ToastProvider>
        <Router>
          <div className={`app ${showEquipmentConfirmation ? 'blocked-by-confirmation' : ''}`}>
            {user && <ShadcnSidebar />}
            <main className={`${user ? 'md:ml-16' : ''} transition-all duration-300 ease-in-out`}>
              <div className={`${user ? 'pt-16 md:pt-6' : ''} p-6 min-h-screen`}>
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
                <Route path="/logs" element={
                  user?.role === 'admin' ? <Logs /> : <Navigate to="/access-denied" />
                } />
                <Route path="/vehicles" element={
                  user?.role === 'admin' ? <VehicleFleet /> : <Navigate to="/access-denied" />
                } />
                <Route path="/defective-equipment" element={
                  user?.role === 'admin' ? <DefectiveEquipment /> : <Navigate to="/access-denied" />
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
            
            {/* Komponenta za potvrđivanje opreme - prikazuje se kao overlay kad je potrebno */}
            {showEquipmentConfirmation && user?.role === 'technician' && (
              <EquipmentConfirmation onConfirmationComplete={handleEquipmentConfirmationComplete} />
            )}
          </div>
        </Router>
      </ToastProvider>
    </AuthContext.Provider>
  );
}

export default App;