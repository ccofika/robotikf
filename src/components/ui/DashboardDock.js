import React from 'react';
import { Dock } from './dock-two';
import { MapPin, TriangleAlert, Clock, DollarSign, UserCheck } from 'lucide-react';
import { cx } from '../../security/sx/ui';

const DashboardDock = ({ onKPISelect, activeKPI, kpiData }) => {
  // KPI dock items configuration
  const dockItems = [
    {
      icon: MapPin,
      label: 'Interactive Map',
      id: 'map',
      hasData: !!kpiData?.map
    },
    {
      icon: TriangleAlert,
      label: 'Cancellation Analysis',
      id: 'cancellation',
      hasData: !!kpiData?.cancellation
    },
    {
      icon: Clock,
      label: 'Hourly Activity',
      id: 'hourly',
      hasData: !!kpiData?.hourly
    },
    {
      icon: DollarSign,
      label: 'Financial Analysis',
      id: 'financial',
      hasData: !!kpiData?.financial
    },
    {
      icon: UserCheck,
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
    <nav className="mx-logdash-dock" aria-label="KPI">
      {dockItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeKPI === item.id;
        const hasData = item.hasData;

        return (
          <button
            key={item.id}
            type="button"
            className={cx('mx-logdash-dock__btn', isActive && 'is-on')}
            onClick={() => onKPISelect(item.id)}
            title={item.label}
            aria-label={item.label}
            aria-pressed={isActive}
          >
            <IconComponent size={20} strokeWidth={1.8} aria-hidden="true" />

            {/* Indikator: otvoren ili učitan */}
            {(isActive || hasData) && <span className="mx-logdash-dock__dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
};

export default DashboardDock;
