import React, { useState, useMemo } from 'react';
import { Equipment, User, Booking, UsageLog } from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { PdfReportModal } from './PdfReportModal';
import { MaintenanceForecastView } from './MaintenanceForecastView';
import { HourlyUsageDensityChart } from './HourlyUsageDensityChart';
import { 
  BarChart3, 
  Download, 
  Clock, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  FlaskConical,
  Filter,
  Calendar,
  FileText,
  Printer,
  ChevronDown,
  Wrench,
  Sparkles,
  Flame,
  FolderGit2,
  Package,
  Coins
} from 'lucide-react';

interface AnalyticsViewProps {
  equipmentList: Equipment[];
  allUsers: User[];
  bookings: Booking[];
  logs: UsageLog[];
  currentUser: User;
  onRefresh?: () => void;
  onSelectEquipmentForHub?: (equipment: Equipment) => void;
  onOpenBookingModal?: (equipmentId?: string, preferredDate?: string, preferredStartTime?: string, preferredEndTime?: string) => void;
  defaultSubTab?: 'analytics' | 'density_forecast' | 'maintenance_forecast';
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  equipmentList,
  allUsers,
  bookings,
  logs,
  currentUser,
  onRefresh,
  onSelectEquipmentForHub,
  onOpenBookingModal,
  defaultSubTab = 'analytics',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'density_forecast' | 'maintenance_forecast'>(defaultSubTab);

