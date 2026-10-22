import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { 
  CalendarDays, 
  BookOpenCheck, 
  FlaskConical, 
  Users, 
  BarChart3, 
  ChevronDown, 
  ShieldCheck, 
  GraduationCap, 
  Microscope,
  RotateCcw,
  KeyRound,
  DatabaseZap,
  Plus,
  LogOut,
  Mail,
  StickyNote,
  QrCode,
  Sparkles,
  Bot,
  FolderGit2,
  LayoutDashboard,
  AlertTriangle
} from 'lucide-react';
import { LabLogProLogo, AcademicHeaderBadges } from './LabLogos';

export type ActiveTab = 'dashboard' | 'calendar' | 'logbook' | 'equipment' | 'projects' | 'users' | 'analytics';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  onChangePassword: () => void;
  onImportSample: () => void;
  onRefreshData: () => void;
  onOpenQuickBook: () => void;
  onLogout: () => void;
  onOpenEmails: () => void;
  unreadEmailCount: number;
  onOpenQuickNotes?: () => void;
  onOpenQRScanner?: () => void;
  onOpenGeminiChat?: () => void;
  checkoutAlertCount?: number;
  hasOverdueCheckout?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onChangePassword,
  onImportSample,
  onRefreshData,
  onOpenQuickBook,
  onLogout,
  onOpenEmails,
  unreadEmailCount,
  onOpenQuickNotes,
  onOpenQRScanner,
  onOpenGeminiChat,
  checkoutAlertCount = 0,
  hasOverdueCheckout = false,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Ghi chiều cao header vào biến CSS để banner cảnh báo dính ngay bên dưới
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const navLinks: { id: ActiveTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tổng Quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'calendar', label: 'Lịch Đăng Ký', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'logbook', label: 'Nhật Ký Sử Dụng', icon: <BookOpenCheck className="w-4 h-4" /> },
    { id: 'equipment', label: 'Danh Mục Thiết Bị', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'projects', label: 'Dự Án Nghiên Cứu', icon: <FolderGit2 className="w-4 h-4" /> },
    { id: 'users', label: 'Quản Lý Người Dùng', icon: <Users className="w-4 h-4" /> },
    { id: 'analytics', label: 'Thống Kê & Báo Cáo', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Quản Trị', icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'text-indigo-700 bg-indigo-50 border border-indigo-200' };
      case 'instructor':
        return { label: 'Giảng Viên', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
      case 'researcher':
        return { label: 'Nghiên Cứu Viên', icon: <Microscope className="w-3.5 h-3.5" />, color: 'text-blue-700 bg-blue-50 border border-blue-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
          {/* Zone 1: Brand Wordmark & Institutional Accreditation Badges */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer transition-opacity hover:opacity-95"
            >
              <LabLogProLogo size={36} />
            </button>

            {/* Academic Seals (ĐH Y Dược TP.HCM - Trường Dược - Bộ Môn Bào Chế) */}
            <div className="hidden xl:flex items-center pl-3 border-l border-slate-200">
              <AcademicHeaderBadges compact />
            </div>
          </div>

          {/* Zone 3: Primary Action & Quick User Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Gemini AI Assistant Button with Google Search badge */}
            {onOpenGeminiChat && (
              <button
                onClick={onOpenGeminiChat}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:from-blue-100 hover:to-indigo-100 text-indigo-900 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                title="Mở Trợ lý AI phòng Lab"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200" />
                <span className="hidden md:inline">Trợ Lý AI</span>
              </button>
            )}
            {/* QR Scanner button */}
            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="hidden sm:flex px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 text-slate-700 transition-colors items-center gap-1.5 text-xs font-semibold"
                title="Quét mã QR tem máy phòng lab để Check-in nhanh hoặc xem SOP/Video"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span className="hidden md:inline">Quét QR</span>
              </button>
            )}

            {/* Quick Notes button */}
            <button
              onClick={onOpenQuickNotes}
              className="hidden sm:flex px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-700 transition-colors items-center gap-1.5 text-xs font-semibold"
              title="Sổ Quick Notes & Cấu hình thiết bị của đồng nghiệp"
            >
              <StickyNote className="w-4 h-4 text-amber-500 fill-amber-100" />
              <span className="hidden xl:inline">Quick Notes</span>
            </button>

            {/* Email Notification Inbox Button */}
            <button
              onClick={onOpenEmails}
              className="relative p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 transition-colors"
              title="Hộp thư thông báo Email tự động (Xác nhận & Nhắc nhở ca đo)"
            >
              <Mail className="w-4 h-4 text-slate-600" />
              {unreadEmailCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center font-mono leading-none shadow-xs">
                  {unreadEmailCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenQuickBook}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đăng Ký Máy</span>
            </button>

            {/* Quick User Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                title="Tài khoản của bạn"
              >
                <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs ${currentUser.avatarBg}`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{currentUser.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                    {currentUser.department}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{currentUser.title} {currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">{currentUser.email}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.department}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onChangePassword();
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đổi mật khẩu</span>
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onRefreshData();
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tải lại dữ liệu mới nhất</span>
                      </button>
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Nạp danh mục mẫu (thiết bị kèm SOP, vật tư tiêu hao, ghi chú cấu hình, lịch sử bảo trì, đề tài mẫu) vào Google Sheet?\n\nDữ liệu đang có sẽ KHÔNG bị ghi đè. Bạn có thể sửa hoặc xóa từng mục sau.'
                              )
                            ) {
                              setUserDropdownOpen(false);
                              onImportSample();
                            }
                          }}
                          className="w-full text-left px-4 py-2 flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <DatabaseZap className="w-3.5 h-3.5 text-slate-500" />
                          <span>Nạp danh mục thiết bị mẫu</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 px-4 pb-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hàng tab điều hướng (cuộn ngang trên màn hình hẹp) */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1.5 border-t border-slate-100 scrollbar-none -mx-1 px-1">
          {navLinks.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLogbook = tab.id === 'logbook';
            const showCheckoutAlert = isLogbook && checkoutAlertCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                
                {/* Urgent Check-out indicator badge */}
                {showCheckoutAlert && (
                  <span 
                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                      hasOverdueCheckout
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-amber-500 text-white'
                    }`}
                    title={hasOverdueCheckout ? 'Có ca làm việc đã quá hạn chưa Check-out!' : 'Bạn đang có ca làm việc chưa trả máy'}
                  >
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span>{checkoutAlertCount} Cần trả</span>
                  </span>
                )}

                {tab.id === 'users' && currentUser.role === 'admin' && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">Admin</span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
