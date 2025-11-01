import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrdersAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import {
  ClipboardIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  AlertIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '../../components/icons/SvgIcons';
import { Button } from '../../components/ui/button-1';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../utils/cn';
import axios from 'axios';

const EditWorkOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Server-side pagination state
  const [workOrders, setWorkOrders] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 24,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [performance, setPerformance] = useState({ queryTime: 0, resultsPerPage: 0 });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to page 1 when search changes
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when pagination, search, or filters change
  useEffect(() => {
    fetchWorkOrders();
  }, [pagination.currentPage, debouncedSearchTerm, statusFilter, municipalityFilter, technicianFilter]);

  // Initial load - fetch filters
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await workOrdersAPI.getAll();

      // Filter to only show work orders from last month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const filteredWorkOrders = response.data.filter(wo => {
        const workOrderDate = new Date(wo.date);
        return workOrderDate >= oneMonthAgo;
      });

      // Extract unique municipalities
      const uniqueMunicipalities = [...new Set(filteredWorkOrders.map(wo => wo.municipality))].filter(Boolean);
      setMunicipalities(uniqueMunicipalities);

      // Extract unique technicians
      const uniqueTechnicians = [];
      filteredWorkOrders.forEach(wo => {
        if (wo.technicianId && !uniqueTechnicians.find(t => t._id === wo.technicianId._id)) {
          uniqueTechnicians.push(wo.technicianId);
        }
        if (wo.technician2Id && !uniqueTechnicians.find(t => t._id === wo.technician2Id._id)) {
          uniqueTechnicians.push(wo.technician2Id);
        }
      });
      setTechnicians(uniqueTechnicians);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchWorkOrders = async (page = pagination.currentPage) => {
    setLoading(true);

    try {
      // Build query params for server-side filtering and pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearchTerm,
        status: statusFilter,
        municipality: municipalityFilter,
        technician: technicianFilter,
        lastMonthOnly: 'true' // Only fetch work orders from last month
      });

      const response = await axios.get(`${apiUrl}/api/workorders?${params.toString()}`);

      // Handle response - check if it has pagination data
      if (response.data.workOrders) {
        // Server returned paginated data
        setWorkOrders(response.data.workOrders);
        setPagination(response.data.pagination);
        setPerformance(response.data.performance || { queryTime: 0, resultsPerPage: response.data.workOrders.length });
      } else {
        // Server returned all data - do client-side pagination
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        let filteredData = response.data.filter(wo => {
          const workOrderDate = new Date(wo.date);
          if (workOrderDate < oneMonthAgo) return false;

          const matchesSearch = !debouncedSearchTerm ||
            wo.tisId?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.userName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.address?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            wo.municipality?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

          const matchesStatus = !statusFilter || wo.status === statusFilter;
          const matchesMunicipality = !municipalityFilter || wo.municipality === municipalityFilter;
          const matchesTechnician = !technicianFilter ||
            wo.technicianId?._id === technicianFilter ||
            wo.technician2Id?._id === technicianFilter;

          return matchesSearch && matchesStatus && matchesMunicipality && matchesTechnician;
        });

        // Client-side pagination
        const startIndex = (page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        setWorkOrders(paginatedData);
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(filteredData.length / pagination.limit),
          totalCount: filteredData.length,
          limit: pagination.limit,
          hasNextPage: endIndex < filteredData.length,
          hasPreviousPage: page > 1
        });
        setPerformance({ queryTime: 0, resultsPerPage: paginatedData.length });
      }

    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Greška pri učitavanju radnih naloga');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'zavrsen':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'nezavrsen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'otkazan':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'odlozen':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'zavrsen':
        return 'Završen';
      case 'nezavrsen':
        return 'Nezavršen';
      case 'otkazan':
        return 'Otkazan';
      case 'odlozen':
        return 'Odložen';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && pagination.currentPage === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <ClipboardIcon size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edituj radne naloge</h1>
            <p className="text-muted-foreground">
              Dodaj opremu i materijal u radne naloge (poslednjih mesec dana)
            </p>
          </div>
        </div>
        <Button onClick={() => fetchWorkOrders(pagination.currentPage)} variant="outline" disabled={loading}>
          <RefreshIcon size={18} />
          Osveži
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pagination.totalCount}</div>
            <p className="text-xs text-muted-foreground">Ukupno radnih naloga</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pagination.currentPage} / {pagination.totalPages}</div>
            <p className="text-xs text-muted-foreground">Trenutna stranica</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{performance.resultsPerPage}</div>
            <p className="text-xs text-muted-foreground">Rezultata po stranici</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon size={20} />
            Filteri i pretraga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pretraži po TIS ID, korisniku, adresi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Svi statusi</option>
                <option value="nezavrsen">Nezavršen</option>
                <option value="zavrsen">Završen</option>
                <option value="odlozen">Odložen</option>
                <option value="otkazan">Otkazan</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opština:</label>
              <select
                value={municipalityFilter}
                onChange={(e) => {
                  setMunicipalityFilter(e.target.value);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sve opštine</option>
                {municipalities.map(municipality => (
                  <option key={municipality} value={municipality}>
                    {municipality}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tehničar:</label>
              <select
                value={technicianFilter}
                onChange={(e) => {
                  setTechnicianFilter(e.target.value);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Svi tehničari</option>
                {technicians.map(tech => (
                  <option key={tech._id} value={tech._id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Grid */}
      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertIcon size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nema radnih naloga</p>
            <p className="text-sm text-muted-foreground">
              Nema radnih naloga koji odgovaraju filterima
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workOrders.map(workOrder => (
              <Card
                key={workOrder._id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary"
                onClick={() => navigate(`/edit-work-orders/${workOrder._id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {workOrder.tisId || 'N/A'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {workOrder.userName || 'N/A'}
                      </CardDescription>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                      getStatusBadgeClass(workOrder.status)
                    )}>
                      {getStatusText(workOrder.status)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPinIcon size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">
                      {workOrder.address || 'N/A'}, {workOrder.municipality || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={16} className="text-muted-foreground" />
                      <span>{formatDate(workOrder.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon size={16} className="text-muted-foreground" />
                      <span>{workOrder.time}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <UserIcon size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-foreground font-medium">
                      {workOrder.technicianId?.name}
                      {workOrder.technician2Id && `, ${workOrder.technician2Id.name}`}
                    </span>
                  </div>

                  {workOrder.type && (
                    <div className="pt-2 mt-2 border-t">
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                        {workOrder.type}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Stranica {pagination.currentPage} od {pagination.totalPages} ({pagination.totalCount} ukupno)
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPreviousPage || loading}
                    >
                      <ChevronLeftIcon size={16} />
                      Prethodna
                    </Button>

                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                        let pageNumber;
                        if (pagination.totalPages <= 5) {
                          pageNumber = idx + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNumber = idx + 1;
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          pageNumber = pagination.totalPages - 4 + idx;
                        } else {
                          pageNumber = pagination.currentPage - 2 + idx;
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={pagination.currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNumber)}
                            disabled={loading}
                            className="w-10"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage || loading}
                    >
                      Sledeća
                      <ChevronRightIcon size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default EditWorkOrders;
