// Utility for processing log data into daily activity charts
export const processActivityData = (technicianLogs = [], userLogs = [], timeFilter = '1week') => {
  const now = new Date();
  let startDate;
  
  // Find the earliest log date to determine app start
  const findEarliestDate = () => {
    let earliest = new Date('2099-12-31'); // Start with far future date
    
    // Check technician logs
    if (technicianLogs && technicianLogs.length > 0) {
      technicianLogs.forEach(techGroup => {
        if (techGroup.logs && techGroup.logs.length > 0) {
          techGroup.logs.forEach(log => {
            const logDate = new Date(log.timestamp);
            if (logDate < earliest) earliest = logDate;
          });
        }
      });
    }
    
    // Check user logs  
    if (userLogs && userLogs.length > 0) {
      userLogs.forEach(userGroup => {
        if (userGroup.logs && userGroup.logs.length > 0) {
          userGroup.logs.forEach(log => {
            const logDate = new Date(log.timestamp);
            if (logDate < earliest) earliest = logDate;
          });
        }
      });
    }
    
    // If no logs found, default to 30 days ago
    if (earliest.getFullYear() === 2099) {
      earliest = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    
    return earliest;
  };
  
  // Get date range based on filter
  switch (timeFilter) {
    case '1day':
      startDate = new Date(now - 1 * 24 * 60 * 60 * 1000);
      break;
    case '1week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1month':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = findEarliestDate();
      break;
    default:
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  // Create date range array
  const dateRange = [];
  const currentDate = new Date(startDate);
  while (currentDate <= now) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Initialize data structure for each date
  const dailyData = {};
  dateRange.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      material_added: 0,
      material_removed: 0,
      equipment_added: 0,
      equipment_removed: 0,
      image_added: 0,
      image_removed: 0,
      comment_added: 0,
      workorder_finished: 0,
      workorder_cancelled: 0,
      total: 0
    };
  });

  // Process technician logs
  if (technicianLogs && technicianLogs.length > 0) {
    technicianLogs.forEach(techGroup => {
      if (techGroup.logs && techGroup.logs.length > 0) {
        techGroup.logs.forEach(log => {
          const logDate = new Date(log.timestamp);
          if (logDate >= startDate && logDate <= now) {
            const dateStr = logDate.toISOString().split('T')[0];
            
            if (dailyData[dateStr]) {
              // Map log actions based on real action types from TechnicianLogsSection
              switch (log.action) {
                case 'material_added':
                  dailyData[dateStr].material_added++;
                  break;
                case 'material_removed':
                  dailyData[dateStr].material_removed++;
                  break;
                case 'equipment_added':
                  dailyData[dateStr].equipment_added++;
                  break;
                case 'equipment_removed':
                  dailyData[dateStr].equipment_removed++;
                  break;
                case 'image_added':
                  dailyData[dateStr].image_added++;
                  break;
                case 'image_removed':
                  dailyData[dateStr].image_removed++;
                  break;
                case 'comment_added':
                  dailyData[dateStr].comment_added++;
                  break;
                case 'workorder_finished':
                  dailyData[dateStr].workorder_finished++;
                  break;
                case 'workorder_cancelled':
                  dailyData[dateStr].workorder_cancelled++;
                  break;
                default:
                  // Count as general activity
                  break;
              }
              dailyData[dateStr].total++;
            }
          }
        });
      }
    });
  }

  // Process user logs
  if (userLogs && userLogs.length > 0) {
    userLogs.forEach(userGroup => {
      if (userGroup.logs && userGroup.logs.length > 0) {
        userGroup.logs.forEach(log => {
          const logDate = new Date(log.timestamp);
          if (logDate >= startDate && logDate <= now) {
            const dateStr = logDate.toISOString().split('T')[0];
            
            if (dailyData[dateStr]) {
              // Map user log actions to our categories
              switch (log.action) {
                case 'user_created':
                case 'user_registration':
                  dailyData[dateStr].user_created++;
                  break;
                case 'work_order_created':
                case 'service_request_created':
                  dailyData[dateStr].work_order_created++;
                  break;
                case 'comment_added':
                  dailyData[dateStr].comments_added++;
                  break;
                default:
                  // Count as general activity
                  break;
              }
              dailyData[dateStr].total++;
            }
          }
        });
      }
    });
  }

  // Convert to array format for chart
  const chartData = Object.values(dailyData).map(day => ({
    ...day,
    originalDate: day.date, // Keep original for sorting
    date: formatDateForDisplay(day.date)
  }));

  return chartData.sort((a, b) => new Date(a.originalDate) - new Date(b.originalDate));
};

// Helper function to format date for display
const formatDateForDisplay = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sr-RS', { 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get action type labels in Serbian
export const getActionTypeLabels = () => ({
  workorders_closed: 'Zatvoreni nalozi',
  images_added: 'Dodane slike',
  materials_used: 'Korišćeni materijali',
  user_created: 'Kreirani korisnici',
  technician_assigned: 'Dodeljeni tehnićari',
  equipment_used: 'Korišćena oprema',
  comments_added: 'Dodani komentari',
  work_order_created: 'Kreirani nalozi',
  total: 'Ukupne aktivnosti'
});

// Get filter options for action types
export const getActivityFilterOptions = () => [
  { value: 'all', label: 'Sve akcije' },
  { value: 'workorders_closed', label: 'Zatvoreni nalozi' },
  { value: 'images_added', label: 'Dodane slike' },
  { value: 'materials_used', label: 'Korišćeni materijali' },
  { value: 'user_created', label: 'Kreirani korisnici' },
  { value: 'technician_assigned', label: 'Dodeljeni tehnićari' },
  { value: 'equipment_used', label: 'Korišćena oprema' },
  { value: 'comments_added', label: 'Dodani komentari' },
  { value: 'work_order_created', label: 'Kreirani nalozi' }
];

// Process data for specific action type
export const getDataForActionType = (chartData, actionType) => {
  if (actionType === 'all') {
    return chartData.map(item => ({
      ...item,
      value: item.total
    }));
  }
  
  return chartData.map(item => ({
    ...item,
    value: item[actionType] || 0
  }));
};