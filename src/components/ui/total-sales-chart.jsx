import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button-1';
import { BarChartIcon, CalendarIcon, FilterIcon } from '../../components/icons/SvgIcons';
import { cn } from '../../lib/utils';

const TotalSalesChart = ({ 
  data = [], 
  title = "Dnevne aktivnosti", 
  description = "Pregled aktivnosti na aplikaciji po danima",
  className,
  onFilterChange,
  filterOptions = []
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  
  // Use data directly without internal filtering - data is already processed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // If actionFilter is not 'all', map the data to show specific action
    if (actionFilter === 'all') {
      return data;
    }
    
    return data.map(item => ({
      ...item,
      value: item[actionFilter] || 0
    }));
  }, [data, actionFilter]);
  
  // Calculate total for the period
  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (item.value || item.total || 0), 0);
  }, [chartData]);
  
  // Calculate percentage change
  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const recent = chartData.slice(-3).reduce((sum, item) => sum + (item.value || item.total || 0), 0);
    const previous = chartData.slice(-6, -3).reduce((sum, item) => sum + (item.value || item.total || 0), 0);
    if (previous === 0) return 0;
    return Math.round(((recent - previous) / previous) * 100);
  }, [chartData]);
  
  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    // Convert period to activityDataProcessor format
    if (onFilterChange) {
      onFilterChange({ period: newPeriod, actionFilter });
    }
  };
  
  const handleActionFilterChange = (newFilter) => {
    setActionFilter(newFilter);
    if (onFilterChange) {
      onFilterChange({ period: selectedPeriod, actionFilter: newFilter });
    }
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-sm text-blue-600">
            Aktivnosti: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium flex items-center">
            <BarChartIcon size={18} className="mr-2 text-blue-600" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-1">
          {/* Period Filter - matching original design */}
          <div className="flex items-center border border-slate-300 rounded-md p-1 bg-white">
            {[
              { value: '1day', label: '1d' },
              { value: '1week', label: '1w' },
              { value: '1month', label: '1m' },
              { value: '3months', label: '3m' },
              { value: '1year', label: '1y' },
              { value: 'all', label: 'Sve' }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-sm transition-colors',
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
          
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => handleActionFilterChange(e.target.value)}
            className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Sve akcije</option>
            <option value="material_added">Dodati materijali</option>
            <option value="material_removed">Uklonjeni materijali</option>
            <option value="equipment_added">Dodana oprema</option>
            <option value="equipment_removed">Uklonjena oprema</option>
            <option value="image_added">Dodane slike</option>
            <option value="image_removed">Uklonjene slike</option>
            <option value="comment_added">Dodani komentari</option>
            <option value="workorder_finished">Završeni nalozi</option>
            <option value="workorder_cancelled">Otkazani nalozi</option>
          </select>
          
          <Button 
            type="secondary" 
            size="small" 
            prefix={<FilterIcon size={14} />}
            onClick={() => {
              // Reset filters
              handlePeriodChange('all');
              handleActionFilterChange('all');
            }}
          >
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {total.toLocaleString('sr-RS')}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          <span className={cn(
            "font-medium",
            percentageChange > 0 ? "text-green-600" : percentageChange < 0 ? "text-red-600" : "text-slate-600"
          )}>
            {percentageChange > 0 ? '+' : ''}{percentageChange}%
          </span>
          {' '}u odnosu na prethodni period
        </p>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => {
                  // Value is already formatted display string, just return it
                  return value;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => value.toLocaleString('sr-RS')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={actionFilter === 'all' ? 'total' : 'value'}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Actions Summary Table */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Pregled akcija po tipovima:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { key: 'material_added', label: 'Dodati materijali' },
              { key: 'material_removed', label: 'Uklonjeni materijali' },
              { key: 'equipment_added', label: 'Dodana oprema' },
              { key: 'equipment_removed', label: 'Uklonjena oprema' },
              { key: 'image_added', label: 'Dodane slike' },
              { key: 'image_removed', label: 'Uklonjene slike' },
              { key: 'comment_added', label: 'Dodani komentari' },
              { key: 'workorder_finished', label: 'Završeni nalozi' },
              { key: 'workorder_cancelled', label: 'Otkazani nalozi' }
            ].map(action => {
              const actionTotal = chartData.reduce((sum, day) => sum + (day[action.key] || 0), 0);
              return (
                <div key={action.key} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                  <span className="text-slate-600">{action.label}:</span>
                  <span className="font-semibold text-slate-900">{actionTotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          <CalendarIcon size={14} className="text-slate-600" />
          Prikazano za: {
            selectedPeriod === '1day' ? 'Poslednji dan' :
            selectedPeriod === '1week' ? 'Poslednja nedelja' :
            selectedPeriod === '1month' ? 'Poslednji mesec' :
            selectedPeriod === '3months' ? 'Poslednja 3 meseca' :
            selectedPeriod === '1year' ? 'Poslednja godina' :
            selectedPeriod === 'all' ? 'Svi podaci' : 'Svi podaci'
          }
        </div>
        <div className="leading-none text-muted-foreground">
          {actionFilter === 'all' ? 'Ukupne aktivnosti' : 
           actionFilter === 'workorders_closed' ? 'Zatvoreni radni nalozi' :
           actionFilter === 'images_added' ? 'Dodane slike' :
           actionFilter === 'materials_used' ? 'Korišćeni materijali' :
           actionFilter === 'user_created' ? 'Kreirani korisnici' :
           actionFilter === 'technician_assigned' ? 'Dodeljeni tehnićari' :
           'Specifične aktivnosti'}
        </div>
      </CardFooter>
    </Card>
  );
};

export default TotalSalesChart;