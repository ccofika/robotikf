import React from 'react';
import { Dock } from './dock-two';
import {
  ActivityIcon,
  CheckCircleIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  BarChartIcon,
  AlertTriangleIcon,
  MapPinIcon,
  DollarSignIcon,
  UserCheckIcon,
  CalendarIcon,
  PieChartIcon
} from '../icons/SvgIcons';

const DashboardDock = ({ onKPISelect, activeKPI, kpiData }) => {
  // KPI dock items configuration
  const dockItems = [
    {
      icon: TrendingUpIcon,
      label: 'KPI Indicators',
      id: 'kpi',
      hasData: !!kpiData?.kpi
    },
    {
      icon: BarChartIcon,
      label: 'Analytics Charts',
      id: 'charts',
      hasData: !!kpiData?.charts
    },
    {
      icon: PieChartIcon,
      label: 'Data Tables',
      id: 'tables',
      hasData: !!kpiData?.tables
    },
    {
      icon: MapPinIcon,
      label: 'Interactive Map',
      id: 'map',
      hasData: !!kpiData?.map
    },
    {
      icon: AlertTriangleIcon,
      label: 'Cancellation Analysis',
      id: 'cancellation',
      hasData: !!kpiData?.cancellation
    },
    {
      icon: ClockIcon,
      label: 'Hourly Activity',
      id: 'hourly',
      hasData: !!kpiData?.hourly
    },
    {
      icon: DollarSignIcon,
      label: 'Financial Analysis',
      id: 'financial',
      hasData: !!kpiData?.financial
    },
    {
      icon: UserCheckIcon,
      label: 'Technician Comparison',
      id: 'technician',
      hasData: !!kpiData?.technician
    }
  ];

  // Transform dock items for the Dock component
  const transformedItems = dockItems.map(item => ({
    icon: item.icon,
    label: item.label,
    onClick: () => onKPISelect(item.id)
  }));

  return (
    <div className="dock-container">
      <div className="dock-background">
        <div className="flex items-center gap-2 p-2">
          {dockItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeKPI === item.id;
            const hasData = item.hasData;

            return (
              <div
                key={item.id}
                className={`dock-item ${isActive ? 'active' : ''}`}
                onClick={() => onKPISelect(item.id)}
                title={item.label}
              >
                <IconComponent className="w-5 h-5" />

                {/* Indicator */}
                <div className={`dock-indicator ${isActive ? 'active' : hasData ? 'loaded' : ''}`}></div>

                {/* Tooltip */}
                <div className="dock-tooltip">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardDock;