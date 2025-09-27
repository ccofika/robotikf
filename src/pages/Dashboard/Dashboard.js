import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BoxIcon, ToolsIcon, UsersIcon, ClipboardIcon, CheckCircleIcon, ClockIcon, TrendingUpIcon, BarChartIcon, PlusIcon, RefreshIcon } from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import axios from 'axios';
import { cn } from '../../utils/cn';

const Dashboard = () => {
  const navigate = useNavigate();
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      console.log('Dashboard: Fetching optimized data...');
      const startTime = Date.now();

      // Optimizovano - koristimo statsOnly za brže učitavanje
      const [equipment, materials, technicians, workOrderStats] = await Promise.all([
        axios.get(`${apiUrl}/api/equipment?statsOnly=true`),
        axios.get(`${apiUrl}/api/materials?statsOnly=true`),
        axios.get(`${apiUrl}/api/technicians?statsOnly=true`),
        axios.get(`${apiUrl}/api/workorders/statistics/summary`)
      ]);

      const endTime = Date.now();
      console.log(`Dashboard: Data fetched in ${endTime - startTime}ms`);

      setStats({
        equipment: equipment.data.total || equipment.data.length || 0,
        materials: materials.data.total || materials.data.length || 0,
        technicians: technicians.data.total || technicians.data.length || 0,
        workOrders: {
          total: workOrderStats.data.total || 0,
          completed: workOrderStats.data.completed || 0,
          pending: workOrderStats.data.pending || 0,
          postponed: workOrderStats.data.postponed || 0
        }
      });
    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Function to navigate to work orders with status filter
  const navigateToWorkOrders = (status) => {
    if (status === 'zavrsen') {
      navigate('/work-orders?tab=all&status=zavrsen');
    } else if (status === 'nezavrsen') {
      navigate('/work-orders?tab=all&status=nezavrsen');
    } else if (status === 'odlozen') {
      navigate('/work-orders?tab=all&status=odlozen');
    } else {
      navigate('/work-orders?tab=all');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium">Učitavanje dashboard podataka...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3">
      {/* Header Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <BarChartIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-1">Pregled sistemskih informacija i ključnih metrika</p>
            </div>
          </div>
          <Button
            type="secondary"
            size="small"
            prefix={<RefreshIcon size={16} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Osvežava...' : 'Osveži'}
          </Button>
        </div>
      </div>
      
      {/* Main Stats Cards */}
      <div className="mb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BoxIcon size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Oprema</p>
                <h3 className="text-lg font-bold text-slate-900">{stats.equipment.toLocaleString()}</h3>
                <Link to="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Prikaži sve →
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ToolsIcon size={20} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Materijali</p>
                <h3 className="text-lg font-bold text-slate-900">{stats.materials.toLocaleString()}</h3>
                <Link to="/materials" className="text-xs text-green-600 hover:text-green-700 font-medium">
                  Prikaži sve →
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <UsersIcon size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Tehničari</p>
                <h3 className="text-lg font-bold text-slate-900">{stats.technicians.toLocaleString()}</h3>
                <Link to="/technicians" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                  Prikaži sve →
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ClipboardIcon size={20} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Radni nalozi</p>
                <h3 className="text-lg font-bold text-slate-900">{stats.workOrders.total.toLocaleString()}</h3>
                <Link to="/work-orders" className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                  Prikaži sve →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Work Orders Status Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-3">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Status radnih naloga</h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => navigateToWorkOrders('zavrsen')} 
              className="bg-white/60 rounded-lg p-4 border border-green-200 hover:shadow-md hover:border-green-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Završeni</h4>
                    <p className="text-lg font-bold text-green-600">{stats.workOrders.completed.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => navigateToWorkOrders('nezavrsen')} 
              className="bg-white/60 rounded-lg p-4 border border-blue-200 hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ClockIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">U toku</h4>
                    <p className="text-lg font-bold text-blue-600">{stats.workOrders.pending.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-blue-600">
                      {Math.round((stats.workOrders.pending / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => navigateToWorkOrders('odlozen')} 
              className="bg-white/60 rounded-lg p-4 border border-yellow-200 hover:shadow-md hover:border-yellow-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ClockIcon size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Odloženi</h4>
                    <p className="text-lg font-bold text-yellow-600">{stats.workOrders.postponed.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  {stats.workOrders.total > 0 && (
                    <span className="text-sm font-semibold text-yellow-600">
                      {Math.round((stats.workOrders.postponed / stats.workOrders.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        
      {/* Quick Actions Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Brze akcije</h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/work-orders/add" 
              className="group bg-white/60 rounded-lg p-3 border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="p-2 bg-orange-50 group-hover:bg-orange-100 rounded-lg transition-colors">
                  <PlusIcon size={20} className="text-orange-600" />
                </div>
                <span className="text-sm font-medium text-slate-900 group-hover:text-orange-700">Novi radni nalog</span>
              </div>
            </Link>
            
            <Link 
              to="/equipment/upload" 
              className="group bg-white/60 rounded-lg p-3 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="p-2 bg-blue-50 group-hover:bg-blue-100 rounded-lg transition-colors">
                  <BoxIcon size={20} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700">Dodaj opremu</span>
              </div>
            </Link>
            
            <Link 
              to="/materials/add" 
              className="group bg-white/60 rounded-lg p-3 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="p-2 bg-green-50 group-hover:bg-green-100 rounded-lg transition-colors">
                  <ToolsIcon size={20} className="text-green-600" />
                </div>
                <span className="text-sm font-medium text-slate-900 group-hover:text-green-700">Dodaj materijal</span>
              </div>
            </Link>
            
            <Link 
              to="/technicians/add" 
              className="group bg-white/60 rounded-lg p-3 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="p-2 bg-purple-50 group-hover:bg-purple-100 rounded-lg transition-colors">
                  <UsersIcon size={20} className="text-purple-600" />
                </div>
                <span className="text-sm font-medium text-slate-900 group-hover:text-purple-700">Dodaj tehničara</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;