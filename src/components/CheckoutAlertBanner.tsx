import React, { useState, useEffect, useMemo } from 'react';
import { Equipment, User, UsageLog, Booking } from '../types';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  LogOut, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  MapPin, 
  User as UserIcon,
  BellRing,
  ExternalLink,
  StickyNote
} from 'lucide-react';

interface CheckoutAlertBannerProps {
  currentUser: User;
  logs: UsageLog[];
  equipmentList: Equipment[];
  bookings: Booking[];
  allUsers: User[];
  onOpenCheckOut: (equipment: Equipment, log: UsageLog) => void;
  onOpenQuickNotes?: (equipmentId: string) => void;
  onNavigateToTab?: (tab: 'logbook' | 'dashboard' | 'calendar') => void;
}

export const CheckoutAlertBanner: React.FC<CheckoutAlertBannerProps> = ({
  currentUser,
  logs,
  equipmentList,
  bookings,
  allUsers,
  onOpenCheckOut,
  onOpenQuickNotes,
  onNavigateToTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Update timer every 30 seconds for live elapsed calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const eqMap = useMemo(() => new Map(equipmentList.map((e) => [e.id, e])), [equipmentList]);
  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);

  // 1. Current User's active sessions (not yet checked out)
  const myActiveSessions = useMemo(() => {
    const activeLogs = logs.filter((l) => l.userId === currentUser.id && !l.checkOutTime);

    return activeLogs.map((log) => {
      const eq = eqMap.get(log.equipmentId);
      const associatedBooking = log.bookingId 
        ? bookings.find((b) => b.id === log.bookingId)
        : undefined;

      const checkInMs = new Date(log.checkInTime).getTime();
      const elapsedMinutes = Math.max(1, Math.round((nowTimestamp - checkInMs) / 60000));
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const elapsedDisplay = hours > 0 ? `${hours}h ${mins}p` : `${mins} phút`;

      const maxAllowedHours = eq?.maxBookingHoursPerSession || 4;
      let isOverdue = false;
      let overdueMinutes = 0;
      let overdueReason = '';

      if (associatedBooking) {
        const bookingEndMs = new Date(`${associatedBooking.date}T${associatedBooking.endTime}:00`).getTime();
        if (nowTimestamp > bookingEndMs) {
          isOverdue = true;
          overdueMinutes = Math.round((nowTimestamp - bookingEndMs) / 60000);
          overdueReason = `Quá hạn lịch đặt (${associatedBooking.endTime}) ${Math.floor(overdueMinutes / 60)}h ${overdueMinutes % 60}p`;
        }
      } else if (elapsedMinutes > maxAllowedHours * 60) {
        isOverdue = true;
        overdueMinutes = elapsedMinutes - maxAllowedHours * 60;
        overdueReason = `Vượt định mức tối đa ${maxAllowedHours}h của máy (${elapsedDisplay})`;
      }

      return {
        log,
        equipment: eq,
        associatedBooking,
        elapsedDisplay,
        elapsedMinutes,
        isOverdue,
        overdueMinutes,
        overdueReason,
      };
    });
  }, [logs, currentUser.id, eqMap, bookings, nowTimestamp]);

  // 2. All lab overdue sessions (for admin or lab awareness)
  const otherOverdueSessions = useMemo(() => {
    if (currentUser.role !== 'admin') return [];

    return logs
      .filter((l) => l.userId !== currentUser.id && !l.checkOutTime)
      .map((log) => {
        const eq = eqMap.get(log.equipmentId);
        const operator = userMap.get(log.userId);
        const associatedBooking = log.bookingId ? bookings.find((b) => b.id === log.bookingId) : undefined;
        const checkInMs = new Date(log.checkInTime).getTime();
        const elapsedMinutes = Math.max(1, Math.round((nowTimestamp - checkInMs) / 60000));

        let isOverdue = false;
        let reason = '';

        if (associatedBooking) {
          const bookingEndMs = new Date(`${associatedBooking.date}T${associatedBooking.endTime}:00`).getTime();
          if (nowTimestamp > bookingEndMs) {
            isOverdue = true;
            const diff = Math.round((nowTimestamp - bookingEndMs) / 60000);
            reason = `Quá hạn ${Math.floor(diff / 60)}h ${diff % 60}p`;
          }
        } else if (elapsedMinutes > (eq?.maxBookingHoursPerSession || 4) * 60) {
          isOverdue = true;
          reason = `Chạy ${Math.round(elapsedMinutes / 60)}h liên tục`;
        }

        return {
          log,
          equipment: eq,
          operator,
          isOverdue,
          reason,
          elapsedMinutes,
        };
      })
      .filter((s) => s.isOverdue);
  }, [logs, currentUser, eqMap, userMap, bookings, nowTimestamp]);

  // If there are no sessions needing attention, return null
  if (myActiveSessions.length === 0 && otherOverdueSessions.length === 0) {
    return null;
  }

  const primaryMySession = myActiveSessions[0];
  const hasMyOverdue = myActiveSessions.some((s) => s.isOverdue);

  return (
    <aside 
      aria-label="Cảnh báo ca làm việc chưa trả máy"
      className={`border-b transition-all duration-200 sticky top-[var(--header-h,113px)] z-30 shadow-md ${
        hasMyOverdue
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-700 text-white border-red-700'
          : myActiveSessions.length > 0
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-600'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-indigo-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* COMPACT / MINIMIZED BAR */}
        {isCollapsed ? (
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span className="font-bold">
                {hasMyOverdue 
                  ? '🚨 CẢNH BÁO KHẨN: Bạn có ca làm việc ĐÃ QUÁ HẠN chưa Check-out!'
                  : myActiveSessions.length > 0
                  ? '⚠️ Bạn đang trong ca vận hành thiết bị (Chưa trả máy)'
                  : `Admin: Có ${otherOverdueSessions.length} ca làm việc quá hạn trong phòng Lab`}
              </span>
              {primaryMySession?.equipment && (
                <span className="hidden sm:inline bg-black/20 px-2 py-0.5 rounded font-mono text-[11px]">
                  [{primaryMySession.equipment.code}] {primaryMySession.equipment.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {primaryMySession && primaryMySession.equipment && (
                <button
                  type="button"
                  onClick={() => onOpenCheckOut(primaryMySession.equipment!, primaryMySession.log)}
                  className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-bold text-xs shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Check-out Ngay</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="p-1 hover:bg-white/20 rounded text-white cursor-pointer"
                title="Mở rộng thông báo chi tiết"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* EXPANDED DETAILED BANNER */
          <div className="space-y-2">
            {/* 1. Current user active sessions */}
            {myActiveSessions.map((session, idx) => (
              <div 
                key={session.log.id} 
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black/15 p-2.5 rounded-xl border border-white/20"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    session.isOverdue ? 'bg-white text-red-600 animate-pulse' : 'bg-white/20 text-white'
                  }`}>
                    {session.isOverdue ? (
                      <AlertOctagon className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        session.isOverdue ? 'bg-white text-red-700 font-extrabold' : 'bg-black/30 text-white'
                      }`}>
                        {session.isOverdue ? '🚨 ĐÃ QUÁ HẠN CHECK-OUT' : '🟢 CA ĐANG HOẠT ĐỘNG'}
                      </span>
                      <span className="font-mono text-xs font-bold text-white bg-white/20 px-1.5 py-0.2 rounded">
                        {session.equipment?.code || 'THIẾT BỊ'}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                        {session.equipment?.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-white/90 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 opacity-75" />
                        <span>{session.equipment?.room || 'Phòng thí nghiệm'}</span>
                      </span>
                      <span>·</span>
                      <span>
                        Bắt đầu lúc:{' '}
                        <strong className="font-mono text-white">
                          {new Date(session.log.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Thời gian đã vận hành:{' '}
                        <strong className="font-mono text-white underline decoration-white/60">
                          {session.elapsedDisplay}
                        </strong>
                      </span>
                      {session.isOverdue && (
                        <span className="bg-red-900/60 text-white px-2 py-0.5 rounded font-bold">
                          ⚠️ {session.overdueReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {onOpenQuickNotes && session.equipment && (
                    <button
                      type="button"
                      onClick={() => onOpenQuickNotes(session.equipment!.id)}
                      className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Ghi chú thông số hoặc nhật ký vận hành"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ghi Chú</span>
                    </button>
                  )}

                  {session.equipment && (
                    <button
                      type="button"
                      onClick={() => onOpenCheckOut(session.equipment!, session.log)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                        session.isOverdue
                          ? 'bg-white text-red-700 hover:bg-red-50 hover:shadow-lg ring-2 ring-white/50'
                          : 'bg-white text-slate-900 hover:bg-amber-50 hover:shadow-lg'
                      }`}
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Hoàn Tất & Check-out Ngay</span>
                    </button>
                  )}

                  {idx === 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCollapsed(true)}
                      className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white cursor-pointer ml-1"
                      title="Thu gọn thanh cảnh báo"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 2. Admin Notice for Other Users Overdue */}
            {currentUser.role === 'admin' && otherOverdueSessions.length > 0 && (
              <div className="flex items-center justify-between gap-3 bg-indigo-950/80 p-2 rounded-xl text-xs border border-indigo-700/50">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    <strong>Quản trị viên:</strong> Có{' '}
                    <strong className="text-amber-300 font-bold">{otherOverdueSessions.length}</strong> ca làm việc của thành viên khác chưa bàn giao/check-out.
                  </span>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('dashboard')}
                    className="text-xs font-semibold underline text-amber-200 hover:text-white cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Xem chi tiết trên Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
