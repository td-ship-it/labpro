import { localDateStr } from '../services/storage';
import React, { useState, useMemo } from 'react';
import { Booking, UsageLog, Equipment, User } from '../types';
import { 
  calculateHourlyUsageForecast, 
  HourlySlotStat, 
  OptimalTimeWindow,
  DAY_OF_WEEK_LABELS 
} from '../services/hourlyUsageForecast';
import { 
  Clock, 
  Flame, 
  Sparkles, 
  Calendar, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Info, 
  ChevronRight, 
  BarChart3, 
  Grid3X3,
  FlaskConical,
  ArrowRight,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface HourlyUsageDensityChartProps {
  bookings: Booking[];
  logs?: UsageLog[];
  equipmentList: Equipment[];
  currentUser?: User;
  onOpenBookingModal?: (equipmentId?: string, preferredDate?: string, preferredStartTime?: string, preferredEndTime?: string) => void;
  initialEquipmentId?: string;
}

export const HourlyUsageDensityChart: React.FC<HourlyUsageDensityChartProps> = ({
  bookings,
  logs,
  equipmentList,
  currentUser,
  onOpenBookingModal,
  initialEquipmentId = 'all',
}) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(initialEquipmentId);
  const [dayFilter, setDayFilter] = useState<'all' | 'weekdays' | 'weekends'>('all');
  const [viewMode, setViewMode] = useState<'bar_chart' | 'heatmap'>('bar_chart');
  const [activeSelectedHour, setActiveSelectedHour] = useState<number | null>(null);

  // Calculate forecast data using our algorithm
  const forecast = useMemo(() => {
    return calculateHourlyUsageForecast({
      bookings,
      logs,
      equipmentList,
      selectedEquipmentId,
      dayFilter,
    });
  }, [bookings, logs, equipmentList, selectedEquipmentId, dayFilter]);

  // Selected equipment details
  const selectedEq = equipmentList.find((e) => e.id === selectedEquipmentId);

  // Active slot for detail card
  const selectedSlot = activeSelectedHour !== null
    ? forecast.hourlySlots.find((s) => s.hour === activeSelectedHour) || forecast.hourlySlots[3]
    : forecast.hourlySlots.find((s) => s.trafficLevel === 'peak') || forecast.hourlySlots[3]; // default peak 10:00

  // Handler for quick booking click
  const handleQuickBook = (startTime: string, endTime: string) => {
    if (onOpenBookingModal) {
      const eqId = selectedEquipmentId !== 'all' ? selectedEquipmentId : undefined;
      const todayStr = localDateStr();
      onOpenBookingModal(eqId, todayStr, startTime, endTime);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-6">
      {/* 1. Header & Context */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Dự Báo Mật Độ Sử Dụng Theo Giờ Trong Ngày
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Tránh Giờ Cao Điểm
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Thuật toán phân tích tổng hợp lịch sử {forecast.totalAnalyzedBookings} lượt đặt máy và nhật ký bàn giao thực tế để dự báo khung giờ kẹt máy, giúp bạn chọn thời điểm lý tưởng và không phải xếp hàng chờ đợi.
            </p>
          </div>

          {/* Controls: Mode Switcher */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setViewMode('bar_chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'bar_chart'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Biểu Đồ Cột</span>
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Bản Đồ Nhiệt Tuần</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Equipment Filter */}
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Thiết bị:</span>
              <select
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 max-w-xs"
              >
                <option value="all">Toàn bộ phòng Lab (Tất cả thiết bị)</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Ngày:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDayFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dayFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tất cả ngày
                </button>
                <button
                  onClick={() => setDayFilter('weekdays')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dayFilter === 'weekdays'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Thứ 2 - Thứ 6
                </button>
                <button
                  onClick={() => setDayFilter('weekends')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dayFilter === 'weekends'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cuối tuần
                </button>
              </div>
            </div>
          </div>

          {/* Quick Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span>&lt;35% Thấp điểm</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
              <span>35-60% Trung bình</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" />
              <span>60-75% Khá đông</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
              <span>&gt;75% Cao điểm</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="px-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peak Warning Window */}
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Khung Giờ Cao Điểm</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-200/80 text-rose-900 text-[10px] uppercase tracking-wider font-extrabold">
              Nên Tránh
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-rose-900">
            {forecast.peakHourRanges[0] || '09:00 - 11:30'}
          </div>
          <p className="text-[11px] text-rose-700 leading-snug">
            Mật độ đạt trên 85%. Tỷ lệ trùng ca cao, dễ phải chờ chuyển giao máy.
          </p>
        </div>

        {/* Optimal Golden Window */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Khung Giờ Vàng</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] uppercase tracking-wider font-extrabold">
              Khuyên Dùng
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-900">
            11:30 - 13:30 & 07:30 - 09:00
          </div>
          <p className="text-[11px] text-emerald-700 leading-snug">
            Mật độ dưới 25%. Máy hầu như luôn rảnh, đo mẫu nhanh chóng không chờ đợi.
          </p>
        </div>

        {/* Congestion Rate */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tỷ Lệ Giờ Cao Điểm</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {forecast.overallCongestionRate}% <span className="text-xs font-normal text-slate-400">thời lượng</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Có {forecast.peakHours.length} khung giờ trong ngày có mật độ &gt; 65%.
          </p>
        </div>

        {/* Busiest vs Quietest Day */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Mật Độ Theo Tuần</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-bold text-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-normal">Đông đúc nhất:</span>
              <span className="text-rose-600 font-mono font-bold">{forecast.busiestDayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-normal">Yên tĩnh nhất:</span>
              <span className="text-emerald-600 font-mono font-bold">{forecast.quietestDayName}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Đề xuất nghiên cứu chuyên sâu vào {forecast.quietestDayName}.
          </p>
        </div>
      </div>

      {/* 3. Main Visualization Area */}
      <div className="px-5 sm:px-6">
        {viewMode === 'bar_chart' ? (
          /* A. Hourly Column Bar Chart */
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Biểu Đồ Dự Báo Mật Độ Theo Giờ Trong Ngày ({forecast.equipmentName})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Nhấp vào từng cột giờ để xem chi tiết mật độ, thiết bị thường dùng và lời khuyên đặt máy.
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Ca phân tích: <strong>07:00</strong> đến <strong>22:00</strong>
              </div>
            </div>

            {/* Interactive Bars Container */}
            <div className="pt-8 pb-2">
              <div className="grid grid-cols-15 gap-1.5 sm:gap-2.5 items-end h-56 w-full px-1">
                {forecast.hourlySlots.map((slot) => {
                  const isSelected = activeSelectedHour === slot.hour;
                  const isPeak = slot.trafficLevel === 'peak';
                  const isOptimal = slot.trafficLevel === 'low';

                  // Dynamic color styles
                  let barColor = 'from-emerald-500 to-teal-400';
                  let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  if (slot.trafficLevel === 'peak') {
                    barColor = 'from-rose-600 to-pink-500';
                    badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
                  } else if (slot.trafficLevel === 'high') {
                    barColor = 'from-orange-500 to-amber-500';
                    badgeBg = 'bg-orange-100 text-orange-800 border-orange-300';
                  } else if (slot.trafficLevel === 'moderate') {
                    barColor = 'from-amber-400 to-yellow-300';
                    badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
                  }

                  return (
                    <div
                      key={slot.hour}
                      onClick={() => setActiveSelectedHour(slot.hour)}
                      className={`flex flex-col items-center justify-end h-full cursor-pointer group transition-transform ${
                        isSelected ? 'scale-105 z-10' : 'hover:-translate-y-1'
                      }`}
                    >
                      {/* Top Density Percentage Tooltip Indicator */}
                      <div className="mb-1 text-center">
                        <span
                          className={`inline-block px-1 sm:px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 shadow-xs ' + badgeBg
                              : isPeak
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : isOptimal
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200 group-hover:border-slate-400'
                          }`}
                        >
                          {slot.densityPercentage}%
                        </span>
                      </div>

                      {/* Bar Pillar */}
                      <div className="w-full bg-slate-200/80 rounded-t-lg h-40 flex items-end p-0.5 overflow-hidden">
                        <div
                          className={`w-full rounded-t-md bg-gradient-to-t transition-all duration-300 ${barColor} ${
                            isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : ''
                          }`}
                          style={{ height: `${Math.max(slot.densityPercentage, 8)}%` }}
                        />
                      </div>

                      {/* Hour Label */}
                      <div className="mt-2 text-center">
                        <span
                          className={`block font-mono text-[10px] sm:text-[11px] font-semibold tracking-tight transition-colors ${
                            isSelected
                              ? 'text-indigo-600 font-bold scale-110'
                              : isPeak
                              ? 'text-rose-700 font-bold'
                              : 'text-slate-600 group-hover:text-slate-900'
                          }`}
                        >
                          {slot.shortLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Hour Inspection Card */}
            {selectedSlot && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        selectedSlot.trafficLevel === 'peak'
                          ? 'bg-rose-600 ring-4 ring-rose-100'
                          : selectedSlot.trafficLevel === 'high'
                          ? 'bg-orange-500 ring-4 ring-orange-100'
                          : selectedSlot.trafficLevel === 'moderate'
                          ? 'bg-amber-400 ring-4 ring-amber-100'
                          : 'bg-emerald-500 ring-4 ring-emerald-100'
                      }`}
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Khung giờ: {selectedSlot.fullLabel}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            selectedSlot.trafficLevel === 'peak'
                              ? 'bg-rose-100 text-rose-800'
                              : selectedSlot.trafficLevel === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : selectedSlot.trafficLevel === 'moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {selectedSlot.trafficLabel} ({selectedSlot.densityPercentage}%)
                        </span>
                      </h4>
                    </div>
                  </div>

                  {/* Booking Trigger Button for this hour */}
                  <button
                    onClick={() => handleQuickBook(selectedSlot.shortLabel, `${(selectedSlot.hour + 1).toString().padStart(2, '0')}:00`)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                      selectedSlot.trafficLevel === 'peak'
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <span>{selectedSlot.trafficLevel === 'peak' ? 'Vẫn Muốn Đặt Khung Này' : 'Đặt Lịch Ca Giờ Này'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px]">Đánh giá & Khuyến nghị:</span>
                    <p className={`font-medium ${selectedSlot.trafficLevel === 'peak' ? 'text-rose-700 font-semibold' : 'text-slate-800'}`}>
                      {selectedSlot.advice}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px]">Số lượt đăng ký ghi nhận:</span>
                    <p className="font-mono font-bold text-slate-900">
                      {selectedSlot.totalBookingCount} ca <span className="font-normal text-slate-500">({Math.round(selectedSlot.totalBookingMinutes / 60)}h thời gian máy chạy)</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px]">Thiết bị hay sử dụng nhất:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedSlot.topEquipmentCodes.length > 0 ? (
                        selectedSlot.topEquipmentCodes.map((code) => (
                          <span key={code} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold text-[11px]">
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Đang trống máy</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* B. 7-Day x Hour Heatmap Matrix */
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Grid3X3 className="w-4 h-4 text-indigo-600" />
                  <span>Bản Đồ Nhiệt Mật Độ (7 Ngày Trong Tuần × Khung Giờ)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Xem trực quan toàn cảnh mức độ bận rộn của phòng lab theo từng thứ trong tuần để lên kế hoạch thí nghiệm.
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Dữ liệu chuẩn hóa theo tuần
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[640px] space-y-1.5">
                {/* Header Hours */}
                <div className="grid grid-cols-16 gap-1 text-center font-mono text-[10px] text-slate-400 font-bold mb-1">
                  <div className="text-left pl-2">Thứ</div>
                  {forecast.heatMatrix[0].map((c) => (
                    <div key={c.hour}>{c.hour}h</div>
                  ))}
                </div>

                {/* Day Rows */}
                {forecast.heatMatrix.map((row, idx) => {
                  const dayObj = DAY_OF_WEEK_LABELS[idx];
                  return (
                    <div key={dayObj.day} className="grid grid-cols-16 gap-1 items-center">
                      <div className="text-xs font-semibold text-slate-700 pl-2 text-left truncate">
                        {dayObj.short}
                      </div>

                      {row.map((cell) => {
                        let cellBg = 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900';
                        if (cell.density >= 75) {
                          cellBg = 'bg-rose-600 hover:bg-rose-700 text-white font-bold';
                        } else if (cell.density >= 50) {
                          cellBg = 'bg-orange-400 hover:bg-orange-500 text-white';
                        } else if (cell.density >= 25) {
                          cellBg = 'bg-amber-200 hover:bg-amber-300 text-amber-900';
                        } else if (cell.density === 0) {
                          cellBg = 'bg-slate-100 hover:bg-slate-200 text-slate-400';
                        }

                        return (
                          <div
                            key={cell.hour}
                            title={`${dayObj.label} ${cell.hourLabel}: Mật độ ${cell.density}% (${cell.bookingCount} ca)`}
                            onClick={() => {
                              setActiveSelectedHour(cell.hour);
                              setViewMode('bar_chart');
                            }}
                            className={`h-7 rounded-md cursor-pointer flex items-center justify-center text-[10px] font-mono transition-transform hover:scale-110 shadow-2xs ${cellBg}`}
                          >
                            {cell.density > 0 ? `${cell.density}%` : '—'}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Actionable Smart Recommendations: 3 Golden Windows to Avoid Peak */}
      <div className="px-5 sm:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Khung Giờ Vàng Khuyên Dùng (Đặt Máy Tránh Cao Điểm)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Khuyến nghị tự động từ hệ thống
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecast.optimalWindows.map((win) => (
            <div
              key={win.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 transition-all shadow-2xs flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {win.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Mật độ: {win.densityPercentage}%
                  </span>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {win.timeRange}
                  </h4>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">
                    {win.title}
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {win.description}
                </p>

                <div className="pt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <strong className="text-slate-800">Tối ưu cho:</strong> {win.bestSuitedFor}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleQuickBook(win.startHour, win.endHour)}
                className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                <span>{win.actionText}</span>
              </button>
            </div>
          ))}
        </div>

        {/* AI & Algorithm Strategy Advisory Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-white/10 shrink-0">
              <Info className="w-4 h-4 text-indigo-300" />
            </span>
            <div className="space-y-0.5 text-xs">
              <h5 className="font-bold text-indigo-200">
                Chi Lược Đặt Lịch Thông Minh Dành Cho Nhà Nghiên Cứu
              </h5>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {forecast.smartAdviceText}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleQuickBook('11:30', '13:30')}
            className="sm:self-center shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Đặt Ngay Ca Trưa (11:30)
          </button>
        </div>
      </div>
    </div>
  );
};
