import React, { useState } from 'react';
import { EmailNotification, User, Booking, Equipment } from '../types';
import { LabStorage } from '../services/storage';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  Send, 
  CheckCheck, 
  ShieldCheck, 
  FlaskConical, 
  ExternalLink,
  BellRing
} from 'lucide-react';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  equipmentList: Equipment[];
  bookings: Booking[];
  emails: EmailNotification[];
  onRefresh: () => void;
  onNavigateToCheckIn?: (booking: Booking) => void;
}

export const EmailInboxModal: React.FC<EmailInboxModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers: _allUsers,
  equipmentList,
  bookings,
  emails,
  onRefresh,
  onNavigateToCheckIn,
}) => {
  const [filterMode, setFilterMode] = useState<'my' | 'all'>('my');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSendingSimulated, setIsSendingSimulated] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter emails
  const filteredEmails = emails.filter((mail) => {
    if (filterMode === 'my') {
      return mail.toEmail.toLowerCase() === currentUser.email.toLowerCase();
    }
    return true;
  });

  const activeEmail = emails.find((m) => m.id === selectedEmailId) || filteredEmails[0] || null;

  const handleSelectEmail = (mail: EmailNotification) => {
    setSelectedEmailId(mail.id);
    if (!mail.read) {
      LabStorage.markEmailRead(mail.id);
      onRefresh();
    }
  };

  const handleMarkAllRead = () => {
    LabStorage.markAllEmailsRead(filterMode === 'my' ? currentUser.email : undefined);
    onRefresh();
  };

  // Gửi lại email nhắc cho lịch sắp tới gần nhất của người dùng (email thật qua máy chủ)
  const handleSimulateUpcomingReminder = async () => {
    setIsSendingSimulated(true);
    const upcoming = bookings
      .filter((b) => b.userId === currentUser.id && b.status === 'confirmed')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

    if (!upcoming) {
      alert('Bạn chưa có lịch đăng ký nào đang chờ nhận máy.');
      setIsSendingSimulated(false);
      return;
    }

    const res = await LabStorage.sendUpcomingReminderEmail(upcoming);
    setIsSendingSimulated(false);
    if (!res.success) {
      alert(res.error || 'Không gửi được email nhắc lịch.');
      return;
    }
    onRefresh();
    if (res.email) setSelectedEmailId(res.email.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] max-h-[800px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Hộp Thư Thông Báo Email Tự Động (Lab Mail Gateway)</span>
                <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  {emails.length} thư đã gửi
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bản lưu các email hệ thống đã gửi: xác nhận lịch, nhắc trước giờ sử dụng, cảnh báo sự cố
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateUpcomingReminder}
              disabled={isSendingSimulated}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              title="Gửi email nhắc cho lịch sắp tới gần nhất của bạn"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{isSendingSimulated ? 'Đang gửi...' : 'Gửi Email Nhắc Lịch Sắp Tới'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Hộp thư:</span>
            <button
              onClick={() => setFilterMode('my')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'my'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thư gửi cho tôi ({currentUser.email})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả thư hệ thống
            </button>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đánh dấu đã đọc</span>
          </button>
        </div>

        {/* Body Split-View: Email List on Left, Email HTML Card on Right */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Email List Column */}
          <div className="md:w-5/12 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 bg-slate-50/40">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có email nào trong hộp thư này. Hãy tạo một lịch đăng ký mới để nhận email xác nhận tự động!
              </div>
            ) : (
              filteredEmails.map((mail) => {
                const isSelected = activeEmail?.id === mail.id;
                const isUpcoming = mail.type === 'upcoming_reminder';

                return (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectEmail(mail)}
                    className={`p-4 cursor-pointer transition-colors text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-white border-l-4 border-l-blue-600 shadow-2xs'
                        : 'hover:bg-slate-100/60'
                    } ${!mail.read ? 'bg-blue-50/40 font-medium' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {mail.toName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {new Date(mail.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isUpcoming ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Nhắc Giờ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Xác Nhận
                        </span>
                      )}
                      <span className="text-slate-800 line-clamp-1 font-medium">
                        {mail.subject}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {mail.htmlPreview.headline}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Email Detail HTML Container */}
          <div className="md:w-7/12 flex-1 overflow-y-auto p-6 bg-white">
            {activeEmail ? (
              <div className="max-w-xl mx-auto space-y-5">
                {/* Email Meta Header */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        LAB
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          Hệ thống Thông Báo LabLog Pro &lt;no-reply@lab.edu.vn&gt;
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tới: <strong>{activeEmail.toName}</strong> &lt;{activeEmail.toEmail}&gt;
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(activeEmail.sentAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-slate-900">
                    {activeEmail.subject}
                  </div>
                </div>

                {/* Rendered HTML Institutional Letterhead */}
                <div className="border border-slate-200 rounded-2xl shadow-xs overflow-hidden bg-white text-slate-900">
                  {/* Top University Lab Banner */}
                  <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm tracking-tight block">
                          TRUNG TÂM THÍ NGHIỆM & PHÂN TÍCH
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Phòng Thí Nghiệm Trọng Điểm Quốc Gia
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                      ISO/IEC 17025
                    </span>
                  </div>

                  {/* Email Body Content */}
                  <div className="p-6 space-y-4 text-xs sm:text-sm">
                    <p className="font-semibold text-slate-800 text-sm">
                      {activeEmail.htmlPreview.greeting}
                    </p>

                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <h4 className="font-bold text-blue-900 text-xs sm:text-sm">
                        {activeEmail.htmlPreview.headline}
                      </h4>
                    </div>

                    <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                      {activeEmail.htmlPreview.contentParagraphs.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>

                    {/* Booking Details Summary Box */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold uppercase tracking-wider text-[11px] text-slate-500 border-b border-slate-200 pb-1">
                        Thông Tin Đăng Ký Đã Ghi Nhận
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          Mã thiết bị: <strong className="font-mono text-slate-900">{activeEmail.equipmentCode}</strong>
                        </div>
                        <div>
                          Phòng đặt máy: <strong>{activeEmail.room}</strong>
                        </div>
                        <div>
                          Ngày sử dụng: <strong className="font-mono">{activeEmail.date}</strong>
                        </div>
                        <div>
                          Khung giờ: <strong className="font-mono text-blue-700">{activeEmail.timeSlot}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Security & Safety Note */}
                    {activeEmail.htmlPreview.securityNotes && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>{activeEmail.htmlPreview.securityNotes}</div>
                      </div>
                    )}

                    {/* Action Button in Email */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          if (onNavigateToCheckIn && activeEmail.bookingId) {
                            const b = bookings.find((item) => item.id === activeEmail.bookingId);
                            if (b) onNavigateToCheckIn(b);
                          }
                        }}
                        className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <span>{activeEmail.htmlPreview.actionLabel || 'Truy Cập Hệ Thống Check-in'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Institutional Email Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 space-y-1">
                    <p>
                      Email này được gửi tự động từ Hệ thống Quản lý Thiết bị LabLog Pro. Vui lòng không trả lời trực tiếp email này.
                    </p>
                    <p>
                      Hỗ trợ kỹ thuật: support-lab@lab.edu.vn | Đường dây nóng phòng lab: (024) 3869 1234.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chọn một email từ danh sách bên trái để đọc nội dung.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
