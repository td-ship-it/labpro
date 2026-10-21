import React, { useMemo } from 'react';
import { 
  Equipment, 
  User, 
  Booking, 
  UsageLog, 
  EmailNotification 
} from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { calculateEquipmentMaintenanceForecast } from '../services/maintenanceForecaster';
import { ActiveTab } from './Navbar';
import { 
  UmpHcmLogo, 
  UmpSchoolOfPharmacyLogo, 
  BaocheDeptLogo, 
  AcademicHeaderBadges,
  VilasLogo, 
  Iso17025Badge, 
  LabLogProLogo 
} from './LabLogos';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Mail, 
  CalendarDays, 
  FlaskConical, 
  FolderGit2, 
  ArrowRight, 
  ShieldAlert, 
  Play, 
  LogOut, 
  QrCode, 
  Sparkles, 
  Plus, 
  User as UserIcon, 
  MapPin, 
  ChevronRight, 
  Activity, 
  BellRing, 
  PhoneCall, 
  Printer, 
  FileText,
  Building2,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

interface DashboardOverviewProps {
  currentUser: User;
  allUsers: User[];
  equipmentList: Equipment[];
  bookings: Booking[];
  logs: UsageLog[];
  emails: EmailNotification[];
  onNavigateToTab: (tab: ActiveTab) => void;
  onOpenQuickBook: (equipmentId?: string) => void;
  onOpenCheckIn: (equipment: Equipment, booking?: Booking) => void;
  onOpenCheckOut: (equipment: Equipment, log?: UsageLog) => void;
  onOpenEmails: () => void;
  onOpenQRScanner: () => void;
  onOpenGeminiChat?: (equipment?: Equipment) => void;
  onOpenQRModal?: (equipment: Equipment) => void;
  onRefresh?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  allUsers,
  equipmentList,
  bookings,
  logs,
  emails,
  onNavigateToTab,
  onOpenQuickBook,
  onOpenCheckIn,
  onOpenCheckOut,
  onOpenEmails,
  onOpenQRScanner,
  onOpenGeminiChat,
  onOpenQRModal,
}) => {
  const todayStr = useMemo(() => localDateStr(), []);
  const eqMap = useMemo(() => new Map(equipmentList.map((e) => [e.id, e])), [equipmentList]);
  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);

  // 1. Overdue Sessions (Ca làm việc quá hạn chưa check-out)
  const overdueSessions = useMemo(() => {
    const activeLogs = logs.filter((l) => !l.checkOutTime);
    const now = Date.now();

    return activeLogs.map((log) => {
      const eq = eqMap.get(log.equipmentId);
      const operator = userMap.get(log.userId);
      const associatedBooking = log.bookingId 
        ? bookings.find((b) => b.id === log.bookingId)
        : undefined;

      const checkInMs = new Date(log.checkInTime).getTime();
      const elapsedMinutes = Math.max(1, Math.round((now - checkInMs) / 60000));
      const elapsedHours = Math.round((elapsedMinutes / 60) * 10) / 10;
      const maxAllowedHours = eq?.maxBookingHoursPerSession || 4;

      let isOverdue = false;
      let overdueMinutes = 0;
      let reason = '';

      if (associatedBooking) {
        const bookingEndMs = new Date(`${associatedBooking.date}T${associatedBooking.endTime}:00`).getTime();
        if (now > bookingEndMs) {
          isOverdue = true;
          overdueMinutes = Math.round((now - bookingEndMs) / 60000);
          reason = `Đã quá giờ đăng ký ${Math.floor(overdueMinutes / 60)}h ${overdueMinutes % 60}p (kết thúc lúc ${associatedBooking.endTime})`;
        }
      } else if (elapsedMinutes > maxAllowedHours * 60) {
        isOverdue = true;
        overdueMinutes = elapsedMinutes - maxAllowedHours * 60;
        reason = `Đã chạy vượt định mức tối đa ${maxAllowedHours}h của máy (${elapsedHours}h liên tục)`;
      }

      // Check if session started before today
      const checkInDateStr = log.checkInTime.split('T')[0];
      if (checkInDateStr < todayStr) {
        isOverdue = true;
        reason = `Ca đo chưa check-out từ ngày trước (${checkInDateStr})`;
      }

      return {
        log,
        equipment: eq,
        operator,
        associatedBooking,
        elapsedHours,
        elapsedMinutes,
        isOverdue,
        overdueMinutes,
        reason,
        isCurrentUser: log.userId === currentUser.id,
      };
    }).filter((s) => s.isOverdue || s.elapsedMinutes > 180); // Highlight overdue or long sessions
  }, [logs, eqMap, userMap, bookings, todayStr, currentUser.id]);

  // 2. Equipment Maintenance & Calibration Alerts (Thiết bị đến hạn bảo trì)
  const maintenanceAlerts = useMemo(() => {
    const maintenanceRecords = LabStorage.getMaintenanceRecords();

    return equipmentList
      .map((eq) => {
        const forecast = calculateEquipmentMaintenanceForecast(eq, logs, bookings, maintenanceRecords);
        const isMaintenance = eq.status === 'maintenance';
        
        let priority = 5;
        if (isMaintenance) priority = 1;
        else if (forecast.urgency === 'overdue') priority = 2;
        else if (forecast.urgency === 'urgent') priority = 3;
        else if (forecast.urgency === 'attention') priority = 4;

        return {
          equipment: eq,
          forecast,
          isMaintenance,
          priority,
        };
      })
      .filter((item) => item.priority <= 4)
      .sort((a, b) => a.priority - b.priority);
  }, [equipmentList, logs, bookings]);

  // 3. Latest Messages & Email Notifications (Tin nhắn & thông báo mới nhất)
  const latestEmails = useMemo(() => {
    return [...emails]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 5);
  }, [emails]);

  const unreadEmailCount = useMemo(() => emails.filter((e) => !e.read).length, [emails]);

  // 4. Quick Stats
  const stats = useMemo(() => {
    const totalEquipment = equipmentList.length;
    const availableEquipment = equipmentList.filter((e) => e.status === 'available').length;
    const inUseEquipment = equipmentList.filter((e) => e.status === 'in_use').length;
    const maintenanceCount = equipmentList.filter((e) => e.status === 'maintenance').length;
    const todayBookings = bookings.filter((b) => b.date === todayStr && b.status !== 'cancelled').length;
    
    return {
      totalEquipment,
      availableEquipment,
      inUseEquipment,
      maintenanceCount,
      todayBookings,
      totalAlerts: overdueSessions.length + maintenanceAlerts.length,
    };
  }, [equipmentList, bookings, todayStr, overdueSessions, maintenanceAlerts]);

  // 5. My Bookings Today
  const myBookingsToday = useMemo(() => {
    return bookings
      .filter((b) => b.userId === currentUser.id && b.date === todayStr && b.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, currentUser.id, todayStr]);

  // 6. My Active Unchecked Sessions (Cảnh báo check-out riêng của người dùng hiện tại)
  const myActiveSessions = useMemo(() => {
    const active = logs.filter((l) => l.userId === currentUser.id && !l.checkOutTime);
    const now = Date.now();
    return active.map((log) => {
      const eq = eqMap.get(log.equipmentId);
      const booking = log.bookingId ? bookings.find((b) => b.id === log.bookingId) : undefined;
      const checkInMs = new Date(log.checkInTime).getTime();
      const elapsedMinutes = Math.max(1, Math.round((now - checkInMs) / 60000));
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const elapsedDisplay = hours > 0 ? `${hours}h ${mins}p` : `${mins} phút`;
      const maxAllowed = eq?.maxBookingHoursPerSession || 4;

      let isOverdue = false;
      let overdueReason = '';

      if (booking) {
        const bookingEndMs = new Date(`${booking.date}T${booking.endTime}:00`).getTime();
        if (now > bookingEndMs) {
          isOverdue = true;
          const diff = Math.round((now - bookingEndMs) / 60000);
          overdueReason = `Quá hạn lịch đặt (${booking.endTime}) ${Math.floor(diff / 60)}h ${diff % 60}p`;
        }
      } else if (elapsedMinutes > maxAllowed * 60) {
        isOverdue = true;
        overdueReason = `Vượt định mức tối đa ${maxAllowed}h của máy (${elapsedDisplay})`;
      }

      return {
        log,
        equipment: eq,
        booking,
        elapsedDisplay,
        elapsedMinutes,
        isOverdue,
        overdueReason,
      };
    });
  }, [logs, currentUser.id, eqMap, bookings]);

  // Format relative time helper
  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Top Welcome Banner with Academic & Accreditation Logos */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {currentUser.role === 'admin' ? 'Quản Trị Viên' : currentUser.role === 'instructor' ? 'Giảng Viên Hướng Dẫn' : 'Nghiên Cứu Viên'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300 font-medium">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Xin chào, {currentUser.title} {currentUser.name}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Hệ thống quản lý thiết bị phòng thí nghiệm & nhật ký vận hành trực tuyến — <strong>Bộ môn Bào chế</strong> · <strong>Trường Dược</strong> · <strong>Đại học Y Dược TP. Hồ Chí Minh</strong>.
            </p>

            {/* Official Academic Badges Strip in Welcome Banner */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-900/60 text-[11px] font-bold text-teal-200 border border-teal-500/30">
                <UmpHcmLogo size={20} variant="icon" />
                <span>ĐH Y Dược TP.HCM (UMP)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-900/60 text-[11px] font-bold text-emerald-200 border border-emerald-500/30">
                <UmpSchoolOfPharmacyLogo size={20} variant="icon" />
                <span>Trường Dược (UMPSP)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/60 text-[11px] font-bold text-amber-200 border border-amber-500/30">
                <BaocheDeptLogo size={20} variant="icon" />
                <span>Bộ Môn Bào Chế</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onOpenQuickBook()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Ký Ca Mới</span>
            </button>

            <button
              type="button"
              onClick={onOpenQRScanner}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              title="Quét mã QR tem máy để xem SOP hoặc check-in"
            >
              <QrCode className="w-4 h-4 text-blue-300" />
              <span>Quét Mã QR</span>
            </button>

            <button
              type="button"
              onClick={onOpenEmails}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all flex items-center gap-2 cursor-pointer relative whitespace-nowrap"
              title="Xem thông báo và email hệ thống"
            >
              <Mail className="w-4 h-4 text-amber-300" />
              <span>Thông Báo</span>
              {unreadEmailCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 CẢNH BÁO CHECK-OUT NỔI BẬT DÀNH CHO NGƯỜI DÙNG HIỆN TẠI (NẾU CÓ CA CHƯA TRẢ MÁY) */}
      {myActiveSessions.length > 0 && (
        <div className="space-y-3">
          {myActiveSessions.map((session) => {
            if (!session.equipment) return null;
            return (
              <div
                key={session.log.id}
                className={`p-5 rounded-2xl border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  session.isOverdue
                    ? 'bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border-red-300 ring-2 ring-red-400/50'
                    : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    session.isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                  }`}>
                    <AlertOctagon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        session.isOverdue ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {session.isOverdue ? '🚨 ĐÃ QUÁ HẠN CHECK-OUT' : '⚠️ BẠN ĐANG TRONG CA VẬN HÀNH'}
                      </span>
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        {session.equipment.code}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {session.equipment.name}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{session.equipment.room}</span>
                      </span>
                      <span>·</span>
                      <span>
                        Bắt đầu:{' '}
                        <strong className="font-mono text-slate-900">
                          {new Date(session.log.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Đã chạy liên tục:{' '}
                        <strong className="font-mono text-rose-700 font-bold">
                          {session.elapsedDisplay}
                        </strong>
                      </span>
                      {session.isOverdue && (
                        <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-300">
                          ⚠️ {session.overdueReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onOpenCheckOut(session.equipment!, session.log)}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Hoàn Tất & Check-out Ngay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Key Performance Indicators (KPI Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Máy đang hoạt động */}
        <div 
          onClick={() => onNavigateToTab('equipment')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đang Vận Hành</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.inUseEquipment}
            </span>
            <span className="text-xs text-slate-400">/ {stats.totalEquipment} máy</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Đang trong ca đo thực tế</span>
          </div>
        </div>

        {/* Thiết bị sẵn sàng */}
        <div 
          onClick={() => onNavigateToTab('equipment')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sẵn Sàng Đăng Ký</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.availableEquipment}
            </span>
            <span className="text-xs text-slate-400">máy rảnh</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span>Chiếm {Math.round((stats.availableEquipment / (stats.totalEquipment || 1)) * 100)}% công suất lab</span>
          </div>
        </div>

        {/* Cảnh báo cần xử lý */}
        <div 
          className={`p-4 sm:p-5 rounded-xl border shadow-2xs transition-all ${
            stats.totalAlerts > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700">Cảnh Báo Cần Chú Ý</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.totalAlerts > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              stats.totalAlerts > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}>
              {stats.totalAlerts}
            </span>
            <span className="text-xs text-rose-600 font-medium">vấn đề</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-700 flex items-center gap-1 font-medium">
            <span>{overdueSessions.length} ca quá hạn · {maintenanceAlerts.length} máy bảo trì</span>
          </div>
        </div>

        {/* Lịch đặt hôm nay */}
        <div 
          onClick={() => onNavigateToTab('calendar')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ca Đặt Lịch Hôm Nay</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.todayBookings}
            </span>
            <span className="text-xs text-slate-400">ca đã duyệt</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-700 font-medium flex items-center gap-1">
            <span>{myBookingsToday.length} ca của bạn trong ngày</span>
          </div>
        </div>
      </div>

      {/* 3. CRITICAL ALERTS CENTER (CẢNH BÁO QUAN TRỌNG) */}
      <div className="space-y-6">
        
        {/* SECTION A: Overdue Active Sessions (Các ca quá hạn chưa check-out) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${
                overdueSessions.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Cảnh Báo Ca Đo Quá Hạn Chưa Check-Out</span>
                  {overdueSessions.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                      {overdueSessions.length} ca cần xử lý
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các phiên máy chưa hoàn tất thủ tục bàn giao, có nguy cơ chiếm dụng thiết bị và ảnh hưởng ca sau.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('logbook')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Xem Nhật Ký</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {overdueSessions.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Tuyệt vời! Không có ca đo nào bị quá hạn.</span>
                  <p className="text-emerald-700 mt-0.5">
                    Tất cả người dùng phòng thí nghiệm đều tuân thủ đúng thời gian kết thúc và bàn giao máy.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueSessions.map(({ log, equipment, operator, associatedBooking, elapsedHours, reason, isCurrentUser }) => {
                  if (!equipment) return null;
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCurrentUser
                          ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                          <FlaskConical className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {equipment.code}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {equipment.name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                Ca của bạn
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{operator?.name || 'KTV'}</span>
                              {operator?.phone && <span className="text-slate-400">({operator.phone})</span>}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{equipment.room}</span>
                            </span>
                            <span>·</span>
                            <span className="font-mono text-slate-800">
                              Bắt đầu: {new Date(log.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({elapsedHours}h trước)
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 pt-0.5">
                            <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 md:self-center">
                        <button
                          type="button"
                          onClick={() => onOpenCheckOut(equipment, log)}
                          className="w-full md:w-auto px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Check-Out Ngay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* GRID OF 2 COLUMNS: Maintenance Alerts & Latest Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SECTION B: Maintenance & Calibration Due (Cột trái 7 phần) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Thiết Bị Đến Hạn Bảo Trì & Hiệu Chuẩn</span>
                    {maintenanceAlerts.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {maintenanceAlerts.length} máy
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dự báo hao mòn thực tế theo giờ vận hành & chu kỳ kiểm định định kỳ ISO.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('analytics')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Xem Dự Báo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {maintenanceAlerts.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold">Tất cả thiết bị đều đạt tiêu chuẩn kỹ thuật.</span>
                    <p className="text-emerald-700 mt-0.5">
                      Chưa có máy nào vượt định mức hao mòn hoặc quá hạn hiệu chuẩn.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenanceAlerts.slice(0, 4).map(({ equipment: eq, forecast, isMaintenance }) => (
                    <div
                      key={eq.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMaintenance
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : forecast.urgency === 'overdue'
                          ? 'bg-rose-50/50 border-rose-200'
                          : forecast.urgency === 'urgent'
                          ? 'bg-orange-50/60 border-orange-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {eq.code}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                              {eq.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                            <span>Phòng: <strong>{eq.room}</strong></span>
                            <span>·</span>
                            <span>Phụ trách: {eq.responsibleStaff}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isMaintenance
                              ? 'bg-rose-600 text-white'
                              : forecast.urgency === 'overdue'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}>
                            {isMaintenance ? 'Đang bảo trì' : forecast.urgencyLabel}
                          </span>
                          <div className="font-mono text-xs font-bold text-slate-800 mt-1">
                            {forecast.healthPercentage}% sức khỏe
                          </div>
                        </div>
                      </div>

                      {/* Wear Progress */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Đã chạy: <strong>{forecast.hoursSinceLastMaintenance}h</strong>/{forecast.maxOperatingHoursThreshold}h</span>
                          <span>Hạn: <strong>{forecast.predictedMaintenanceDate}</strong></span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              forecast.healthPercentage <= 20 ? 'bg-rose-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(10, Math.round((forecast.effectiveWearHours / forecast.maxOperatingHoursThreshold) * 100)))}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Advice */}
                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-1 italic">
                        {forecast.actionRecommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: Latest Messages & Notifications (Cột phải 5 phần) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Tin Nhắn & Thông Báo Mới Nhất</span>
                    {unreadEmailCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                        {unreadEmailCount} mới
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Email xác nhận lịch, cảnh báo an toàn và thông báo hệ thống.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenEmails}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Mở Hộp Thư</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {latestEmails.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có thông báo nào.
                </div>
              ) : (
                latestEmails.map((email) => {
                  const isBooking = email.type === 'booking_confirmed';
                  const isIncident = email.type === 'incident_alert';
                  const isReminder = email.type === 'upcoming_reminder';

                  return (
                    <div
                      key={email.id}
                      onClick={onOpenEmails}
                      className="py-3 first:pt-0 last:pb-0 hover:bg-slate-50/80 rounded-lg p-2 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !email.read ? 'bg-blue-600' : 'bg-transparent'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-slate-900 line-clamp-1">
                              {email.subject}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {email.htmlPreview.headline || email.htmlPreview.greeting}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {getRelativeTime(email.sentAt)}
                        </span>
                      </div>

                      <div className="mt-1 pl-4.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="text-slate-600 font-medium">Gửi tới: {email.toName}</span>
                        {email.equipmentCode && (
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                            {email.equipmentCode}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. My Sessions Today & Room Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: My Today Bookings */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Ca Đo Của Bạn Trong Ngày ({myBookingsToday.length} ca)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('calendar')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Xem Toàn Bộ Lịch
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {myBookingsToday.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs space-y-2">
                <p>Hôm nay bạn chưa có ca đăng ký máy nào.</p>
                <button
                  type="button"
                  onClick={() => onOpenQuickBook()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Đăng ký ca ngay</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookingsToday.map((b) => {
                  const eq = eqMap.get(b.equipmentId);
                  const isConfirmed = b.status === 'confirmed';
                  const isActive = b.status === 'active';
                  const isCompleted = b.status === 'completed';

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {b.startTime} - {b.endTime}
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {eq?.name || b.equipmentId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {eq?.room} · Mục đích: {b.purpose}
                          {b.projectCode && (
                            <span className="ml-1.5 font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold border border-indigo-200">
                              {b.projectCode}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isConfirmed && eq && (
                          <button
                            type="button"
                            onClick={() => onOpenCheckIn(eq, b)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Check-in</span>
                          </button>
                        )}
                        {isActive && eq && (
                          <button
                            type="button"
                            onClick={() => {
                              const activeLog = logs.find((l) => l.bookingId === b.id && !l.checkOutTime);
                              onOpenCheckOut(eq, activeLog);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check-out</span>
                          </button>
                        )}
                        {isCompleted && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Đã bàn giao
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Lab Facility Quick Status Snapshot */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Tình Trạng Theo Phòng Thí Nghiệm
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('equipment')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Danh Mục Thiết Bị
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              {['Phòng 302', 'Phòng 405', 'Phòng 108', 'Phòng 204'].map((roomName) => {
                const roomEq = equipmentList.filter((e) => e.room.includes(roomName));
                const inUse = roomEq.filter((e) => e.status === 'in_use').length;
                const available = roomEq.filter((e) => e.status === 'available').length;
                const maint = roomEq.filter((e) => e.status === 'maintenance').length;

                return (
                  <div key={roomName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-xs text-slate-800">
                      <span>{roomName}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{roomEq.length} máy</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-emerald-700 font-semibold">● {available} rảnh</span>
                      <span className="text-amber-700 font-semibold">● {inUse} dùng</span>
                      {maint > 0 && <span className="text-rose-700 font-semibold">● {maint} bảo trì</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hệ thống giám sát vận hành thời gian thực</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('analytics')}
                className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Xem Báo Cáo Phân Tích</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Official Academic Structure & Department Lab Showcase */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Đơn Vị Chủ Quản & Quản Lý Hệ Thống Thiết Bị Phòng Thí Nghiệm
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống thuộc Bộ môn Bào chế — Trường Dược — Đại học Y Dược TP. Hồ Chí Minh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AcademicHeaderBadges compact />
          </div>
        </div>

        {/* 3 Detailed Academic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: UMP */}
          <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-2.5 transition-all hover:shadow-xs">
            <div className="flex items-center gap-3">
              <UmpHcmLogo size={40} variant="icon" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-teal-950">
                  Đại Học Y Dược TP.HCM
                </h4>
                <p className="text-[11px] font-semibold text-teal-700">
                  UMP · Thành lập năm 1947
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trường đại học trọng điểm quốc gia hàng đầu trong đào tạo nguồn nhân lực y tế, nghiên cứu khoa học và chuyển giao công nghệ y dược tại Việt Nam.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[10px] text-teal-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
              <span>Cơ quan chủ quản cấp trường</span>
            </div>
          </div>

          {/* Card 2: Trường Dược (Khoa Dược) */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2.5 transition-all hover:shadow-xs">
            <div className="flex items-center gap-3">
              <UmpSchoolOfPharmacyLogo size={40} variant="icon" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-emerald-950">
                  Trường Dược (Khoa Dược)
                </h4>
                <p className="text-[11px] font-semibold text-emerald-700">
                  UMPSP · Faculty / School of Pharmacy
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đơn vị đào tạo Dược sĩ đại học và sau đại học chuẩn mực quốc tế, sở hữu hệ thống các phòng thí nghiệm nghiên cứu chuyên sâu về thuốc và dược liệu.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[10px] text-emerald-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Đơn vị quản lý cấp Khoa/Trường</span>
            </div>
          </div>

          {/* Card 3: Bộ môn Bào chế */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2.5 transition-all hover:shadow-xs">
            <div className="flex items-center gap-3">
              <BaocheDeptLogo size={40} variant="icon" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-amber-950">
                  Bộ Môn Bào Chế
                </h4>
                <p className="text-[11px] font-semibold text-amber-700">
                  Department of Pharmaceutics
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bộ môn trực tiếp quản lý và vận hành danh mục thiết bị thực tập, nghiên cứu hệ phân tán nano, viên nén, viên nang, thuốc tiêm và thử nghiệm độ hòa tan.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[10px] text-amber-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              <span>Đơn vị trực tiếp quản lý thiết bị</span>
            </div>
          </div>
        </div>

        {/* Quality Standards & Good Laboratory Practice Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Tiêu chuẩn kỹ thuật áp dụng:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-700">Dược điển Việt Nam V</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-700">USP & EP</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-700">ISO/IEC 17025</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Hệ thống nhật ký vận hành điện tử minh bạch & quản lý lịch máy tự động
          </div>
        </div>
      </div>

    </div>
  );
};

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12" y1="16" y2="16" />
    </svg>
  );
}
