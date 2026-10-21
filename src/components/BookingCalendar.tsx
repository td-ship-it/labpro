import React, { useState } from 'react';
import { Equipment, User, Booking, UsageLog } from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Clock, 
  Plus, 
  CheckCircle, 
  Ban, 
  User as UserIcon, 
  MapPin, 
  AlertCircle,
  Play,
  RotateCcw,
  Mail,
  BellRing,
  StickyNote,
  FolderGit2,
  Package
} from 'lucide-react';
import { EquipmentVisual } from './EquipmentVisual';

interface BookingCalendarProps {
  currentUser: User;
  allUsers: User[];
  equipmentList: Equipment[];
  bookings: Booking[];
  logs: UsageLog[];
  onOpenBookingModal: (eqId?: string) => void;
  onOpenCheckInModal: (equipment: Equipment, booking?: Booking) => void;
  onRefresh: () => void;
  onOpenQuickNotes?: (eqId: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  currentUser,
  allUsers,
  equipmentList,
  bookings,
  logs: _logs,
  onOpenBookingModal,
  onOpenCheckInModal,
  onRefresh,
  onOpenQuickNotes,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(localDateStr());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTabSub, setActiveTabSub] = useState<'timeline' | 'my-bookings'>('timeline');

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const eqMap = new Map(equipmentList.map((e) => [e.id, e]));

