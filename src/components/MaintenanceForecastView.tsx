import React, { useState, useMemo } from 'react';
import { 
  Equipment, 
  User, 
  Booking, 
  UsageLog, 
  MaintenanceRecord, 
  MaintenanceForecastResult, 
  MaintenanceUrgency 
} from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { 
  calculateAllMaintenanceForecasts,
  calculateEquipmentMaintenanceForecast,
  getLogOperatingHours 
} from '../services/maintenanceForecaster';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Sliders, 
  FileSpreadsheet, 
  Printer, 
  PlusCircle, 
  Search, 
  Filter, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  ChevronRight, 
  ShieldAlert, 
  RotateCcw,
  Info,
  Layers,
  Award,
  Zap,
  CheckSquare
} from 'lucide-react';

interface MaintenanceForecastViewProps {
  equipmentList: Equipment[];
  logs: UsageLog[];
  bookings: Booking[];
  currentUser: User;
  onRefresh: () => void;
  onSelectEquipmentForHub?: (equipment: Equipment) => void;
}

export const MaintenanceForecastView: React.FC<MaintenanceForecastViewProps> = ({
  equipmentList,
  logs,
  bookings,
  currentUser,
  onRefresh,
  onSelectEquipmentForHub,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Load maintenance records from storage
  const maintenanceRecords: MaintenanceRecord[] = LabStorage.getMaintenanceRecords();

  // Filter & Search states
  const [selectedUrgency, setSelectedUrgency] = useState<'all' | 'action_needed' | MaintenanceUrgency>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // What-If Simulation: Load multiplier (1.0 = normal, 1.5 = high, 2.0 = peak)
  const [loadMultiplier, setLoadMultiplier] = useState<number>(1.0);

  // Modals
  const [recordingEquipment, setRecordingEquipment] = useState<Equipment | null>(null);
  const [detailEquipmentResult, setDetailEquipmentResult] = useState<MaintenanceForecastResult | null>(null);

  // Record Maintenance Form State
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceRecord['maintenanceType']>('calibration');
  const [performedDate, setPerformedDate] = useState<string>(localDateStr());
  const [technicianName, setTechnicianName] = useState<string>(currentUser.name);
  const [agencyOrVendor, setAgencyOrVendor] = useState<string>('Viện Đo Lường Quốc Gia VMI');
  const [certificateNumber, setCertificateNumber] = useState<string>(`CAL-${new Date().getFullYear()}-VMI-${Math.floor(100 + Math.random() * 900)}`);
  const [costVND, setCostVND] = useState<string>('5000000');
  const [notes, setNotes] = useState<string>('');
  const [replacedParts, setReplacedParts] = useState<string>('');

  // Calculate forecasts with simulator multiplier
  const forecastResults = useMemo(() => {
    return calculateAllMaintenanceForecasts(
      equipmentList,
      logs,
      bookings,
      maintenanceRecords,
      { loadMultiplier }
    );
  }, [equipmentList, logs, bookings, maintenanceRecords, loadMultiplier]);

  // Overall Statistics
  const totalLabActualHours = useMemo(() => {
    return Math.round(logs.reduce((acc, l) => acc + getLogOperatingHours(l), 0) * 10) / 10;
  }, [logs]);

  const countOptimal = forecastResults.filter((r) => r.urgency === 'optimal').length;
  const countAttention = forecastResults.filter((r) => r.urgency === 'attention').length;
  const countUrgent = forecastResults.filter((r) => r.urgency === 'urgent').length;
  const countOverdue = forecastResults.filter((r) => r.urgency === 'overdue').length;
  const countActionNeeded = countUrgent + countOverdue;

  // Filtered Results
  const filteredResults = useMemo(() => {
    return forecastResults.filter((r) => {
      // Urgency filter
      if (selectedUrgency === 'action_needed') {
        if (r.urgency !== 'urgent' && r.urgency !== 'overdue') return false;
      } else if (selectedUrgency !== 'all' && r.urgency !== selectedUrgency) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && r.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = r.equipmentCode.toLowerCase().includes(q);
        const matchName = r.equipmentName.toLowerCase().includes(q);
        const matchRoom = r.room.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchRoom) return false;
      }

      return true;
    });
  }, [forecastResults, selectedUrgency, selectedCategory, searchQuery]);

  // Submit new maintenance log
  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingEquipment) return;

    const partsArray = replacedParts
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Get current logged operating hours for this equipment
    const eqResult = forecastResults.find((r) => r.equipmentId === recordingEquipment.id);
    const operatingHoursAtService = eqResult ? eqResult.totalActualHours : 0;

    const res = LabStorage.addMaintenanceRecord({
      equipmentId: recordingEquipment.id,
      maintenanceType,
      performedDate,
      technicianName,
      agencyOrVendor: agencyOrVendor || undefined,
      certificateNumber: certificateNumber || undefined,
      operatingHoursAtService,
      costVND: costVND ? Number(costVND) : undefined,
      notes: notes || 'Hoàn tất nghiệm thu kỹ thuật và hiệu chuẩn định kỳ.',
      replacedParts: partsArray.length > 0 ? partsArray : undefined,
    });

    if (res.success) {
      setRecordingEquipment(null);
      // Reset form
      setNotes('');
      setReplacedParts('');
      onRefresh();
    }
  };

  // Export Maintenance Forecast Plan to CSV
  const handleExportPlanCSV = () => {
    const headers = [
      'STT',
      'Mã Thiết Bị',
      'Tên Thiết Bị',
      'Phòng',
      'Phân Loại',
      'Trạng Thái',
      'Mức Độ Khẩn Cấp',
      'Sức Khỏe (%)',
      'Giờ Chạy Thực Tế (h)',
      'Định Mức Giờ (h)',
      'Giờ Còn Lại (h)',
      'Tốc Độ Hao Mòn (h/ngày)',
      'Hệ Số Ứng Suất',
      'Ngày Lần Bảo Trì Trước',
      'Ngày Dự Báo Bảo Trì (Thực Tế)',
      'Hạn Định Kỳ Theo Lịch',
      'Chênh Lệch So Với Lịch (Ngày)',
      'Khuyến Nghị Kỹ Thuật'
    ];

    const rows = forecastResults.map((r, idx) => {
      return [
        idx + 1,
        `"${r.equipmentCode}"`,
        `"${r.equipmentName.replace(/"/g, '""')}"`,
        `"${r.room}"`,
        `"${r.category}"`,
        `"${r.currentStatus}"`,
        `"${r.urgencyLabel}"`,
        r.healthPercentage,
        r.hoursSinceLastMaintenance,
        r.maxOperatingHoursThreshold,
        r.remainingUsefulHours,
        r.effectiveBurnRateHours,
        r.stressMultiplier,
        r.lastMaintenanceDate,
        r.predictedMaintenanceDate,
        r.calendarDueDate,
        r.daysVarianceVsCalendar,
        `"${r.actionRecommendation.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ke_Hoach_Du_Bao_Bao_Tri_Thiet_Bi_${localDateStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Algorithm Banner & Purpose */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Thuật Toán Dự Báo Bảo Trì Dựa Trên Giờ Vận Hành Thực Tế</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Kế Hoạch & Dự Báo Kiểm Định Thiết Bị Định Kỳ
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Thuật toán tự động tổng hợp <strong>tổng thời gian sử dụng thực tế</strong> từ sổ nhật ký bàn giao (Handover Logbook), kết hợp hệ số gia tốc hao mòn (<span className="text-sky-300 font-mono">α_stress</span>) từ các ca ghi nhận hao mòn / sự cố để dự báo chính xác thời điểm chạm ngưỡng kỹ thuật, vượt trội so với lịch cố định.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleExportPlanCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all backdrop-blur-xs shadow-xs"
              title="Xuất kế hoạch kiểm định ra bảng tính Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Xuất File Excel (.csv)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
              title="In kế hoạch kiểm định"
            >
              <Printer className="w-4 h-4" />
              <span>In Kế Hoạch Kiểm Định</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 5 Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Operating Hours */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Giờ Đo Tích Lũy</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900">
            {totalLabActualHours}<span className="text-sm font-sans font-medium text-slate-500 ml-1">giờ</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            Từ {logs.length} ca bàn giao nhật ký
          </p>
        </div>

        {/* Action Needed */}
        <div 
          onClick={() => setSelectedUrgency(selectedUrgency === 'action_needed' ? 'all' : 'action_needed')}
          className={`bg-white rounded-xl border p-4 shadow-2xs space-y-1 cursor-pointer transition-all ${
            selectedUrgency === 'action_needed' ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Cần Bảo Trì Ngay</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600">
            {countActionNeeded}
          </div>
          <p className="text-[11px] text-slate-500">
            Quá hạn hoặc sắp chạm ngưỡng
          </p>
        </div>

        {/* Urgent */}
        <div 
          onClick={() => setSelectedUrgency(selectedUrgency === 'urgent' ? 'all' : 'urgent')}
          className={`bg-white rounded-xl border p-4 shadow-2xs space-y-1 cursor-pointer transition-all ${
            selectedUrgency === 'urgent' ? 'ring-2 ring-orange-500 border-orange-300 bg-orange-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Khẩn Cấp (&lt;14 ngày)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600">
            {countUrgent}
          </div>
          <p className="text-[11px] text-slate-500">
            Hao mòn &gt; 80% định mức
          </p>
        </div>

        {/* Attention */}
        <div 
          onClick={() => setSelectedUrgency(selectedUrgency === 'attention' ? 'all' : 'attention')}
          className={`bg-white rounded-xl border p-4 shadow-2xs space-y-1 cursor-pointer transition-all ${
            selectedUrgency === 'attention' ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Cần Lưu Ý</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-800">
            {countAttention}
          </div>
          <p className="text-[11px] text-slate-500">
            Lên kế hoạch kiểm định sớm
          </p>
        </div>

        {/* Optimal */}
        <div 
          onClick={() => setSelectedUrgency(selectedUrgency === 'optimal' ? 'all' : 'optimal')}
          className={`bg-white rounded-xl border p-4 shadow-2xs space-y-1 cursor-pointer transition-all ${
            selectedUrgency === 'optimal' ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Hoạt Động Tốt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600">
            {countOptimal}
          </div>
          <p className="text-[11px] text-slate-500">
            Sức khỏe thiết bị &gt; 50%
          </p>
        </div>
      </div>

      {/* Interactive Toolbar & What-If Load Intensity Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Urgency Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            <button
              onClick={() => setSelectedUrgency('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedUrgency === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({forecastResults.length})
            </button>
            <button
              onClick={() => setSelectedUrgency('action_needed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedUrgency === 'action_needed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Cần bảo trì ({countActionNeeded})
            </button>
            <button
              onClick={() => setSelectedUrgency('urgent')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedUrgency === 'urgent'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              Khẩn cấp ({countUrgent})
            </button>
            <button
              onClick={() => setSelectedUrgency('attention')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedUrgency === 'attention'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Cần lưu ý ({countAttention})
            </button>
            <button
              onClick={() => setSelectedUrgency('optimal')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedUrgency === 'optimal'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              An toàn ({countOptimal})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hoặc tên máy..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* What-If Simulation Box: Adjust usage intensity */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-dashed border-slate-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="text-xs font-bold text-slate-800">
                Mô phỏng cường độ ca đo (What-If Simulator):
              </span>
              <p className="text-[11px] text-slate-500">
                Thử nghiệm tăng tải nghiên cứu mùa cao điểm để xem thuật toán dự báo ngày bảo trì thay đổi tức thời.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.25"
                value={loadMultiplier}
                onChange={(e) => setLoadMultiplier(Number(e.target.value))}
                className="w-28 sm:w-36 accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-indigo-700 min-w-[50px] text-center">
                x{loadMultiplier.toFixed(2)}
              </span>
            </div>

            {loadMultiplier !== 1.0 && (
              <button
                onClick={() => setLoadMultiplier(1.0)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-1"
                title="Khôi phục cường độ chuẩn"
              >
                <RotateCcw className="w-3 h-3" /> Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Predictive Forecast Table & Cards */}
      <div className="space-y-4">
        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy thiết bị phù hợp</h3>
            <p className="text-xs text-slate-500">
              Hãy thử thay đổi bộ lọc mức độ khẩn cấp hoặc xóa từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          filteredResults.map((result) => {
            const eq = equipmentList.find((e) => e.id === result.equipmentId);

            // Health color helpers
            const getHealthColor = (hp: number, urg: MaintenanceUrgency) => {
              if (urg === 'overdue') return 'text-rose-600 bg-rose-50 border-rose-200';
              if (hp <= 20) return 'text-orange-600 bg-orange-50 border-orange-200';
              if (hp <= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
              return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            };

            const getHealthBarBg = (hp: number, urg: MaintenanceUrgency) => {
              if (urg === 'overdue') return 'bg-rose-500';
              if (hp <= 20) return 'bg-orange-500';
              if (hp <= 50) return 'bg-amber-500';
              return 'bg-emerald-500';
            };

            return (
              <div
                key={result.equipmentId}
                className={`bg-white rounded-xl border transition-all p-5 shadow-2xs hover:shadow-xs space-y-4 ${
                  result.urgency === 'overdue'
                    ? 'border-rose-300 ring-1 ring-rose-200/60 bg-rose-50/10'
                    : result.urgency === 'urgent'
                    ? 'border-orange-300 ring-1 ring-orange-200/50'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row: Title, Room, Status Badge & Health Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                        {result.equipmentCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {result.equipmentName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {result.room}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Phân loại: <strong className="text-slate-700">{result.category}</strong> · Trạng thái: {result.currentStatus === 'maintenance' ? (
                        <span className="text-rose-600 font-semibold">Đang bảo trì</span>
                      ) : result.currentStatus === 'in_use' ? (
                        <span className="text-amber-600 font-semibold">Đang đo</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Sẵn sàng</span>
                      )}
                    </p>
                  </div>

                  {/* Health Score Pill */}
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-xl border text-center font-mono ${getHealthColor(result.healthPercentage, result.urgency)}`}>
                      <div className="text-[10px] font-sans font-semibold uppercase tracking-wider">
                        Sức Khỏe Máy
                      </div>
                      <div className="text-lg font-extrabold leading-tight">
                        {result.healthPercentage}%
                      </div>
                    </div>

                    <div className="hidden sm:block text-right text-xs">
                      <div className="font-bold text-slate-800">
                        {result.urgencyLabel}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Còn ~<strong>{result.remainingUsefulHours}h</strong> ({result.remainingDaysEstimated} ngày)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar of Operating Hours */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Giờ chạy tích lũy chu kỳ này: <strong>{result.hoursSinceLastMaintenance}h</strong> / định mức <strong>{result.maxOperatingHoursThreshold}h</strong>
                      </span>
                      {result.stressMultiplier > 1.05 && (
                        <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-semibold" title={`Hệ số gia tốc hao mòn: ${result.stressMultiplier}x do điều kiện máy hoặc sự cố`}>
                          α={result.stressMultiplier}x
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {Math.round((result.hoursSinceLastMaintenance / result.maxOperatingHoursThreshold) * 100)}% định mức
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHealthBarBg(result.healthPercentage, result.urgency)}`}
                      style={{
                        width: `${Math.min(100, Math.max(6, Math.round((result.effectiveWearHours / result.maxOperatingHoursThreshold) * 100)))}%`
                      }}
                    />
                  </div>
                </div>

                {/* Dual Date Projection Comparison: Forecasted vs Calendar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                  {/* Real Usage Forecast */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Dự báo theo giờ chạy thực tế:
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-900">
                      {result.predictedMaintenanceDate}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tốc độ hao mòn: <strong>{result.effectiveBurnRateHours}h/ngày</strong>
                    </p>
                  </div>

                  {/* Fixed Calendar Due Date */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Hạn định kỳ theo lịch ({result.calendarIntervalDays} ngày):
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-700">
                      {result.calendarDueDate}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Lần bảo trì trước: {result.lastMaintenanceDate}
                    </p>
                  </div>

                  {/* Variance & Algorithm Insight */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                      Đánh giá độ lệch hao mòn:
                    </span>
                    {result.isWearPacingFasterThanCalendar ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Sớm hơn {Math.abs(result.daysVarianceVsCalendar)} ngày so với lịch!</span>
                      </div>
                    ) : result.daysVarianceVsCalendar > 15 ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dùng nhẹ: Kéo dài hơn lịch {result.daysVarianceVsCalendar} ngày</span>
                      </div>
                    ) : (
                      <div className="text-slate-700 font-semibold">
                        Bám sát tiến độ lịch định kỳ (±{Math.abs(result.daysVarianceVsCalendar)} ngày)
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Ngày khuyến nghị: <strong className="text-indigo-700">{result.recommendedMaintenanceDate}</strong>
                    </p>
                  </div>
                </div>

                {/* Technical Recommendation & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-600 space-y-0.5 max-w-2xl">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Khuyến nghị kỹ thuật kiểm định:</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {result.actionRecommendation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setDetailEquipmentResult(result)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Xem chi tiết các ca đo đóng góp vào hao mòn"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chi Tiết Thuật Toán</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (eq) {
                            setRecordingEquipment(eq);
                            setPerformedDate(localDateStr());
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Ghi Nhận Bảo Trì</span>
                      </button>
                    )}

                    {onSelectEquipmentForHub && eq && (
                      <button
                        onClick={() => onSelectEquipmentForHub(eq)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                        title="Mở QR & SOP Hub của thiết bị này"
                      >
                        Mở Hub
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Maintenance Modal (Admin only) */}
      {recordingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ghi Nhận Bảo Trì & Kiểm Định Thiết Bị
                  </h3>
                  <p className="text-xs text-slate-500">
                    {recordingEquipment.code} · {recordingEquipment.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecordingEquipment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Loại hình dịch vụ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value as MaintenanceRecord['maintenanceType'])}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="calibration">Hiệu chuẩn định kỳ (Calibration)</option>
                    <option value="periodic_inspection">Kiểm định nhà nước / VILAS</option>
                    <option value="preventive">Bảo dưỡng phòng ngừa (Preventive)</option>
                    <option value="overhaul">Đại tu toàn diện (Overhaul)</option>
                    <option value="emergency_repair">Sửa chữa đột xuất (Repair)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày thực hiện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={performedDate}
                    onChange={(e) => setPerformedDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kỹ thuật viên / Kỹ sư <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Tên kỹ sư thực hiện..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Đơn vị kiểm định / Hãng
                  </label>
                  <input
                    type="text"
                    value={agencyOrVendor}
                    onChange={(e) => setAgencyOrVendor(e.target.value)}
                    placeholder="VD: Viện Đo Lường Quốc Gia VMI, Hãng JEOL..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số tem / Chứng chỉ kiểm định
                  </label>
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="VD: CAL-2026-VMI-102"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chi phí thực hiện (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={costVND}
                    onChange={(e) => setCostVND(e.target.value)}
                    placeholder="VD: 5000000"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vật tư & Linh kiện thay thế (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={replacedParts}
                  onChange={(e) => setReplacedParts(e.target.value)}
                  placeholder="VD: Dầu bơm chân không Edwards, Đệm cao su cổng tiêm, Lá chắn khẩu độ..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung nghiệm thu kỹ thuật & Kết luận
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết kết quả kiểm tra, độ lệch chuẩn, thông số sau hiệu chuẩn..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  Khi lưu bản ghi bảo trì, hệ thống sẽ tự động cập nhật <strong>Ngày bảo trì gần nhất</strong>, reset <strong>chu kỳ giờ vận hành</strong> về 0h cho kỳ mới, và khôi phục trạng thái thiết bị sang <strong>Sẵn sàng (Available)</strong>.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRecordingEquipment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận & Lưu Bản Ghi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Algorithm Breakdown Modal */}
      {detailEquipmentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Phân Tích Chi Tiết Thuật Toán: {detailEquipmentResult.equipmentCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {detailEquipmentResult.equipmentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailEquipmentResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Formula explanation */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Công Thức Toán Học Dự Báo (Predictive Maintenance Formula):
                </h4>
                <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg border border-indigo-100 text-indigo-900 space-y-1">
                  <div>1. Giờ hao mòn hiệu dụng: <strong>H_wear = H_actual × α_stress</strong></div>
                  <div>2. Giờ còn lại: <strong>H_remain = Max(0, H_threshold - H_wear)</strong></div>
                  <div>3. Tốc độ hao mòn ngày: <strong>V_daily = Avg(H_last30d) × LoadFactor</strong></div>
                  <div>4. Ngày dự báo: <strong>T_forecast = Today + (H_remain / V_daily)</strong></div>
                  <div>5. Ngày bảo trì đề xuất: <strong>T_recommended = Min(T_forecast, T_calendar)</strong></div>
                </div>
              </div>

              {/* Parameter Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Tham Số Thuật Toán</th>
                      <th className="p-2.5 text-right">Giá Trị Tính Toán</th>
                      <th className="p-2.5">Ghi Chú Nguồn Gốc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Tổng giờ đo nhật ký chu kỳ này</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{detailEquipmentResult.hoursSinceLastMaintenance}h</td>
                      <td className="p-2.5 font-sans text-slate-500">Tổng từ các ca bàn giao có Check-out</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Định mức tối đa giữa 2 kỳ (Threshold)</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{detailEquipmentResult.maxOperatingHoursThreshold}h</td>
                      <td className="p-2.5 font-sans text-slate-500">Khuyến nghị kỹ thuật của nhà sản xuất</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Hệ số ứng suất gia tốc (α_stress)</td>
                      <td className="p-2.5 text-right font-bold text-indigo-700">{detailEquipmentResult.stressMultiplier}x</td>
                      <td className="p-2.5 font-sans text-slate-500">Tính từ {detailEquipmentResult.incidentsCount} sự cố và tình trạng hao mòn</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Giờ hao mòn hiệu dụng (H_wear)</td>
                      <td className="p-2.5 text-right font-bold text-indigo-700">{detailEquipmentResult.effectiveWearHours}h</td>
                      <td className="p-2.5 font-sans text-slate-500">H_actual × α_stress</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Tốc độ tiêu hao (Burn Rate)</td>
                      <td className="p-2.5 text-right font-bold text-blue-700">{detailEquipmentResult.effectiveBurnRateHours}h / ngày</td>
                      <td className="p-2.5 font-sans text-slate-500">Dựa trên 30 ngày đo gần nhất và lịch đặt trước</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Số ngày dự kiến còn lại</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">{detailEquipmentResult.remainingDaysEstimated} ngày</td>
                      <td className="p-2.5 font-sans text-slate-500">H_remain / V_daily</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Ngày bảo trì định kỳ theo lịch</td>
                      <td className="p-2.5 text-right font-bold text-slate-700">{detailEquipmentResult.calendarDueDate}</td>
                      <td className="p-2.5 font-sans text-slate-500">Chu kỳ cố định {detailEquipmentResult.calendarIntervalDays} ngày</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Checklist preview */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Quy Trình Kiểm Tra Kỹ Thuật Đề Xuất Cho Kỳ Này:
                </h4>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {detailEquipmentResult.suggestedChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setDetailEquipmentResult(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
