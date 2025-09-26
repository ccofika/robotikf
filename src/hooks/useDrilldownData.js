import { useState, useCallback } from 'react';

export const useDrilldownData = () => {
  const [drilldownState, setDrilldownState] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    data: [],
    loading: false,
    error: null,
    filterCriteria: {},
    sourceChart: null,
    sourceSegment: null
  });

  // Open drill-down with specific data
  const openDrilldown = useCallback(({
    title,
    subtitle,
    filterCriteria = {},
    sourceChart,
    sourceSegment
  }) => {
    setDrilldownState({
      isOpen: true,
      title,
      subtitle,
      data: [],
      loading: true,
      error: null,
      filterCriteria,
      sourceChart,
      sourceSegment
    });

    // Fetch data based on filter criteria
    fetchDrilldownData(filterCriteria, sourceChart, sourceSegment);
  }, []);

  // Close drill-down
  const closeDrilldown = useCallback(() => {
    setDrilldownState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  // Fetch drill-down data from API
  const fetchDrilldownData = useCallback(async (filterCriteria, sourceChart, sourceSegment) => {
    try {
      setDrilldownState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams();

      // Add filter criteria to API params
      Object.entries(filterCriteria).forEach(([key, value]) => {
        if (value && value !== 'all') {
          if (Array.isArray(value) && value.length > 0) {
            params.append(key, value.join(','));
          } else if (typeof value === 'string' || typeof value === 'number') {
            params.append(key, value.toString());
          }
        }
      });

      // Add source context
      if (sourceChart) params.append('sourceChart', sourceChart);
      if (sourceSegment) params.append('sourceSegment', sourceSegment);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/logs/drilldown?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch drill-down data');
      }

      const data = await response.json();

      setDrilldownState(prev => ({
        ...prev,
        data: data.data || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
      setDrilldownState(prev => ({
        ...prev,
        data: [],
        loading: false,
        error: error.message || 'Greška pri učitavanju podataka'
      }));
    }
  }, []);

  // Handle chart segment click
  const handleChartClick = useCallback((chartData) => {
    const {
      chartType,
      segment,
      value,
      label,
      date,
      technician,
      action,
      municipality,
      additionalFilters = {}
    } = chartData;

    // Build filter criteria based on clicked segment
    const filterCriteria = {
      ...additionalFilters
    };

    if (date) filterCriteria.date = date;
    if (technician && technician !== 'all') filterCriteria.technician = technician;
    if (action && action !== 'all') filterCriteria.action = action;
    if (municipality && municipality !== 'all') filterCriteria.municipality = municipality;

    // Generate meaningful title and subtitle
    let title = `Detalji za ${label}`;
    let subtitle = `${value} ${getRecordLabel(value)}`;

    if (chartType === 'activity') {
      title = `Aktivnosti - ${label}`;
      subtitle = `${value} aktivnosti za ${date || 'izabrani period'}`;
    } else if (chartType === 'technician') {
      title = `Tehničar - ${technician}`;
      subtitle = `${value} radnih naloga`;
    } else if (chartType === 'municipality') {
      title = `Opština - ${municipality}`;
      subtitle = `${value} aktivnosti`;
    } else if (chartType === 'completion_time') {
      title = `Vreme završavanja - ${label}`;
      subtitle = `${value} radnih naloga`;
    }

    openDrilldown({
      title,
      subtitle,
      filterCriteria,
      sourceChart: chartType,
      sourceSegment: segment
    });
  }, [openDrilldown]);

  // Handle view details for specific item
  const handleViewDetails = useCallback((item) => {
    // Open detailed view for specific work order or log entry
    if (item.workOrderId) {
      window.open(`/work-orders/${item.workOrderId}`, '_blank');
    } else if (item.id) {
      window.open(`/logs/${item.id}`, '_blank');
    }
  }, []);

  // Handle export data
  const handleExportData = useCallback((data) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `drilldown-data-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // Utility function to convert data to CSV
  const convertToCSV = (data) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
      return headers.map(header => {
        let value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  // Utility function to get record label
  const getRecordLabel = (count) => {
    if (count === 1) return 'aktivnost';
    if (count < 5) return 'aktivnosti';
    return 'aktivnosti';
  };

  // Check if drill-down is available for specific chart type
  const isDrilldownAvailable = useCallback((chartType) => {
    const supportedCharts = [
      'activity',
      'technician',
      'municipality',
      'completion_time',
      'material_usage',
      'service_type',
      'action_type'
    ];
    return supportedCharts.includes(chartType);
  }, []);

  return {
    // State
    drilldownState,

    // Actions
    openDrilldown,
    closeDrilldown,
    handleChartClick,
    handleViewDetails,
    handleExportData,

    // Utilities
    isDrilldownAvailable
  };
};

export default useDrilldownData;