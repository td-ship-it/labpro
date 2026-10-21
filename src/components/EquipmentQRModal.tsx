import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Equipment, 
  User, 
  Booking, 
  UsageLog,
  EquipmentQuickNote
} from '../types';
import { LabStorage, localDateStr } from '../services/storage';
import { 
  X, 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  FileText, 
  Video, 
  StickyNote, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  Sliders,
  Sparkles,
  Info,
  Wrench
} from 'lucide-react';
import { calculateEquipmentMaintenanceForecast } from '../services/maintenanceForecaster';

interface EquipmentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  currentUser: User;
  bookings: Booking[];
  logs: UsageLog[];
  onOpenCheckIn?: (eq: Equipment) => void;
  onOpenBooking?: (equipmentId: string) => void;
  onOpenQuickNotes?: (equipmentId: string) => void;
  onNavigateToForecast?: () => void;
  onOpenGeminiChat?: (eq: Equipment) => void;
}

type TabType = 'hub' | 'sop' | 'video' | 'notes' | 'maintenance' | 'label';

export const EquipmentQRModal: React.FC<EquipmentQRModalProps> = ({
  isOpen,
  onClose,
  equipment,
  currentUser,
  bookings,
  logs,
  onOpenCheckIn,
  onOpenBooking,
  onOpenQuickNotes,
  onNavigateToForecast,
  onOpenGeminiChat,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('hub');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDirectUrl, setQrDirectUrl] = useState<string>('');

  // Video player simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0); // 0 to 100
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const videoIntervalRef = useRef<number | null>(null);

  // Generate QR Code on equipment change
  useEffect(() => {
    if (!equipment) return;

    // Create a robust URL query string for real phone camera scanning
    const origin = window.location.origin || 'http://localhost:3000';
    const directUrl = `${origin}?qr_equipment=${equipment.id}#equipment-${equipment.code}`;
    setQrDirectUrl(directUrl);

    // Generate high-resolution QR data URL
    QRCode.toDataURL(directUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });
  }, [equipment]);

  // Video simulation playback ticker
  useEffect(() => {
    if (isPlaying) {
      videoIntervalRef.current = window.setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1.2;
        });
      }, 500);
    } else if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
    }

    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [isPlaying]);

  if (!isOpen || !equipment) return null;

  // Find active booking or check-in state
  const activeLog = logs.find((l) => l.equipmentId === equipment.id && !l.checkOutTime);
  const todayStr = localDateStr();
  const userTodayBooking = bookings.find(
    (b) => b.equipmentId === equipment.id && b.userId === currentUser.id && b.date === todayStr && (b.status === 'confirmed' || b.status === 'active')
  );
  const quickNotes = LabStorage.getQuickNotesForEquipment(equipment.id);
  const isMaintenance = equipment.status === 'maintenance';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrDirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${equipment.code}_${equipment.model.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrintLabel = () => {
    document.body.classList.add('printing-qr-single');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-qr-single');
    }, 1000);
  };

  const jumpToChapter = (chapterIdx: number, secondsPct: number) => {
    setActiveChapterIndex(chapterIdx);
    setVideoProgress(secondsPct);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {equipment.code}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  equipment.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : equipment.status === 'in_use'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {equipment.status === 'available' ? '● Sẵn sàng' : equipment.status === 'in_use' ? '● Đang đo' : '● Bảo trì'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-1">
                {equipment.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintLabel}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
              title="In tem nhãn dán máy"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">In Tem Nhãn</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white shrink-0 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'hub'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mã QR & Check-in Nhanh</span>
          </button>

          <button
            onClick={() => setActiveTab('sop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'sop'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quy Trình Chuẩn (SOP)</span>
            {equipment.sopSteps && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'sop' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {equipment.sopSteps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Thực Hành</span>
            {equipment.videoTutorial && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'video' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {equipment.videoTutorial.duration}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Quick Notes ({quickNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Dự Báo Bảo Trì & Sức Khỏe</span>
          </button>

          <button
            onClick={() => setActiveTab('label')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'label'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Xem Mẫu Nhãn In</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* TAB 1: HUB & QUICK ACTIONS */}
          {activeTab === 'hub' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: QR Visual Card */}
              <div className="md:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center text-center">
                <div className="relative p-3 bg-white border-2 border-slate-200 rounded-xl shadow-xs group">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt={`QR Code ${equipment.code}`} 
                      className="w-48 h-48 object-contain rounded-md"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                      Đang tạo mã QR...
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                </div>

                <div className="mt-3">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {equipment.code}
                  </span>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
                    Quét bằng Camera điện thoại hoặc máy tính bảng để mở trực tiếp cổng hướng dẫn & check-in tại phòng thí nghiệm.
                  </p>
                </div>

                {/* QR Actions */}
                <div className="grid grid-cols-2 gap-2 w-full mt-4">
                  <button
                    onClick={handleDownloadQR}
                    className="py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải ảnh PNG</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Đã chép link' : 'Chép liên kết'}</span>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full text-left text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <strong className="text-slate-700">{equipment.model}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hãng:</span>
                    <strong className="text-slate-700">{equipment.manufacturer}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Vị trí:</span>
                    <strong className="text-slate-700">{equipment.room} ({equipment.building})</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Instant Scanner Actions Hub */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Instant Check-In Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tracking-wide uppercase">
                        <Sparkles className="w-3 h-3" /> Quét Thẻ Thiết Bị Tại Chỗ
                      </span>
                      <h3 className="text-base font-bold mt-1.5 text-white">
                        Bắt đầu ca đo hoặc Bàn giao máy
                      </h3>
                      <p className="text-xs text-blue-100 mt-1 max-w-md">
                        {activeLog 
                          ? `Máy đang được sử dụng bởi ca đo hiện tại. Bạn có thể xem tiến trình hoặc trả máy nếu là người vận hành.`
                          : `Đứng trực tiếp trước máy? Bấm nút bên dưới để tiến hành kiểm tra tình trạng ban đầu và Check-in nhận máy ngay lập tức.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {onOpenCheckIn && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCheckIn(equipment);
                        }}
                        disabled={isMaintenance}
                        className="py-2.5 px-4 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>
                          {activeLog ? 'Xem Nhật Ký / Trả Máy' : 'Check-in Nhận Máy Ngay'}
                        </span>
                      </button>
                    )}

                    {onOpenBooking && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenBooking(equipment.id);
                        }}
                        disabled={isMaintenance}
                        className="py-2.5 px-3.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Đặt Lịch Ca Sau</span>
                      </button>
                    )}

                    {onOpenGeminiChat && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenGeminiChat(equipment);
                        }}
                        className="py-2.5 px-3.5 text-xs font-semibold text-cyan-200 bg-indigo-900/40 hover:bg-indigo-900/60 border border-cyan-400/30 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Hỏi trợ lý Gemini và Google Search về thiết bị này"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
                        <span>Hỏi AI Gemini & Search</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Pre-operation safety checklist */}
                {equipment.quickChecklist && equipment.quickChecklist.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2 text-slate-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Checklist An Toàn Tiền Vận Hành
                      </h4>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {equipment.quickChecklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Shortcuts to SOP, Video, Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div 
                    onClick={() => setActiveTab('sop')}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-xs text-slate-900">Quy Trình SOP</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {equipment.sopSteps ? `${equipment.sopSteps.length} bước tiêu chuẩn` : 'Hướng dẫn đo'}
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('video')}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 cursor-pointer transition-all shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-xs text-slate-900">Video Thực Hành</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {equipment.videoTutorial ? `${equipment.videoTutorial.duration} clip mẫu` : 'Xem video'}
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('notes')}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer transition-all shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                      <StickyNote className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-xs text-slate-900">Quick Notes</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {quickNotes.length} cấu hình chia sẻ
                    </p>
                  </div>
                </div>

                {/* Emergency Contact & Responsible Staff */}
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="text-slate-500">Cán bộ phụ trách:</span>{' '}
                      <strong className="text-slate-800">{equipment.responsibleStaff}</strong>
                    </div>
                  </div>
                  {equipment.emergencyContact && (
                    <div className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{equipment.emergencyContact}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: STANDARD OPERATING PROCEDURE (SOP) */}
          {activeTab === 'sop' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {equipment.sopDocCode || `SOP-${equipment.code}`}
                      </span>
                      <span className="text-xs text-slate-500">Phiên bản ban hành: 2026.1</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {equipment.sopTitle || `Quy Trình Vận Hành Chuẩn: ${equipment.name}`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In Tài Liệu SOP</span>
                    </button>
                  </div>
                </div>

                {/* Safety Guidelines banner */}
                <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Quy định an toàn bắt buộc:</strong>
                    <p className="mt-0.5 text-amber-800">{equipment.safetyGuidelines}</p>
                  </div>
                </div>

                {/* Steps List */}
                <div className="mt-6 space-y-4">
                  {equipment.sopSteps && equipment.sopSteps.length > 0 ? (
                    equipment.sopSteps.map((step) => (
                      <div 
                        key={step.step}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-colors shadow-2xs relative pl-12"
                      >
                        {/* Step number badge */}
                        <div className="absolute left-3.5 top-4 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                          {step.step}
                        </div>

                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">
                            {step.title}
                          </h4>
                          {step.durationEstimate && (
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {step.durationEstimate}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          {step.description}
                        </p>

                        {step.warning && (
                          <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-start gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{step.warning}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Chưa có quy trình SOP văn bản chi tiết cho thiết bị này. Vui lòng liên hệ cán bộ phụ trách: {equipment.responsibleStaff}.
                    </div>
                  )}
                </div>

                {/* Manual doc download notice */}
                {equipment.manualDocName && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Tài liệu kỹ thuật nhà sản xuất: <strong>{equipment.manualDocName}</strong></span>
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline">
                      Xem file PDF hướng dẫn
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO TUTORIAL */}
          {activeTab === 'video' && (
            <div className="space-y-5">
              {equipment.videoTutorial ? (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {equipment.videoTutorial.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {equipment.videoTutorial.description} • Giảng viên/KTV: <strong>{equipment.videoTutorial.instructorName || equipment.responsibleStaff}</strong>
                    </p>
                  </div>

                  {/* Simulated Interactive Video Player */}
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video max-h-84 flex flex-col justify-between text-white shadow-lg">
                    {/* Top overlay */}
                    <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-xs z-10">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[10px]">
                          HD 1080p
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {equipment.videoTutorial.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">
                        {equipment.videoTutorial.duration}
                      </span>
                    </div>

                    {/* Center Action Overlay */}
                    <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all"
                      >
                        {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                      </button>
                      <div className="mt-3 text-xs text-slate-300 font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                        {isPlaying ? 'Đang phát video mô phỏng thao tác...' : 'Nhấp để xem video hướng dẫn'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Chương hiện tại: <strong>{equipment.videoTutorial.keyTimestamps[activeChapterIndex]?.label || 'Tổng quan'}</strong>
                      </div>
                    </div>

                    {/* Bottom Controls Bar */}
                    <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 space-y-2">
                      {/* Scrubber track */}
                      <div 
                        className="w-full bg-slate-700 h-1.5 rounded-full cursor-pointer relative overflow-hidden"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = ((e.clientX - rect.left) / rect.width) * 100;
                          setVideoProgress(Math.max(0, Math.min(100, pct)));
                        }}
                      >
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsPlaying(!isPlaying)} 
                            className="hover:text-white transition-colors"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setVideoProgress(0)} 
                            className="hover:text-white transition-colors"
                            title="Xem lại từ đầu"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[11px] text-slate-400">
                            {Math.floor(videoProgress)}% / {equipment.videoTutorial.duration}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {equipment.name} • SOP Clip
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Timeline Chapters */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Các Mốc Thời Gian Thao Tác Trọng Tâm (Timeline Chapters)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {equipment.videoTutorial.keyTimestamps.map((ch, idx) => (
                        <div
                          key={idx}
                          onClick={() => jumpToChapter(idx, (idx / equipment.videoTutorial!.keyTimestamps.length) * 100)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            activeChapterIndex === idx
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-medium'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-blue-700 shrink-0">
                            {ch.time}
                          </span>
                          <span className="line-clamp-2 leading-tight">
                            {ch.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructor Note */}
                  {equipment.videoTutorial.notes && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Ghi chú từ giảng viên:</strong> {equipment.videoTutorial.notes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                  Hiện tại chưa có video clip thực hành cho thiết bị này. Vui lòng tham khảo tài liệu SOP hoặc liên hệ kỹ thuật viên: {equipment.responsibleStaff}.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUICK NOTES FOR THIS EQUIPMENT */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sổ Ghi Chú Cấu Hình & Kinh Nghiệm ({quickNotes.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các thiết lập thông số đo, mẹo xử lý mẫu và lưu ý từ đồng nghiệp cho {equipment.name}.
                  </p>
                </div>
                {onOpenQuickNotes && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenQuickNotes(equipment.id);
                    }}
                    className="py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>Mở Sổ Ghi Chú & Thêm Mới</span>
                  </button>
                )}
              </div>

              {quickNotes.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                  Chưa có Quick Note nào cho thiết bị này. Hãy là người đầu tiên chia sẻ cấu hình đo!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickNotes.map((note) => (
                    <div 
                      key={note.id}
                      className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-200 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                            note.category === 'config'
                              ? 'bg-blue-100 text-blue-800'
                              : note.category === 'tip'
                              ? 'bg-emerald-100 text-emerald-800'
                              : note.category === 'warning'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {note.category === 'config' ? 'Cấu hình tham số' : note.category === 'tip' ? 'Mẹo đo' : note.category === 'warning' ? 'Cảnh báo' : 'Giao thức'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                            {note.title}
                          </h4>
                        </div>
                        {note.isPinned && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            📌 Ghim
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {note.content}
                      </p>

                      {note.parameters && note.parameters.length > 0 && (
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 space-y-0.5">
                          {note.parameters.slice(0, 3).map((p, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-slate-500">{p.key}:</span>
                              <strong className="text-slate-900">{p.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Bởi <strong>{note.authorName}</strong></span>
                        <span>{new Date(note.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PREDICTIVE MAINTENANCE & MACHINE HEALTH */}
          {activeTab === 'maintenance' && (() => {
            const maintRecords = LabStorage.getMaintenanceRecords();
            const forecast = calculateEquipmentMaintenanceForecast(equipment, logs, bookings, maintRecords);
            const eqRecords = LabStorage.getMaintenanceRecordsForEquipment(equipment.id);

            return (
              <div className="space-y-4">
                {/* Health & Urgency Banner */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${
                  forecast.urgency === 'overdue'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : forecast.urgency === 'urgent'
                    ? 'bg-orange-50 border-orange-200 text-orange-950'
                    : forecast.urgency === 'attention'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-indigo-700" />
                        <h3 className="text-base font-bold text-slate-900">
                          Chỉ Số Sức Khỏe & Dự Báo Kiểm Định Thực Tế
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600">
                        {forecast.urgencyLabel} · Tính toán tự động từ {forecast.totalLogsCount} ca bàn giao nhật ký
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-slate-900">
                        {forecast.healthPercentage}%
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Tuổi Thọ Còn Lại
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Đã chạy: <strong>{forecast.hoursSinceLastMaintenance}h</strong> / định mức <strong>{forecast.maxOperatingHoursThreshold}h</strong></span>
                      <span>Còn <strong>{forecast.remainingUsefulHours}h</strong> ({forecast.remainingDaysEstimated} ngày)</span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          forecast.urgency === 'overdue' ? 'bg-rose-600' : forecast.healthPercentage <= 20 ? 'bg-orange-600' : forecast.healthPercentage <= 50 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, Math.round((forecast.effectiveWearHours / forecast.maxOperatingHoursThreshold) * 100)))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Ngày dự báo thực tế:
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-900">
                      {forecast.predictedMaintenanceDate}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tốc độ hao mòn: {forecast.effectiveBurnRateHours}h/ngày
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Hạn định kỳ theo lịch:
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-700">
                      {forecast.calendarDueDate}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chu kỳ {forecast.calendarIntervalDays} ngày
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 font-medium">Hệ số ứng suất máy (α):</span>
                    <div className="font-mono font-bold text-sm text-indigo-700">
                      {forecast.stressMultiplier}x
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {forecast.incidentsCount} sự cố · {forecast.abnormalConditionCount} lần hao mòn
                    </p>
                  </div>
                </div>

                {/* Technical Recommendation & Checklist */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-indigo-600" />
                      Khuyến Nghị Bảo Trì & Quy Trình Kiểm Tra:
                    </h4>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      {forecast.actionRecommendation}
                    </p>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block text-[11px]">Checklist kiểm tra kỹ thuật đề xuất:</span>
                    {forecast.suggestedChecklist.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-600 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance History Records */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Lịch Sử Bảo Trì & Hiệu Chuẩn Đã Nghiệm Thu ({eqRecords.length} lần):
                  </h4>

                  {eqRecords.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">Chưa ghi nhận lịch sử bảo trì.</p>
                  ) : (
                    <div className="space-y-2">
                      {eqRecords.map((rec) => (
                        <div key={rec.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between font-medium">
                            <span className="font-bold text-slate-800">{rec.certificateNumber || 'Bảo dưỡng định kỳ'}</span>
                            <span className="font-mono text-slate-500 text-[11px]">{rec.performedDate}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{rec.notes}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>Kỹ sư: <strong>{rec.technicianName}</strong> ({rec.agencyOrVendor || 'Nội bộ'})</span>
                            {rec.costVND && <span>Chi phí: {rec.costVND.toLocaleString('vi-VN')} đ</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 5: PRINTABLE ASSET LABEL PREVIEW */}
          {activeTab === 'label' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Mẫu Tem Dán Tài Sản Thiết Bị Phòng Thí Nghiệm
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mẫu chuẩn in kích thước 80mm x 50mm hoặc decal A4 dán trực tiếp lên thân máy tại phòng lab.
                  </p>
                </div>
                <button
                  onClick={handlePrintLabel}
                  className="py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Tem Ngay</span>
                </button>
              </div>

              {/* Printable Asset Tag Sticker Preview Container */}
              <div className="flex justify-center p-4 sm:p-8 bg-slate-200/60 rounded-xl">
                <div 
                  id="printable-single-qr-tag"
                  className="w-full max-w-md bg-white border-2 border-slate-800 rounded-xl p-5 shadow-lg text-slate-900 font-sans"
                >
                  {/* Tag Header */}
                  <div className="border-b-2 border-slate-800 pb-2.5 text-center">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                      TRUNG TÂM PHÂN TÍCH & PHÒNG THÍ NGHIỆM TRỌNG ĐIỂM
                    </div>
                    <div className="text-sm font-black uppercase text-slate-900 tracking-tight mt-0.5">
                      TEM TÀI SẢN & QUÉT CHECK-IN THIẾT BỊ
                    </div>
                  </div>

                  {/* Body: QR Code + Details */}
                  <div className="py-3 flex items-center gap-4">
                    <div className="shrink-0 p-1.5 border-2 border-slate-800 rounded-lg bg-white">
                      {qrDataUrl && (
                        <img 
                          src={qrDataUrl} 
                          alt="QR Code" 
                          className="w-28 h-28 object-contain"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Mã số tài sản:</span>
                        <span className="font-mono font-black text-sm text-blue-700">{equipment.code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Tên thiết bị:</span>
                        <span className="font-bold text-slate-900 line-clamp-2 text-xs leading-tight">{equipment.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Model / Hãng:</span>
                        <span className="text-slate-700 font-medium">{equipment.model} ({equipment.manufacturer})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Phòng đặt máy:</span>
                        <span className="text-slate-800 font-bold">{equipment.room} - {equipment.building}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tag Footer instructions */}
                  <div className="border-t-2 border-slate-800 pt-2 text-[10px] text-slate-600 flex items-center justify-between">
                    <div>
                      <span>Phụ trách: <strong>{equipment.responsibleStaff}</strong></span>
                      {equipment.emergencyContact && <span className="block">Hotline: <strong>{equipment.emergencyContact}</strong></span>}
                    </div>
                    <div className="text-right font-medium text-slate-800 max-w-[150px]">
                      Quét mã QR để Check-in, xem SOP, Video & Ghi chú
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Mã QR thiết bị được tạo tự động chuẩn hóa ISO 17025.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