  // Filter States: Date Range & Equipment
  const today = localDateStr();
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('all');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Quick Date Range Presets
  const handleSetPreset = (preset: '7days' | '30days' | 'thisMonth' | 'all') => {
    const now = new Date();
    if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setStartDate(localDateStr(past7));
      setEndDate(today);
    } else if (preset === '30days') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setStartDate(localDateStr(past30));
      setEndDate(today);
    } else if (preset === 'thisMonth') {
      setStartDate(firstDayOfMonth);
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered dataset according to user criteria
  const filteredLogs = logs.filter((log) => {
    if (selectedEquipmentId !== 'all' && log.equipmentId !== selectedEquipmentId) {
      return false;
    }
    const logDate = log.checkInTime.split('T')[0];
    if (startDate && logDate < startDate) return false;
    if (endDate && logDate > endDate) return false;
    return true;
  });

  const filteredBookings = bookings.filter((b) => {
    if (selectedEquipmentId !== 'all' && b.equipmentId !== selectedEquipmentId) {
      return false;
    }
    if (startDate && b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    return true;
  });

  // Filtered KPI statistics
  const filteredSessionsCount = filteredLogs.length;
  const filteredBookingsCount = filteredBookings.length;
  const filteredMinutes = filteredLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  const filteredHours = (filteredMinutes / 60).toFixed(1);
  const filteredSamples = filteredLogs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);
  const filteredIncidents = filteredLogs.filter((l) => l.incidentReport?.hasIncident).length;
  const filteredMaterialCostVND = filteredLogs.reduce((acc, l) => acc + (l.materialCostVND || 0), 0);

  // Project consumable expenditure & booking distribution
  const projectStats = useMemo(() => {
    const map: Record<string, { code: string; bookingCount: number; costVND: number; hours: number }> = {};
    filteredBookings.forEach((b) => {
      if (b.projectCode) {
        if (!map[b.projectCode]) {
          map[b.projectCode] = { code: b.projectCode, bookingCount: 0, costVND: 0, hours: 0 };
        }
        map[b.projectCode].bookingCount += 1;
      }
    });
    filteredLogs.forEach((l) => {
      if (l.projectCode) {
        if (!map[l.projectCode]) {
          map[l.projectCode] = { code: l.projectCode, bookingCount: 0, costVND: 0, hours: 0 };
        }
        map[l.projectCode].costVND += l.materialCostVND || 0;
        map[l.projectCode].hours += parseFloat(((l.durationMinutes || 0) / 60).toFixed(1));
      }
    });
    return Object.values(map).sort((a, b) => b.costVND - a.costVND);
  }, [filteredBookings, filteredLogs]);

  const selectedEquipment = selectedEquipmentId !== 'all'
    ? equipmentList.find((e) => e.id === selectedEquipmentId)
    : null;

  // Equipment frequency calculation (using filtered bookings/logs)
  const equipmentUsageStats = equipmentList.map((eq) => {
    const eqBookings = bookings.filter((b) => {
      if (b.equipmentId !== eq.id) return false;
      if (startDate && b.date < startDate) return false;
      if (endDate && b.date > endDate) return false;
      return true;
    });

    const eqLogs = logs.filter((l) => {
      if (l.equipmentId !== eq.id) return false;
      const d = l.checkInTime.split('T')[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    const minutes = eqLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    const hours = (minutes / 60).toFixed(1);
    const samples = eqLogs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);

    return {
      equipment: eq,
      bookingCount: eqBookings.length,
      hours: parseFloat(hours),
      samples,
    };
  }).sort((a, b) => b.bookingCount - a.bookingCount);

  const maxBookings = Math.max(...equipmentUsageStats.map((s) => s.bookingCount), 1);

  // Department distribution
  const departmentCounts: Record<string, number> = {};
  filteredBookings.forEach((b) => {
    const user = allUsers.find((u) => u.id === b.userId);
    const dept = user?.department || 'Khác';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });

  const deptEntries = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]);

  // Export handlers
  const handleExportFilteredCSV = () => {
    LabStorage.exportFilteredReportToCSV({
      startDate,
      endDate,
      equipmentId: selectedEquipmentId,
      logs,
      equipmentList,
      users: allUsers,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {activeSubTab === 'maintenance_forecast'
              ? 'Dự Báo & Kế Hoạch Bảo Trì Thiết Bị'
              : activeSubTab === 'density_forecast'
              ? 'Dự Báo Mật Độ Sử Dụng Theo Giờ & Tránh Giờ Cao Điểm'
              : 'Thống Kê Vận Hành & Dự Báo Mật Độ Phòng Lab'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {activeSubTab === 'maintenance_forecast'
              ? 'Thuật toán tính toán giờ chạy thực tế từ nhật ký bàn giao, hệ số gia tốc hao mòn và dự báo kiểm định định kỳ'
              : activeSubTab === 'density_forecast'
              ? 'Phân tích lịch sử đăng ký theo 15 khung giờ trong ngày, nhận diện giờ cao điểm và gợi ý khung giờ vàng để nghiên cứu viên đặt lịch thuận tiện'
              : 'Bộ lọc đa chiều theo khoảng thời gian và thiết bị, tích hợp biểu đồ dự báo mật độ theo giờ và hỗ trợ xuất báo cáo PDF / Excel'}
          </p>
        </div>

        {/* Primary Export Actions for Analytics Tab */}
        {activeSubTab === 'analytics' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo PDF / In A4</span>
            </button>

            <button
              onClick={handleExportFilteredCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất File Excel (.csv)</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tổng Quan Sử Dụng & Báo Cáo</span>
        </button>

        <button
          onClick={() => setActiveSubTab('density_forecast')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeSubTab === 'density_forecast'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Dự Báo Mật Độ Theo Giờ</span>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5 text-rose-700" /> Tránh Cao Điểm
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance_forecast')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeSubTab === 'maintenance_forecast'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Dự Báo Lịch Bảo Trì & Kiểm Định</span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> Thuật Toán
          </span>
        </button>
      </div>

      {/* Content Rendering */}
      {activeSubTab === 'maintenance_forecast' ? (
        <MaintenanceForecastView
          equipmentList={equipmentList}
          logs={logs}
          bookings={bookings}
          currentUser={currentUser}
          onRefresh={onRefresh || (() => {})}
          onSelectEquipmentForHub={onSelectEquipmentForHub}
        />
      ) : activeSubTab === 'density_forecast' ? (
        <div className="space-y-6">
          <HourlyUsageDensityChart
            bookings={bookings}
            logs={logs}
            equipmentList={equipmentList}
            currentUser={currentUser}
            onOpenBookingModal={onOpenBookingModal}
            initialEquipmentId={selectedEquipmentId}
          />
        </div>
      ) : (
        <>
          {/* Interactive Filter Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Bộ Lọc Dữ Liệu Báo Cáo</span>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <span className="text-slate-400 mr-1">Khoảng nhanh:</span>
            <button
              onClick={() => handleSetPreset('7days')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              7 ngày qua
            </button>
            <button
              onClick={() => handleSetPreset('30days')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              30 ngày qua
            </button>
            <button
              onClick={() => handleSetPreset('thisMonth')}
              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 transition-colors font-semibold"
            >
              Tháng này
            </button>
            <button
              onClick={() => handleSetPreset('all')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Toàn bộ
            </button>
          </div>
        </div>

        {/* Filter inputs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Equipment selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
              <span>Thiết Bị Cần Báo Cáo</span>
            </label>
            <select
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="all">Tất cả thiết bị trong phòng Lab</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name} ({eq.room})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Từ Ngày</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Đến Ngày</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Filter state indicator note */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div>
            Đang lọc: <strong className="text-slate-800">{selectedEquipment ? `[${selectedEquipment.code}] ${selectedEquipment.name}` : 'Tất cả thiết bị'}</strong> · Từ <span className="font-mono">{startDate || 'đầu'}</span> đến <span className="font-mono">{endDate || 'nay'}</span>
          </div>

          <div className="text-[11px] text-blue-700 font-medium">
            Khớp {filteredSessionsCount} ca vận hành & {filteredBookingsCount} lịch đăng ký
          </div>
        </div>
      </div>

      {/* Filtered KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Bookings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Phiên đăng ký trong kỳ</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {filteredBookingsCount} <span className="text-xs font-normal text-slate-400">phiên</span>
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Thực tế vận hành: {filteredSessionsCount} ca</span>
          </div>
        </div>

        {/* Running Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Thời gian máy vận hành</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {filteredHours} <span className="text-xs font-normal text-slate-400">giờ</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {filteredMinutes} phút chạy thực tế
          </div>
        </div>

        {/* Samples Processed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Mẫu phẩm đã phân tích</span>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {filteredSamples} <span className="text-xs font-normal text-slate-400">mẫu</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {selectedEquipment ? `Trên máy ${selectedEquipment.code}` : 'Toàn bộ các máy'}
          </div>
        </div>

        {/* Consumable Supplies Cost by Projects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tiêu hao vật tư đề tài</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {filteredMaterialCostVND > 0 ? (filteredMaterialCostVND / 1000000).toFixed(1) : '0'} <span className="text-xs font-normal text-slate-400">tr đ</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate" title={`${filteredMaterialCostVND.toLocaleString('vi-VN')} VND`}>
            {filteredMaterialCostVND.toLocaleString('vi-VN')} VND
          </div>
        </div>

        {/* Incident Monitoring */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sự cố kỹ thuật</span>
            <AlertTriangle className={`w-4 h-4 ${filteredIncidents > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${filteredIncidents > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {filteredIncidents} <span className="text-xs font-normal text-slate-400">vụ việc</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {filteredIncidents === 0 ? 'Vận hành ổn định' : 'Cần bảo trì kỹ thuật'}
          </div>
        </div>
      </div>

      {/* Featured Hourly Usage Density Forecast Section */}
      <HourlyUsageDensityChart
        bookings={filteredBookings}
        logs={filteredLogs}
        equipmentList={equipmentList}
        currentUser={currentUser}
        onOpenBookingModal={onOpenBookingModal}
        initialEquipmentId={selectedEquipmentId}
      />

      {/* Main Charts & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Equipment utilization chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tần Suất Sử Dụng Theo Từng Thiết Bị
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xếp hạng số lượt đăng ký, số giờ và mẫu phẩm theo khoảng thời gian đã lọc
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {equipmentList.length} thiết bị
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {equipmentUsageStats.map((stat) => {
              const percentage = Math.round((stat.bookingCount / maxBookings) * 100);
              const isCurrentSelected = stat.equipment.id === selectedEquipmentId;

              return (
                <div
                  key={stat.equipment.id}
                  onClick={() => setSelectedEquipmentId(stat.equipment.id)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer space-y-1 ${
                    isCurrentSelected ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                  }`}
                  title="Nhấp để lọc riêng cho thiết bị này"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {stat.equipment.code}
                      </span>
                      <span className="text-slate-700 truncate max-w-[200px] sm:max-w-xs font-medium">
                        {stat.equipment.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                      <span><strong>{stat.bookingCount}</strong> lượt</span>
                      <span>·</span>
                      <span>{stat.hours}h</span>
                      <span>·</span>
                      <span>{stat.samples} mẫu</span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCurrentSelected ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.max(percentage, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 col: Department breakdown & Export Shortcuts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Phân Bổ Nhu Cầu Theo Khoa / Đơn Vị
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tỷ lệ trong kỳ báo cáo ({filteredBookingsCount} lượt)
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {deptEntries.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Chưa có dữ liệu trong khoảng thời gian này.
                </div>
              ) : (
                deptEntries.map(([dept, count]) => {
                  const pct = Math.round((count / Math.max(filteredBookingsCount, 1)) * 100) || 0;

                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-800 font-medium truncate max-w-[180px]">
                          {dept}
                        </span>
                        <span className="font-mono text-slate-600 font-semibold">
                          {count} lượt ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Project Tracking Consumables Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span>Tiêu Hao Vật Tư Theo Đề Tài</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp chi phí thực tế theo đề tài nghiên cứu
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {projectStats.length} đề tài
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {projectStats.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">
                  Chưa có ca đăng ký nào được gắn thẻ đề tài trong kỳ này.
                </div>
              ) : (
                projectStats.map((p) => {
                  const maxCost = Math.max(...projectStats.map((s) => s.costVND), 1);
                  const pct = Math.round((p.costVND / maxCost) * 100) || 5;

                  return (
                    <div key={p.code} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-800">
                          {p.code}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-500">{p.bookingCount} ca ({p.hours}h)</span>
                          <span className="font-semibold text-emerald-700">
                            {p.costVND.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Tùy Chọn Xuất Báo Cáo
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Báo cáo được khởi tạo tự động dựa trên đúng thiết bị và khoảng ngày bạn vừa chọn.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="w-full py-2 px-3 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Xem Trước & In Báo Cáo PDF</span>
              </button>

              <button
                onClick={handleExportFilteredCSV}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Bảng Tính Excel (.csv)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    )}

    {/* PDF Report Preview and Print Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        selectedEquipmentId={selectedEquipmentId}
        equipmentList={equipmentList}
        allUsers={allUsers}
        bookings={bookings}
        logs={logs}
        currentUser={currentUser}
      />
    </div>
  );
};