  // Quick Date Helpers
  const todayStr = localDateStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);

  const handleCancelBooking = async (bookingId: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy lịch đăng ký này?')) {
      const res = await LabStorage.cancelBooking(bookingId);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.error || 'Không thể hủy lịch.');
      }
    }
  };

  const handleSendReminderEmail = async (b: Booking) => {
    const res = await LabStorage.sendUpcomingReminderEmail(b);
    if (res.success) {
      alert(`Đã gửi email nhắc lịch tới: ${res.toEmail}`);
      onRefresh();
    } else {
      alert(res.error || 'Không gửi được email nhắc lịch.');
    }
  };

  // Filter equipment
  const filteredEquipment = equipmentList.filter((eq) => {
    const matchesCategory = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.room.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter bookings for the selected date
  const dateBookings = bookings.filter((b) => b.date === selectedDate && b.status !== 'cancelled');

  // User's own bookings (upcoming or active)
  const myBookings = bookings
    .filter((b) => b.userId === currentUser.id)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

  // Time grid slots for timeline visualization (08:00 to 18:00, 1-hour increments)
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Quang phổ & Quang học', label: 'Quang phổ' },
    { id: 'Sắc ký & Khối phổ', label: 'Sắc ký & MS' },
    { id: 'Kính hiển vi & Hình ảnh', label: 'Kính hiển vi' },
    { id: 'Sinh học phân tử & Ly tâm', label: 'Sinh học & Ly tâm' },
    { id: 'Nhiệt & Phân tích vật liệu', label: 'Nhiệt & Vật liệu' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Lịch Đăng Ký & Khung Giờ Thiết Bị
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tự động kiểm tra xung đột và phê duyệt ngay khi khung giờ còn trống
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenBookingModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Ký Sử Dụng Máy</span>
          </button>
        </div>
      </div>

      {/* View Switcher: Toàn bộ timeline vs Lịch của tôi */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTabSub('timeline')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTabSub === 'timeline'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lưới Thời Gian Máy ({dateBookings.length} lịch ngày {selectedDate})
          </button>
          <button
            onClick={() => setActiveTabSub('my-bookings')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTabSub === 'my-bookings'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lịch Đăng Ký Của Tôi ({myBookings.length})
          </button>
        </div>

        {/* Date Selector shortcuts */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Hôm Nay
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
                selectedDate === tomorrowStr
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Ngày Mai
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Sub-view: Timeline */}
      {activeTabSub === 'timeline' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === c.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên máy, mã số, phòng..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Timeline Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span>
                  Lịch hoạt động thiết bị ngày:{' '}
                  <strong className="font-mono text-slate-900">{selectedDate}</strong>
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300 inline-block" />
                  Khung giờ trống (Nhấp để đặt)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                  Đã duyệt đặt
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Đang chạy máy
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                  Bảo trì
                </span>
              </div>
            </div>

            {/* Equipment Grid Rows */}
            <div className="divide-y divide-slate-100">
              {filteredEquipment.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không tìm thấy thiết bị nào phù hợp với bộ lọc.
                </div>
              ) : (
                filteredEquipment.map((eq) => {
                  const eqBookings = dateBookings.filter((b) => b.equipmentId === eq.id);
                  const isMaintenance = eq.status === 'maintenance';

                  return (
                    <div
                      key={eq.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
                    >
                      {/* Left: Equipment Info */}
                      <div className="lg:w-72 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {eq.code}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-sm font-medium ${
                              isMaintenance
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : eq.status === 'in_use'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isMaintenance ? 'Bảo trì' : eq.status === 'in_use' ? 'Đang chạy' : 'Sẵn sàng'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 mt-0.5 line-clamp-1" title={eq.name}>
                          {eq.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {eq.room}
                          </span>
                          <span>·</span>
                          <span>Tối đa {eq.maxBookingHoursPerSession}h</span>
                        </div>

                        {/* Quick Notes button */}
                        <button
                          type="button"
                          onClick={() => onOpenQuickNotes && onOpenQuickNotes(eq.id)}
                          className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                          title="Xem các ghi chú cấu hình máy của đồng nghiệp"
                        >
                          <StickyNote className="w-3 h-3 text-blue-500" />
                          <span>Quick Notes ({LabStorage.getQuickNotesForEquipment(eq.id).length})</span>
                        </button>
                      </div>

                      {/* Right: Visual Interactive Timeline bar */}
                      <div className="flex-1 min-w-0">
                        {isMaintenance ? (
                          <div className="h-10 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-slate-400" />
                            <span>{eq.safetyGuidelines || 'Đang bảo trì kỹ thuật, tạm ngưng nhận lịch'}</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Slots timeline */}
                            <div className="grid grid-cols-10 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              {timeSlots.map((slotTime) => {
                                // Check if this 1-hour block has an overlapping booking
                                const slotHour = parseInt(slotTime.split(':')[0], 10);
                                const overlappingBooking = eqBookings.find((b) => {
                                  const [bStartH, bStartM] = b.startTime.split(':').map(Number);
                                  const [bEndH, bEndM] = b.endTime.split(':').map(Number);
                                  const startDec = bStartH + bStartM / 60;
                                  const endDec = bEndH + bEndM / 60;
                                  return slotHour >= Math.floor(startDec) && slotHour < Math.ceil(endDec);
                                });

                                if (overlappingBooking) {
                                  const user = userMap.get(overlappingBooking.userId);
                                  const isActiveRun = overlappingBooking.status === 'active';

                                  return (
                                    <div
                                      key={slotTime}
                                      className={`h-9 rounded-sm p-1 text-[10px] flex flex-col justify-between overflow-hidden shadow-2xs ${
                                        isActiveRun ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                                      }`}
                                      title={`${overlappingBooking.startTime}-${overlappingBooking.endTime}: ${user?.name} (${overlappingBooking.purpose})`}
                                    >
                                      <div className="font-mono text-[9px] font-bold truncate leading-tight">
                                        {slotTime}
                                      </div>
                                      <div className="truncate text-[9px] font-medium leading-tight">
                                        {user?.name.split(' ').pop() || 'Đã đặt'}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={slotTime}
                                    onClick={() => onOpenBookingModal(eq.id)}
                                    className="h-9 rounded-sm p-1 text-[10px] bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex flex-col justify-between group cursor-pointer"
                                    title={`Khung ${slotTime} còn trống. Nhấp để đăng ký.`}
                                  >
                                    <span className="font-mono text-[9px] text-slate-400 group-hover:text-blue-600">
                                      {slotTime}
                                    </span>
                                    <span className="text-[9px] text-emerald-600 opacity-0 group-hover:opacity-100 font-semibold truncate">
                                      + Đặt
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Bookings details text list under equipment if any */}
                            {eqBookings.length > 0 && (
                              <div className="flex items-center gap-3 overflow-x-auto text-[11px] text-slate-600 pt-0.5">
                                <span className="text-slate-400 shrink-0 font-medium">Phiên trong ngày:</span>
                                {eqBookings.map((b) => {
                                  const u = userMap.get(b.userId);
                                  const isCurrentUser = b.userId === currentUser.id;
                                  return (
                                    <span
                                      key={b.id}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-100 border border-slate-200 shrink-0"
                                    >
                                      <span className="font-mono font-semibold text-slate-800">
                                        {b.startTime} - {b.endTime}
                                      </span>
                                      <span className="text-slate-500">({u?.name})</span>
                                      {b.projectCode && (
                                        <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-mono font-medium">
                                          {b.projectCode}
                                        </span>
                                      )}
                                      {isCurrentUser && (
                                        <span className="text-[10px] text-blue-600 font-bold">(Bạn)</span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: My Bookings */}
      {activeTabSub === 'my-bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Danh sách đăng ký của {currentUser.name} ({currentUser.title})
            </h3>
            <button
              onClick={() => onOpenBookingModal()}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đăng ký phiên mới</span>
            </button>
          </div>

          {myBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">Chưa có lịch đăng ký nào</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Bạn chưa đăng ký sử dụng máy móc nào. Chọn thiết bị và khung giờ để tự động duyệt lịch ngay.
              </p>
              <button
                onClick={() => onOpenBookingModal()}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Đăng ký ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBookings.map((b) => {
                const eq = eqMap.get(b.equipmentId);
                const isToday = b.date === todayStr;
                const isConfirmed = b.status === 'confirmed';
                const isActive = b.status === 'active';
                const isCompleted = b.status === 'completed';
                const isCancelled = b.status === 'cancelled';

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-xl border p-5 shadow-2xs space-y-3 transition-colors ${
                      isActive
                        ? 'border-amber-300 ring-1 ring-amber-400'
                        : isCancelled
                        ? 'border-slate-200 opacity-60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {eq?.code || b.equipmentId}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {eq?.name || 'Thiết bị thí nghiệm'}
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{eq?.room}</span>
                          <span>·</span>
                          <span className="font-mono font-medium text-slate-800">{b.date}</span>
                          {isToday && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ${
                          isActive
                            ? 'bg-amber-100 text-amber-800'
                            : isConfirmed
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isActive
                          ? 'Đang chạy máy'
                          : isConfirmed
                          ? 'Đã duyệt tự động'
                          : isCompleted
                          ? 'Đã hoàn thành'
                          : 'Đã hủy'}
                      </span>
                    </div>

                    {/* Time & Purpose */}
                    <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-mono font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {b.startTime} - {b.endTime}
                        </span>
                        {b.projectCode && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200 inline-flex items-center gap-1 font-mono">
                            <FolderGit2 className="w-3 h-3 text-indigo-600" />
                            {b.projectCode}
                          </span>
                        )}
                        {b.plannedSupplies && b.plannedSupplies.length > 0 && (
                          <span 
                            className="text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1"
                            title={b.plannedSupplies.map((s) => `${s.supplyName} (${s.quantity} ${s.unit})`).join(', ')}
                          >
                            <Package className="w-3 h-3 text-amber-600" />
                            {b.plannedSupplies.length} vật tư dự trù
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 text-xs">
                        <span className="font-medium text-slate-700">Nội dung: </span>
                        {b.purpose}
                      </div>
                      {b.notes && (
                        <div className="text-slate-500 text-[11px] italic">
                          Ghi chú: {b.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions: Check-in / Cancel */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400">
                        Mã: <span className="font-mono">{b.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isConfirmed && (
                          <>
                            <button
                              onClick={() => handleSendReminderEmail(b)}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Gửi email nhắc nhở sắp đến giờ sử dụng tới email người dùng"
                            >
                              <BellRing className="w-3 h-3 text-blue-600" />
                              <span>Gửi Email Nhắc Giờ</span>
                            </button>
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              Hủy lịch
                            </button>
                            {eq && (
                              <button
                                type="button"
                                onClick={() => onOpenQuickNotes && onOpenQuickNotes(eq.id)}
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-1"
                                title="Tham khảo cấu hình & lưu ý trước khi vào ca đo"
                              >
                                <StickyNote className="w-3 h-3 text-blue-600" />
                                <span>Cấu hình máy ({LabStorage.getQuickNotesForEquipment(eq.id).length})</span>
                              </button>
                            )}
                            {eq && (
                              <button
                                onClick={() => onOpenCheckInModal(eq, b)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3" />
                                <span>Nhận Máy (Check-in)</span>
                              </button>
                            )}
                          </>
                        )}

                        {isActive && (
                          <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Vào tab Nhật Ký để Check-out</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
