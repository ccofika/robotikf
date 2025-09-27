import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloseIcon,
  RefreshIcon,
  DownloadIcon,
  ExpandIcon,
  MinimizeIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';

// Import existing KPI components
import TotalSalesChart from './total-sales-chart';
import TrendChart from './TrendChart';
import KPITrendCards from './KPITrendCards';
import CancellationAnalysis from './CancellationAnalysis';
import HourlyActivityDistribution from './HourlyActivityDistribution';
import InteractiveActivityMap from './InteractiveActivityMap';
import FinancialAnalysis from './FinancialAnalysis';
import TechnicianComparison from './TechnicianComparison';

const KPIPanel = ({
  activeKPI,
  onClose,
  kpiData,
  filters,
  onRefresh,
  loading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  // Panel configuration for each KPI type
  const panelConfig = {
    map: {
      title: 'Interactive Map',
      component: InteractiveActivityMap,
      props: {
        activities: kpiData?.map?.activities || [],
        filters,
        loading: loading?.map
      }
    },
    cancellation: {
      title: 'Cancellation Analysis',
      component: CancellationAnalysis,
      props: {
        data: kpiData?.cancellation,
        filters,
        onRefresh: () => onRefresh('cancellation')
      }
    },
    hourly: {
      title: 'Hourly Activity Distribution',
      component: HourlyActivityDistribution,
      props: {
        data: kpiData?.hourly,
        filters,
        onRefresh: () => onRefresh('hourly')
      }
    },
    financial: {
      title: 'Financial Analysis',
      component: FinancialAnalysis,
      props: {
        data: kpiData?.financial,
        filters,
        onRefresh: () => onRefresh('financial')
      }
    },
    technician: {
      title: 'Technician Comparison',
      component: TechnicianComparison,
      props: {
        data: kpiData?.technician,
        filters,
        onRefresh: () => onRefresh('technician')
      }
    }
  };

  const currentConfig = panelConfig[activeKPI];

  const handleRefresh = async () => {
    setLocalLoading(true);
    try {
      await onRefresh(activeKPI);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log(`Downloading ${activeKPI} data...`);
  };

  if (!activeKPI || !currentConfig) {
    return null;
  }

  const Component = currentConfig.component;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`
          fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40
          ${isExpanded
            ? 'w-[95vw] h-[80vh]'
            : 'w-[90vw] max-w-4xl h-[60vh]'
          }
          bg-white rounded-2xl shadow-2xl border border-gray-200
          backdrop-blur-lg bg-white/95
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentConfig.title}
            </h2>
            {(loading?.[activeKPI] || localLoading) && (
              <RefreshIcon className="w-5 h-5 text-blue-500 animate-spin" />
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading?.[activeKPI] || localLoading}
              className="p-2"
            >
              <RefreshIcon className={`w-4 h-4 ${(loading?.[activeKPI] || localLoading) ? 'animate-spin' : ''}`} />
            </Button>

            {/* Download Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="p-2"
            >
              <DownloadIcon className="w-4 h-4" />
            </Button>

            {/* Expand/Minimize Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2"
            >
              {isExpanded ? (
                <MinimizeIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </Button>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-600"
            >
              <CloseIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 h-full overflow-auto">
          {loading?.[activeKPI] ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading {currentConfig.title.toLowerCase()}...</p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {Component && (
                <Component
                  {...currentConfig.props}
                  className="h-full"
                />
              )}
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full mb-2"></div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KPIPanel;