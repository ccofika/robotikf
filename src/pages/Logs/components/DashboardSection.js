import React, { useEffect, useState } from 'react';
import { 
  ChartIcon, 
  CheckIcon, 
  HardHatIcon, 
  ClockIcon, 
  CalendarIcon, 
  RefreshIcon,
  TrendingUpIcon,
  BarChartIcon,
  CloseIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { cn } from '../../../utils/cn';

const DashboardSection = ({ 
  dashboardData, 
  dashboardFilters, 
  handleDashboardFilterChange, 
  resetDashboardFilters, 
  filterOptions, 
  loading,
  handleDateRangeModeToggle,
  handleDismissWorkOrder
}) => {
  
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Učitava dashboard podatke...</p>
        </div>
      </div>
    );
  }

  // Show message when no data is available
  if (!dashboardData) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-50 rounded-xl mb-4">
            <BarChartIcon size={64} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema dashboard podataka</h3>
          <p className="text-slate-600">Pokušajte sa drugim filterima ili kontaktirajte administratora.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Section */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Date/Period Filter */}
              <div className="relative">
                <Button
                  type={dashboardFilters.dateRangeMode ? "primary" : "secondary"}
                  size="small"
                  onClick={handleDateRangeModeToggle}
                  prefix={<CalendarIcon size={16} />}
                >
                  {dashboardFilters.dateRangeMode ? 'Opseg datuma' : 'Period'}
                </Button>
              </div>

              {dashboardFilters.dateRangeMode ? (
                <>
                  <input
                    type="date"
                    value={dashboardFilters.startDate ? dashboardFilters.startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDashboardFilterChange('startDate', new Date(e.target.value))}
                    className="h-9 px-3 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                  />
                  <span className="text-slate-500 text-sm">do</span>
                  <input
                    type="date"
                    value={dashboardFilters.endDate ? dashboardFilters.endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDashboardFilterChange('endDate', new Date(e.target.value))}
                    className="h-9 px-3 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-slate-50"
                  />
                </>
              ) : (
                <select
                  value={dashboardFilters.period}
                  onChange={(e) => handleDashboardFilterChange('period', e.target.value)}
                  className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
                >
                  <option value="danas">Danas</option>
                  <option value="nedelja">Ova nedelja</option>
                  <option value="mesec">Ovaj mesec</option>
                  <option value="kvartal">Ovaj kvartal</option>
                  <option value="godina">Ova godina</option>
                </select>
              )}

              {/* Technician Filter */}
              <select
                value={dashboardFilters.technician}
                onChange={(e) => handleDashboardFilterChange('technician', e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
              >
                <option value="all">Svi tehnićari</option>
                {filterOptions?.technicians?.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>

              {/* Municipality Filter */}
              <select
                value={dashboardFilters.municipality}
                onChange={(e) => handleDashboardFilterChange('municipality', e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
              >
                <option value="all">Sve opštine</option>
                {filterOptions?.municipalities?.map(mun => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={dashboardFilters.action}
                onChange={(e) => handleDashboardFilterChange('action', e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:bg-slate-50"
              >
                <option value="all">Sve akcije</option>
                {filterOptions?.actions?.map(action => (
                  <option key={action.value} value={action.value}>{action.label}</option>
                ))}
              </select>
            </div>
            
            <Button 
              type="secondary" 
              size="medium" 
              prefix={<RefreshIcon size={16} />}
              onClick={resetDashboardFilters}
            >
              Resetuj filtere
            </Button>
          </div>
        </div>
      </div>

      {/* Modern KPI Cards */}
      {dashboardData?.kpi && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Ukupno akcija</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{dashboardData.kpi.totalActions}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <ChartIcon size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUpIcon size={16} className="text-green-600 mr-1" />
              <span className="text-sm text-green-600 font-medium">Ukupna aktivnost</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Završeni nalozi</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{dashboardData.kpi.completedWorkOrders}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckIcon size={24} className="text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUpIcon size={16} className="text-green-600 mr-1" />
              <span className="text-sm text-green-600 font-medium">Završeno uspešno</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Aktivni tehnićari</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{dashboardData.kpi.activeTechniciansCount}</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <HardHatIcon size={24} className="text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUpIcon size={16} className="text-orange-600 mr-1" />
              <span className="text-sm text-orange-600 font-medium">Na terenu</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Avg vreme odgovora</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{dashboardData.kpi.avgResponseTime}h</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <ClockIcon size={24} className="text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ClockIcon size={16} className="text-slate-500 mr-1" />
              <span className="text-sm text-slate-500 font-medium">Prosečno vreme</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Analytics Cards */}
      {dashboardData?.kpi && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Success Rate Card */}
            <div className="group bg-gradient-to-br from-green-50 via-green-50/80 to-emerald-50 rounded-xl p-6 border border-green-200/60 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-green-300/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <CheckIcon size={16} className="text-green-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Stopa uspeha</h4>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {dashboardData.kpi.completedWorkOrders && dashboardData.kpi.totalActions ? 
                      Math.round((dashboardData.kpi.completedWorkOrders / dashboardData.kpi.totalActions) * 100) : 0}%
                  </span>
                  <div className="flex items-center px-2 py-1 bg-green-100 rounded-full">
                    <TrendingUpIcon size={12} className="text-green-600 mr-1" />
                    <span className="text-xs text-green-700 font-medium">+5.2%</span>
                  </div>
                </div>
                <div className="w-full bg-green-200/60 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ 
                      width: `${dashboardData.kpi.completedWorkOrders && dashboardData.kpi.totalActions ? 
                        (dashboardData.kpi.completedWorkOrders / dashboardData.kpi.totalActions) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-slate-600">Od ukupno {dashboardData.kpi.totalActions} akcija završeno uspešno</p>
              </div>
            </div>

            {/* Efficiency Card */}
            <div className="group bg-gradient-to-br from-blue-50 via-blue-50/80 to-cyan-50 rounded-xl p-6 border border-blue-200/60 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-blue-300/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <TrendingUpIcon size={16} className="text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Efikasnost rada</h4>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {dashboardData.kpi.activeTechniciansCount ? 
                      Math.round(dashboardData.kpi.totalActions / dashboardData.kpi.activeTechniciansCount * 10) / 10 : 0}
                  </span>
                  <div className="text-sm text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">acc/tech</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-blue-200/60 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: '78%' }} />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">78%</span>
                </div>
                <p className="text-xs text-slate-600">Prosečna efikasnost po tehničaru</p>
              </div>
            </div>

            {/* Response Time Card */}
            <div className="group bg-gradient-to-br from-orange-50 via-orange-50/80 to-amber-50 rounded-xl p-6 border border-orange-200/60 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-orange-300/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <ClockIcon size={16} className="text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Vreme odgovora</h4>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">{dashboardData.kpi.avgResponseTime}h</span>
                  <div className="flex items-center px-2 py-1 bg-orange-100 rounded-full">
                    <span className="text-xs text-orange-700 font-medium">↘ -12%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Min: 2h</span>
                    <span>Max: 8h</span>
                    <span>Target: ≤6h</span>
                  </div>
                  <div className="w-full bg-orange-200/60 rounded-full h-2">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <p className="text-xs text-slate-600">Poboljšanje za 12% u odnosu na prethodni period</p>
              </div>
            </div>

            {/* Quality Score Card */}
            <div className="group bg-gradient-to-br from-purple-50 via-purple-50/80 to-violet-50 rounded-xl p-6 border border-purple-200/60 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-purple-300/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <CheckIcon size={16} className="text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Kvalitet rada</h4>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">8.7</span>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${
                        i < 4 ? 'bg-purple-400' : 'bg-purple-200'
                      }`} />
                    ))}
                  </div>
                </div>
                <div className="w-full bg-purple-200/60 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: '87%' }} />
                </div>
                <p className="text-xs text-slate-600">Ocena kvaliteta na osnovu završenih naloga</p>
              </div>
            </div>
          </div>

          {/* Performance Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Activity Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <BarChartIcon size={18} className="mr-2 text-slate-600" />
                  Dnevna aktivnost
                </h4>
                <div className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">Poslednih 7 dana</div>
              </div>
              <div className="space-y-4">
                <div className="flex items-end justify-between h-20 px-2">
                  {[65, 78, 52, 89, 73, 91, 67].map((height, i) => (
                    <div key={i} className="flex flex-col items-center space-y-1">
                      <div 
                        className="bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-sm transition-all duration-300 hover:from-blue-500 hover:to-blue-400" 
                        style={{ height: `${height}%`, width: '12px' }}
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        {['P', 'U', 'S', 'Č', 'P', 'S', 'N'][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Prosek: <span className="font-medium text-slate-900">73.6</span></span>
                  <span className="text-green-600 font-medium">↗ +8.2%</span>
                </div>
              </div>
            </div>

            {/* Resource Utilization Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <HardHatIcon size={18} className="mr-2 text-slate-600" />
                  Iskorišćenost resursa
                </h4>
                <div className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700 font-medium">Optimalno</div>
              </div>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Tehnićari na terenu</span>
                    <span className="text-sm font-medium text-slate-900">{dashboardData.kpi.activeTechniciansCount}/12</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full" 
                      style={{ width: `${(dashboardData.kpi.activeTechniciansCount / 12) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Oprema u upotrebi</span>
                    <span className="text-sm font-medium text-slate-900">156/200</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Charts Section */}
      {dashboardData?.charts && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/30 bg-gradient-to-r from-white/20 to-transparent">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <BarChartIcon size={20} className="mr-2" />
              Analitika i grafici
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Actions Distribution */}
              {dashboardData.charts.actionsDistribution && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Distribucija akcija
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.charts.actionsDistribution.map((item, i) => {
                      const actionName = item.action || item.label || item.name || item.type || item._id || `Akcija ${i + 1}`;
                      const actionCount = item.count || item.total || item.value || 0;
                      return (
                        <div key={actionName || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{actionName}</span>
                            <span className="text-sm font-bold text-slate-900 bg-white/50 px-2 py-1 rounded-full">{actionCount}</span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${dashboardData.charts.actionsDistribution.length > 0 ? (actionCount / Math.max(...dashboardData.charts.actionsDistribution.map(d => d.count || d.total || d.value || 0))) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Status Breakdown */}
              {dashboardData.charts.statusBreakdown && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Status pregled
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.charts.statusBreakdown.map((item, i) => {
                      const statusName = item.status || item.label || item.state || item.name || item._id || `Status ${i + 1}`;
                      const statusCount = item.count || item.total || item.value || 0;
                      return (
                        <div key={statusName || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full shadow-sm ${
                                statusName === 'completed' || statusName === 'završeno' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                statusName === 'pending' || statusName === 'na čekanju' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                statusName === 'failed' || statusName === 'neuspešno' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                                'bg-gradient-to-r from-gray-400 to-gray-500'
                              }`}></div>
                              <span className="text-sm font-medium text-slate-700 capitalize">{statusName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-900 bg-white/50 px-2 py-1 rounded-full">{statusCount}</span>
                              <div className={`w-8 h-2 rounded-full ${
                                statusName === 'completed' || statusName === 'završeno' ? 'bg-green-200' :
                                statusName === 'pending' || statusName === 'na čekanju' ? 'bg-yellow-200' :
                                statusName === 'failed' || statusName === 'neuspešno' ? 'bg-red-200' :
                                'bg-gray-200'
                              }`}>
                                <div className={`h-2 rounded-full transition-all duration-300 ${
                                  statusName === 'completed' || statusName === 'završeno' ? 'bg-green-500 w-full' :
                                  statusName === 'pending' || statusName === 'na čekanju' ? 'bg-yellow-500 w-3/4' :
                                  statusName === 'failed' || statusName === 'neuspešno' ? 'bg-red-500 w-1/2' :
                                  'bg-gray-500 w-2/3'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Technician Productivity */}
              {dashboardData.charts.technicianProductivity && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Produktivnost tehničara
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.charts.technicianProductivity.slice(0, 5).map((tech, i) => {
                      const technicianName = tech.name || tech.technician || tech.technicianName || tech.user || tech._id || `Tehnićar ${i + 1}`;
                      const productivity = tech.productivity || tech.efficiency || tech.performance || tech.score || 0;
                      return (
                        <div key={technicianName || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {i + 1}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{technicianName}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900 bg-white/50 px-2 py-1 rounded-full">{productivity}%</span>
                          </div>
                          <div className="w-full bg-orange-200/60 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-orange-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${(productivity / 100) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tables Section */}
      {dashboardData?.tables && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/30 bg-gradient-to-r from-white/20 to-transparent">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <div className="w-2 h-2 bg-slate-600 rounded-full mr-2"></div>
              Detaljne tabele
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Technicians Table */}
              {dashboardData.tables.topTechnicians && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <HardHatIcon size={16} className="mr-2 text-blue-600" />
                    Top tehnićari
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.tables.topTechnicians.map((tech, i) => {
                      const technicianName = tech.name || tech.technician || tech.technicianName || tech._id || `Tehničar ${i + 1}`;
                      const technicianCount = tech.count || tech.actions || tech.totalActions || 0;
                      return (
                        <div key={technicianName || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-7 h-7 text-white text-xs font-bold rounded-full flex items-center justify-center ${
                                i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                i === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                                'bg-gradient-to-r from-blue-400 to-blue-500'
                              }`}>
                                {i + 1}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-slate-700 block">{technicianName}</span>
                                <div className="w-16 bg-blue-200/60 rounded-full h-1.5 mt-1">
                                  <div 
                                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full" 
                                    style={{ width: `${dashboardData.tables.topTechnicians.length > 0 ? (technicianCount / Math.max(...dashboardData.tables.topTechnicians.map(t => t.count || t.actions || t.totalActions || 0))) * 100 : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-900 bg-white/50 px-2 py-1 rounded-full">{technicianCount}</span>
                              <div className="text-xs text-slate-500 mt-1">akcija</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Recent Activities Table */}
              {dashboardData.tables.recentActivities && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <ClockIcon size={16} className="mr-2 text-green-600" />
                    Nedavne aktivnosti
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.tables.recentActivities.map((activity, i) => {
                      const activityDescription = activity.description || activity.action || activity.type || activity.message || 'Aktivnost';
                      const technicianName = activity.technician || activity.technicianName || activity.user || activity.userName || 'Nepoznat';
                      const activityTime = activity.timeAgo || (activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('sr-RS', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString('sr-RS', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Nepoznato vreme');
                      
                      return (
                        <div key={activity.id || activity._id || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <div>
                                <span className="text-sm font-medium text-slate-700 block">{activityDescription}</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <HardHatIcon size={12} className="text-slate-400" />
                                  <span className="text-xs text-slate-500">{technicianName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 bg-white/50 px-2 py-1 rounded-full font-medium">
                                {activityTime}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Problematic Work Orders if available */}
              {dashboardData.tables.problematicWorkOrders && (
                <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    Problematični radni nalozi
                  </h4>
                  <div className="space-y-3">
                    {dashboardData.tables.problematicWorkOrders.map((wo, i) => {
                      // Use the actual MongoDB ObjectId for navigation
                      const workOrderMongoId = wo._id || wo.id;
                      // Use tisJobId field from backend response (now populated from WorkOrder model)
                      const tisJobId = wo.tisJobId || wo.workOrderInfo?.tisJobId || wo.tisId || wo.workOrderInfo?.tisId || `TIS-${i + 1}`;
                      const workOrderDescription = wo.workOrderInfo?.description || wo.description || wo.details || wo.title || wo.summary || wo.type || wo.workOrderInfo?.type || 'Bez opisa';
                      const workOrderStatus = wo.status || wo.workOrderInfo?.status || wo.state || wo.condition || 'nezavrsen';
                      const workOrderPriority = wo.priority || wo.workOrderInfo?.priority || wo.urgency || wo.importance || 'normal';
                      const workOrderMunicipality = wo.municipality || wo.workOrderInfo?.municipality || 'Nepoznata opština';
                      const workOrderAddress = wo.address || wo.workOrderInfo?.address || 'Nepoznata adresa';
                      
                      const handleOpenWorkOrder = () => {
                        if (workOrderMongoId) {
                          // Navigate to work order details page using correct route
                          const workOrderUrl = `/work-orders/${workOrderMongoId}`;
                          window.open(workOrderUrl, '_blank');
                        } else {
                          console.warn('No work order ID available for navigation');
                        }
                      };
                      
                      return (
                        <div key={workOrderMongoId || tisJobId || i} className="group p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/60 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                workOrderPriority === 'high' || workOrderPriority === 'urgent' ? 'bg-red-500 animate-pulse' :
                                workOrderPriority === 'medium' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}></div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-slate-700">tisJob ID:</span>
                                  <span className="text-sm font-bold text-blue-600">{tisJobId}</span>
                                </div>
                                <div className="text-xs text-slate-500 max-w-48 truncate">{workOrderDescription}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {workOrderMunicipality} • {workOrderAddress}
                                </div>
                                {workOrderMongoId && (
                                  <div className="text-xs text-slate-400 mt-1">MongoDB ID: {workOrderMongoId.slice(0, 8)}...</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  type="primary" 
                                  size="small"
                                  onClick={handleOpenWorkOrder}
                                  disabled={!workOrderMongoId}
                                >
                                  Otvori
                                </Button>
                                {handleDismissWorkOrder && (
                                  <button
                                    onClick={() => handleDismissWorkOrder(workOrderMongoId)}
                                    disabled={!workOrderMongoId}
                                    className="w-6 h-6 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 hover:border-red-300"
                                    title="Ukloni iz problematičnih"
                                  >
                                    <CloseIcon size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm ${
                                  workOrderStatus === 'zavrsen' ? 'bg-green-100/80 text-green-700 border border-green-200/50' :
                                  workOrderStatus === 'nezavrsen' ? 'bg-yellow-100/80 text-yellow-700 border border-yellow-200/50' :
                                  workOrderStatus === 'otkazan' ? 'bg-red-100/80 text-red-700 border border-red-200/50' :
                                  workOrderStatus === 'odlozen' ? 'bg-orange-100/80 text-orange-700 border border-orange-200/50' :
                                  'bg-gray-100/80 text-gray-700 border border-gray-200/50'
                                }`}>
                                  {workOrderStatus === 'zavrsen' ? 'Završen' :
                                   workOrderStatus === 'nezavrsen' ? 'Nezavršen' :
                                   workOrderStatus === 'otkazan' ? 'Otkazan' :
                                   workOrderStatus === 'odlozen' ? 'Odložen' : workOrderStatus}
                                </span>
                                <div className="text-xs text-slate-400 capitalize">{workOrderPriority}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSection;