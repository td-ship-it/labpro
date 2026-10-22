/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { User, Equipment, Booking, UsageLog, EmailNotification } from './types';
import { LabStorage } from './services/storage';
import { AuthPage } from './components/AuthPage';
import { Navbar, ActiveTab } from './components/Navbar';
import { GeminiFloatingButton } from './components/GeminiFloatingButton';
import { CheckoutAlertBanner } from './components/CheckoutAlertBanner';
import { CheckoutWarningModal } from './components/CheckoutWarningModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import {
  LabLogProLogo,
  UmpHcmLogo,
  UmpSchoolOfPharmacyLogo,
  BaocheDeptLogo,
  AcademicHeaderBadges,
  VilasLogo,
  Iso17025Badge,
} from './components/LabLogos';
import { CheckCircle2, AlertCircle, Loader2, Mail, StickyNote, QrCode, Sparkles } from 'lucide-react';

const PENDING_QR_KEY = 'lablog_pending_qr';

// Tải từng phần giao diện khi cần: trang đăng nhập hiện nhanh, các tab/hộp thoại tải ngầm sau khi đăng nhập
const loadDashboardOverview = () => import('./components/DashboardOverview');
const loadBookingCalendar = () => import('./components/BookingCalendar');
const loadUsageLogbook = () => import('./components/UsageLogbook');
const loadEquipmentManager = () => import('./components/EquipmentManager');
const loadUserManager = () => import('./components/UserManager');
const loadAnalyticsView = () => import('./components/AnalyticsView');
const loadProjectTrackingView = () => import('./components/ProjectTrackingView');
const loadBookingModal = () => import('./components/BookingModal');
const loadCheckInOutModal = () => import('./components/CheckInOutModal');
const loadEmailInboxModal = () => import('./components/EmailInboxModal');
const loadQuickNotesModal = () => import('./components/QuickNotesModal');
const loadEquipmentQRModal = () => import('./components/EquipmentQRModal');
const loadQRScannerModal = () => import('./components/QRScannerModal');
const loadGeminiChatModal = () => import('./components/GeminiChatModal');
const loadAiDocsManager = () => import('./components/AiDocsManager');
const DashboardOverview = lazy(() => loadDashboardOverview().then((m) => ({ default: m.DashboardOverview })));
const BookingCalendar = lazy(() => loadBookingCalendar().then((m) => ({ default: m.BookingCalendar })));
const UsageLogbook = lazy(() => loadUsageLogbook().then((m) => ({ default: m.UsageLogbook })));
const EquipmentManager = lazy(() => loadEquipmentManager().then((m) => ({ default: m.EquipmentManager })));
const UserManager = lazy(() => loadUserManager().then((m) => ({ default: m.UserManager })));
const AnalyticsView = lazy(() => loadAnalyticsView().then((m) => ({ default: m.AnalyticsView })));
const ProjectTrackingView = lazy(() => loadProjectTrackingView().then((m) => ({ default: m.ProjectTrackingView })));
const BookingModal = lazy(() => loadBookingModal().then((m) => ({ default: m.BookingModal })));
const CheckInOutModal = lazy(() => loadCheckInOutModal().then((m) => ({ default: m.CheckInOutModal })));
const EmailInboxModal = lazy(() => loadEmailInboxModal().then((m) => ({ default: m.EmailInboxModal })));
const QuickNotesModal = lazy(() => loadQuickNotesModal().then((m) => ({ default: m.QuickNotesModal })));
const EquipmentQRModal = lazy(() => loadEquipmentQRModal().then((m) => ({ default: m.EquipmentQRModal })));
const QRScannerModal = lazy(() => loadQRScannerModal().then((m) => ({ default: m.QRScannerModal })));
const GeminiChatModal = lazy(() => loadGeminiChatModal().then((m) => ({ default: m.GeminiChatModal })));
const AiDocsManager = lazy(() => loadAiDocsManager().then((m) => ({ default: m.AiDocsManager })));
const preloadAll = () => {
  [
    loadDashboardOverview,
    loadBookingCalendar,
    loadUsageLogbook,
    loadEquipmentManager,
    loadUserManager,
    loadAnalyticsView,
    loadProjectTrackingView,
    loadBookingModal,
    loadCheckInOutModal,
    loadEmailInboxModal,
    loadQuickNotesModal,
    loadEquipmentQRModal,
    loadQRScannerModal,
    loadGeminiChatModal,
  ].forEach((fn) => fn().catch(() => {}));
};

const TabFallback = () => (
  <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>Đang tải...</span>
  </div>
);

export default function App() {
  // Có bản dữ liệu đã lưu của phiên trước → hiện ứng dụng ngay, không qua màn hình chờ
  const [currentUser, setCurrentUser] = useState<User | null>(() => LabStorage.hydrateFromSnapshot());
  const [booting, setBooting] = useState<boolean>(LabStorage.hasStoredSession() && !LabStorage.hasSnapshot());
  const [bootError, setBootError] = useState<string | null>(null);
  const [isChangePwOpen, setIsChangePwOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [allUsers, setAllUsers] = useState<User[]>(LabStorage.getUsers());
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(LabStorage.getEquipment());
  const [bookings, setBookings] = useState<Booking[]>(LabStorage.getBookings());
  const [logs, setLogs] = useState<UsageLog[]>(LabStorage.getLogs());
  const [emails, setEmails] = useState<EmailNotification[]>(LabStorage.getEmails());

  // Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [preselectedEqId, setPreselectedEqId] = useState<string | undefined>(undefined);
  const [preselectedProjectId, setPreselectedProjectId] = useState<string | undefined>(undefined);
  const [bookingTimePresets, setBookingTimePresets] = useState<{
    date?: string;
    startTime?: string;
    endTime?: string;
  }>({});
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  const [checkInOutModal, setCheckInOutModal] = useState<{
    isOpen: boolean;
    mode: 'checkin' | 'checkout';
    equipment: Equipment | null;
    activeBooking?: Booking;
    activeLog?: UsageLog;
  }>({
    isOpen: false,
    mode: 'checkin',
    equipment: null,
  });

  const [quickNotesModal, setQuickNotesModal] = useState<{
    isOpen: boolean;
    equipmentId?: string;
  }>({
    isOpen: false,
    equipmentId: undefined,
  });

  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    equipment: Equipment | null;
  }>({
    isOpen: false,
    equipment: null,
  });

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const [geminiChatModal, setGeminiChatModal] = useState<{
    isOpen: boolean;
    equipmentContext?: Equipment | null;
  }>({
    isOpen: false,
    equipmentContext: null,
  });

  const handleOpenGeminiChat = (equipment?: Equipment | null) => {
    setGeminiChatModal({
      isOpen: true,
      equipmentContext: equipment || null,
    });
  };

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);
  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), isError ? 7000 : 4000);
  };

  const refreshAllState = () => {
    setAllUsers(LabStorage.getUsers());
    setEquipmentList(LabStorage.getEquipment());
    setBookings(LabStorage.getBookings());
    setLogs(LabStorage.getLogs());
    setEmails(LabStorage.getEmails());
    const curr = LabStorage.getCurrentUser();
    setCurrentUser(curr);
  };

  // Đồng bộ màn hình mỗi khi kho dữ liệu thay đổi (sau mỗi lần máy chủ trả lời)
  useEffect(() => {
    LabStorage.setErrorHandler((msg) => showToast(msg, true));
    LabStorage.setSessionEndedHandler(() => {
      setCurrentUser(null);
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', true);
    });
    return LabStorage.subscribe(refreshAllState);
  }, []);

  // Khôi phục phiên đăng nhập đã lưu khi mở trang
  const restore = () => {
    setBooting(!LabStorage.hasSnapshot());
    setBootError(null);
    LabStorage.restoreSession()
      .then((u) => {
        setCurrentUser(u);
        refreshAllState();
      })
      .catch((e) => setBootError(e?.message || 'Không tải được dữ liệu.'))
      .finally(() => setBooting(false));
  };

  useEffect(() => {
    if (LabStorage.hasStoredSession()) restore();
  }, []);

  // Đang ở trang đăng nhập: tải sẵn màn hình Tổng quan để vào ngay sau khi đăng nhập
  useEffect(() => {
    if (currentUser) return;
    const id = window.setTimeout(() => loadDashboardOverview().catch(() => {}), 500);
    return () => window.clearTimeout(id);
  }, [currentUser?.id]);

  // Tải ngầm các tab và hộp thoại ngay sau khi đăng nhập để chuyển tab tức thì
  useEffect(() => {
    if (!currentUser) return;
    const id = window.setTimeout(preloadAll, 300);
    return () => window.clearTimeout(id);
  }, [currentUser?.id]);

  const [chatMounted, setChatMounted] = useState<boolean>(false);
  useEffect(() => {
    if (geminiChatModal.isOpen) setChatMounted(true);
  }, [geminiChatModal.isOpen]);

  // Tự tải lại dữ liệu mới (lịch người khác vừa đặt...) mỗi 60 giây khi tab đang mở
  useEffect(() => {
    if (!currentUser) return;
    const tick = () => {
      if (document.visibilityState === 'visible' && !LabStorage.isBusy()) {
        LabStorage.refresh().catch(() => {});
      }
    };
    const id = window.setInterval(tick, 60000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    refreshAllState();
    showToast(`Đăng nhập thành công! Chào mừng ${user.name} (${user.title}).`);
  };

  // Real-time active check-in sessions of current user
  const myActiveSessions = useMemo(() => {
    if (!currentUser) return [];
    const active = logs.filter((l) => l.userId === currentUser.id && !l.checkOutTime);
    const now = Date.now();
    return active.map((log) => {
      const eq = equipmentList.find((e) => e.id === log.equipmentId);
      const booking = log.bookingId ? bookings.find((b) => b.id === log.bookingId) : undefined;
      const checkInMs = new Date(log.checkInTime).getTime();
      const elapsedMinutes = Math.max(1, Math.round((now - checkInMs) / 60000));
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const elapsedDisplay = hours > 0 ? `${hours}h ${mins}p` : `${mins} phút`;
      const maxAllowed = eq?.maxBookingHoursPerSession || 4;

      let isOverdue = false;
      if (booking) {
        const bookingEndMs = new Date(`${booking.date}T${booking.endTime}:00`).getTime();
        if (now > bookingEndMs) isOverdue = true;
      } else if (elapsedMinutes > maxAllowed * 60) {
        isOverdue = true;
      }
      return { log, equipment: eq, elapsedDisplay, isOverdue };
    });
  }, [logs, currentUser?.id, equipmentList, bookings]);

  const hasOverdueCheckout = useMemo(() => {
    return myActiveSessions.some((s) => s.isOverdue);
  }, [myActiveSessions]);

  // Safeguard modal before logout or user switch with active session
  const [checkoutWarningModal, setCheckoutWarningModal] = useState<{
    isOpen: boolean;
    pendingAction: 'logout' | { switchUserId: string } | null;
  }>({
    isOpen: false,
    pendingAction: null,
  });

  const handleLogout = async () => {
    await LabStorage.logout();
    setCurrentUser(null);
    showToast('Đã đăng xuất khỏi hệ thống.');
  };

  const initiateLogout = () => {
    if (myActiveSessions.length > 0) {
      setCheckoutWarningModal({
        isOpen: true,
        pendingAction: 'logout',
      });
      return;
    }
    handleLogout();
  };

  const handleImportSample = async () => {
    showToast('Đang nạp danh mục mẫu lên Google Sheet...');
    const res = await LabStorage.importSampleData();
    if (res.success) {
      const c = res.counts || {};
      showToast(
        `Đã nạp: ${c.equipment || 0} thiết bị, ${c.supplies || 0} vật tư, ${c.quickNotes || 0} ghi chú, ${c.maintenance || 0} phiếu bảo trì, ${c.projects || 0} đề tài.`,
      );
    } else {
      showToast(res.error || 'Không nạp được dữ liệu mẫu.', true);
    }
  };

  const handleManualRefresh = async () => {
    try {
      await LabStorage.refresh(true);
      showToast('Đã tải lại dữ liệu mới nhất từ máy chủ.');
    } catch (e: any) {
      showToast(e?.message || 'Không tải lại được dữ liệu.', true);
    }
  };

  const handleOpenBookingModal = (
    eqId?: string,
    preferredDate?: string,
    preferredStartTime?: string,
    preferredEndTime?: string,
    projectId?: string,
  ) => {
    if (currentUser?.status === 'suspended') {
      showToast('Tài khoản của bạn đang bị tạm khóa quyền đăng ký. Vui lòng liên hệ Admin phòng Lab.');
      return;
    }
    setPreselectedEqId(eqId);
    setPreselectedProjectId(projectId);
    setBookingTimePresets({
      date: preferredDate,
      startTime: preferredStartTime,
      endTime: preferredEndTime,
    });
    setIsBookingModalOpen(true);
  };

  const handleOpenCheckInModal = (equipment: Equipment, booking?: Booking) => {
    setCheckInOutModal({
      isOpen: true,
      mode: 'checkin',
      equipment,
      activeBooking: booking,
    });
  };

  const handleOpenCheckOutModal = (equipment: Equipment, log: UsageLog) => {
    setCheckInOutModal({
      isOpen: true,
      mode: 'checkout',
      equipment,
      activeLog: log,
    });
  };

  const handleOpenQuickNotes = (eqId?: string) => {
    setQuickNotesModal({
      isOpen: true,
      equipmentId: eqId,
    });
  };

  const handleOpenQRModal = (equipment: Equipment) => {
    setQrModal({
      isOpen: true,
      equipment,
    });
  };

  const handleOpenQRScanner = () => {
    setIsScannerOpen(true);
  };

  // Mở thẻ thiết bị khi quét QR (?qr_equipment=... hoặc #equipment-...). Nếu chưa đăng nhập thì nhớ lại để mở sau.
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const qrParam = urlParams.get('qr_equipment') || urlParams.get('qr');
      const hash = window.location.hash;
      const code = qrParam || (hash && hash.includes('equipment-') ? hash.replace('#equipment-', '') : '');
      if (code) {
        sessionStorage.setItem(PENDING_QR_KEY, code);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // bỏ qua
    }
  }, []);

  useEffect(() => {
    if (!currentUser || equipmentList.length === 0) return;
    let code: string | null = null;
    try {
      code = sessionStorage.getItem(PENDING_QR_KEY);
    } catch {
      return;
    }
    if (!code) return;
    try {
      sessionStorage.removeItem(PENDING_QR_KEY);
    } catch {
      // bỏ qua
    }
    const q = decodeURIComponent(code).toLowerCase();
    const found = equipmentList.find((e) => e.id.toLowerCase() === q || e.code.toLowerCase() === q);
    if (found) {
      setQrModal({ isOpen: true, equipment: found });
      showToast(`Đã nhận diện mã QR thiết bị: [${found.code}] ${found.name}!`);
    }
  }, [currentUser?.id, equipmentList.length]);

  // Unread email count for currentUser
  const unreadEmailCount = currentUser
    ? emails.filter((m) => !m.read && m.toEmail.toLowerCase() === currentUser.email.toLowerCase()).length
    : 0;

  // If user is not logged in, render the AuthPage (Landing / Login / Register)
  const toastNode = toastMessage && (
    <div className="fixed bottom-5 right-5 z-[60] max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        role="status"
        className={`text-white px-4 py-3 rounded-xl shadow-xl flex items-start gap-2.5 text-xs font-medium border ${
          toastIsError ? 'bg-rose-700 border-rose-500' : 'bg-slate-900 border-slate-700'
        }`}
      >
        {toastIsError ? (
          <AlertCircle className="w-4 h-4 text-white shrink-0 mt-px" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
        )}
        <span>{toastMessage}</span>
      </div>
    </div>
  );

  if (booting || (bootError && !currentUser)) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <LabLogProLogo size={44} className="[&_span]:text-white [&_span.text-slate-500]:text-slate-400" />
        {booting ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải dữ liệu phòng thí nghiệm...</span>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-rose-300">{bootError}</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={restore} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                Thử lại
              </button>
              <button
                onClick={() => {
                  setBootError(null);
                  LabStorage.logout();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 hover:bg-slate-800"
              >
                Về trang đăng nhập
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthPage onLoginSuccess={handleLoginSuccess} />
        {toastNode}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onChangePassword={() => setIsChangePwOpen(true)}
        onImportSample={handleImportSample}
        onRefreshData={handleManualRefresh}
        onOpenQuickBook={() => handleOpenBookingModal()}
        onLogout={initiateLogout}
        onOpenEmails={() => setIsEmailModalOpen(true)}
        unreadEmailCount={unreadEmailCount}
        onOpenQuickNotes={() => handleOpenQuickNotes()}
        onOpenQRScanner={handleOpenQRScanner}
        onOpenGeminiChat={() => handleOpenGeminiChat()}
        checkoutAlertCount={myActiveSessions.length}
        hasOverdueCheckout={hasOverdueCheckout}
      />

      {/* Real-time Check-out Sticky Warning Banner */}
      <CheckoutAlertBanner
        currentUser={currentUser}
        logs={logs}
        equipmentList={equipmentList}
        bookings={bookings}
        allUsers={allUsers}
        onOpenCheckOut={(eq, log) => handleOpenCheckOutModal(eq, log)}
        onOpenQuickNotes={(eqId) => handleOpenQuickNotes(eqId)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'dashboard' && (
            <DashboardOverview
              currentUser={currentUser}
              allUsers={allUsers}
              equipmentList={equipmentList}
              bookings={bookings}
              logs={logs}
              emails={emails}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenQuickBook={(eqId) => handleOpenBookingModal(eqId)}
              onOpenCheckIn={(eq, booking) => handleOpenCheckInModal(eq, booking)}
              onOpenCheckOut={(eq, log) => {
                if (log) {
                  handleOpenCheckOutModal(eq, log);
                } else {
                  setCheckInOutModal({
                    isOpen: true,
                    mode: 'checkout',
                    equipment: eq,
                  });
                }
              }}
              onOpenEmails={() => setIsEmailModalOpen(true)}
              onOpenQRScanner={handleOpenQRScanner}
              onOpenGeminiChat={handleOpenGeminiChat}
              onOpenQRModal={handleOpenQRModal}
              onRefresh={refreshAllState}
            />
          )}

          {activeTab === 'calendar' && (
            <BookingCalendar
              currentUser={currentUser}
              allUsers={allUsers}
              equipmentList={equipmentList}
              bookings={bookings}
              logs={logs}
              onOpenBookingModal={handleOpenBookingModal}
              onOpenCheckInModal={handleOpenCheckInModal}
              onRefresh={refreshAllState}
              onOpenQuickNotes={handleOpenQuickNotes}
            />
          )}

          {activeTab === 'logbook' && (
            <UsageLogbook
              currentUser={currentUser}
              allUsers={allUsers}
              equipmentList={equipmentList}
              bookings={bookings}
              logs={logs}
              onOpenCheckInModal={handleOpenCheckInModal}
              onOpenCheckOutModal={handleOpenCheckOutModal}
              onRefresh={refreshAllState}
            />
          )}

          {activeTab === 'equipment' && (
            <EquipmentManager
              currentUser={currentUser}
              equipmentList={equipmentList}
              onOpenBookingModal={handleOpenBookingModal}
              onRefresh={refreshAllState}
              onOpenQuickNotes={handleOpenQuickNotes}
              onOpenQRModal={handleOpenQRModal}
              onOpenQRScanner={handleOpenQRScanner}
              onNavigateToMaintenanceForecast={() => setActiveTab('analytics')}
              onOpenGeminiChat={handleOpenGeminiChat}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectTrackingView
              currentUser={currentUser}
              allUsers={allUsers}
              equipmentList={equipmentList}
              bookings={bookings}
              logs={logs}
              onOpenBookingModal={handleOpenBookingModal}
              onRefresh={refreshAllState}
            />
          )}

          {activeTab === 'users' && <UserManager currentUser={currentUser} allUsers={allUsers} onRefresh={refreshAllState} />}

          {activeTab === 'aidocs' && currentUser.role === 'admin' && (
            <AiDocsManager currentUser={currentUser} equipmentList={equipmentList} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              equipmentList={equipmentList}
              allUsers={allUsers}
              bookings={bookings}
              logs={logs}
              currentUser={currentUser}
              onRefresh={refreshAllState}
              onSelectEquipmentForHub={handleOpenQRModal}
              onOpenBookingModal={handleOpenBookingModal}
            />
          )}
        </Suspense>
      </main>

      {/* Modals */}
      {isBookingModalOpen && (
        <Suspense fallback={null}>
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => {
              setIsBookingModalOpen(false);
              setBookingTimePresets({});
              setPreselectedProjectId(undefined);
            }}
            equipmentList={equipmentList}
            preselectedEquipmentId={preselectedEqId}
            preselectedProjectId={preselectedProjectId}
            preselectedDate={bookingTimePresets.date}
            preselectedStartTime={bookingTimePresets.startTime}
            preselectedEndTime={bookingTimePresets.endTime}
            currentUser={currentUser}
            bookings={bookings}
            onOpenQuickNotes={handleOpenQuickNotes}
            onBookSuccess={(newBooking) => {
              refreshAllState();
              showToast(
                `Đã duyệt lịch [${newBooking.startTime} - ${newBooking.endTime}]${newBooking.projectCode ? ` cho đề tài [${newBooking.projectCode}]` : ''} và tự động gửi email xác nhận tới ${currentUser.email}!`,
              );
            }}
          />
        </Suspense>
      )}
      {checkInOutModal.equipment && checkInOutModal.isOpen && (
        <Suspense fallback={null}>
          <CheckInOutModal
            isOpen={checkInOutModal.isOpen}
            onClose={() => setCheckInOutModal({ isOpen: false, mode: 'checkin', equipment: null })}
            mode={checkInOutModal.mode}
            equipment={checkInOutModal.equipment}
            currentUser={currentUser}
            activeBooking={checkInOutModal.activeBooking}
            activeLog={checkInOutModal.activeLog}
            onOpenQuickNotes={handleOpenQuickNotes}
            onSuccess={() => {
              refreshAllState();
              showToast(
                checkInOutModal.mode === 'checkin'
                  ? 'Check-in thành công. Thiết bị đã chuyển sang trạng thái đang hoạt động!'
                  : 'Check-out hoàn tất. Nhật ký bàn giao đã được lưu vào hệ thống!',
              );
            }}
          />
        </Suspense>
      )}

      {/* Email Inbox Gateway Modal */}
      {isEmailModalOpen && (
        <Suspense fallback={null}>
          <EmailInboxModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            currentUser={currentUser}
            allUsers={allUsers}
            equipmentList={equipmentList}
            bookings={bookings}
            emails={emails}
            onRefresh={refreshAllState}
            onNavigateToCheckIn={(booking) => {
              const eq = equipmentList.find((e) => e.id === booking.equipmentId);
              if (eq) {
                handleOpenCheckInModal(eq, booking);
              }
            }}
          />
        </Suspense>
      )}
      {/* Quick Notes Modal */}
      {quickNotesModal.isOpen && (
        <Suspense fallback={null}>
          <QuickNotesModal
            isOpen={quickNotesModal.isOpen}
            onClose={() => setQuickNotesModal({ isOpen: false, equipmentId: undefined })}
            currentUser={currentUser}
            equipmentList={equipmentList}
            selectedEquipmentId={quickNotesModal.equipmentId}
            onRefresh={refreshAllState}
          />
        </Suspense>
      )}
      {/* Equipment QR Code, SOP & Video Guide Modal */}
      {qrModal.isOpen && (
        <Suspense fallback={null}>
          <EquipmentQRModal
            isOpen={qrModal.isOpen}
            onClose={() => setQrModal({ isOpen: false, equipment: null })}
            equipment={qrModal.equipment}
            currentUser={currentUser}
            bookings={bookings}
            logs={logs}
            onOpenCheckIn={(eq) => handleOpenCheckInModal(eq)}
            onOpenBooking={(eqId) => handleOpenBookingModal(eqId)}
            onOpenQuickNotes={(eqId) => handleOpenQuickNotes(eqId)}
            onNavigateToForecast={() => {
              setQrModal({ isOpen: false, equipment: null });
              setActiveTab('analytics');
            }}
            onOpenGeminiChat={(eq) => handleOpenGeminiChat(eq)}
          />
        </Suspense>
      )}
      {/* Lab QR Scanner Modal */}
      {isScannerOpen && (
        <Suspense fallback={null}>
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            equipmentList={equipmentList}
            currentUser={currentUser}
            onSelectEquipmentForHub={(eq) => handleOpenQRModal(eq)}
            onQuickCheckIn={(eq) => handleOpenCheckInModal(eq)}
            onOpenSOP={(eq) => handleOpenQRModal(eq)}
            onOpenVideo={(eq) => handleOpenQRModal(eq)}
            onOpenQuickNotes={(eqId) => handleOpenQuickNotes(eqId)}
          />
        </Suspense>
      )}
      {/* Gemini AI Chatbot Modal with Google Search Data */}
      {chatMounted && (
        <Suspense fallback={null}>
          <GeminiChatModal
            isOpen={geminiChatModal.isOpen}
            onClose={() => setGeminiChatModal({ isOpen: false, equipmentContext: null })}
            currentUser={currentUser}
            equipmentList={equipmentList}
            bookings={bookings}
            initialEquipmentContext={geminiChatModal.equipmentContext}
          />
        </Suspense>
      )}
      {/* Floating Gemini Chatbot Trigger Button */}
      <GeminiFloatingButton isOpen={geminiChatModal.isOpen} onClick={() => handleOpenGeminiChat()} />

      <ChangePasswordModal
        isOpen={isChangePwOpen}
        onClose={() => setIsChangePwOpen(false)}
        onSuccess={() => showToast('Đã đổi mật khẩu thành công.')}
      />

      {/* Toast Notification */}
      {toastNode}

      {/* Safeguard Modal before Logout or Switch User */}
      <CheckoutWarningModal
        isOpen={checkoutWarningModal.isOpen}
        onClose={() => setCheckoutWarningModal({ isOpen: false, pendingAction: null })}
        activeSession={myActiveSessions[0] || null}
        actionTitle={checkoutWarningModal.pendingAction === 'logout' ? 'Đăng xuất khỏi hệ thống' : 'Chuyển đổi tài khoản'}
        onProceedLogout={() => {
          const action = checkoutWarningModal.pendingAction;
          setCheckoutWarningModal({ isOpen: false, pendingAction: null });
          if (action === 'logout') {
            handleLogout();
          }
        }}
        onOpenCheckOutNow={() => {
          const sess = myActiveSessions[0];
          setCheckoutWarningModal({ isOpen: false, pendingAction: null });
          if (sess && sess.equipment) {
            handleOpenCheckOutModal(sess.equipment, sess.log);
          }
        }}
      />

      {/* Clean Scientific Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <LabLogProLogo size={28} />
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <UmpHcmLogo size={22} variant="icon" />
                <span className="text-[11px] font-bold text-teal-800">ĐH Y Dược TP.HCM</span>
                <span className="text-slate-300">·</span>
                <UmpSchoolOfPharmacyLogo size={22} variant="icon" />
                <span className="text-[11px] font-bold text-emerald-800">Trường Dược</span>
                <span className="text-slate-300">·</span>
                <BaocheDeptLogo size={22} variant="icon" />
                <span className="text-[11px] font-bold text-amber-800">Bộ Môn Bào Chế</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center md:justify-end">
              <span>
                Đang đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.title})
              </span>
              <span>·</span>
              <button
                onClick={() => handleOpenGeminiChat()}
                className="text-indigo-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trợ lý AI</span>
              </button>
              <span>·</span>
              <button
                onClick={handleOpenQRScanner}
                className="text-blue-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Quét QR Máy</span>
              </button>
              <span>·</span>
              <button
                onClick={() => handleOpenQuickNotes()}
                className="text-amber-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Quick Notes</span>
              </button>
              <span>·</span>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Hộp thư ({unreadEmailCount})</span>
              </button>
              <span>·</span>
              <button onClick={initiateLogout} className="text-rose-600 hover:underline font-semibold cursor-pointer">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
