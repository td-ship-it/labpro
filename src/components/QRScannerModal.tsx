import React, { useState, useEffect, useRef } from 'react';
import { Equipment, User } from '../types';
import { 
  X, 
  Camera, 
  QrCode, 
  CheckCircle2, 
  FileText, 
  Video, 
  StickyNote, 
  Sparkles, 
  Search, 
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentList: Equipment[];
  currentUser: User;
  onSelectEquipmentForHub: (equipment: Equipment) => void;
  onQuickCheckIn: (equipment: Equipment) => void;
  onOpenSOP: (equipment: Equipment) => void;
  onOpenVideo: (equipment: Equipment) => void;
  onOpenQuickNotes: (equipmentId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  equipmentList,
  currentUser,
  onSelectEquipmentForHub,
  onQuickCheckIn,
  onOpenSOP,
  onOpenVideo,
  onOpenQuickNotes,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedEquipment, setScannedEquipment] = useState<Equipment | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sound feedback synthesizer on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not supported or blocked
    }
  };

  // Start real camera if requested
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera error or blocked:', err);
      setCameraError('Không thể mở Camera thực tế (vui lòng cấp quyền hoặc sử dụng bộ chọn máy mô phỏng bên dưới).');
      setCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedEquipment(null);
      setFilterQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateScan = (eq: Equipment) => {
    playBeep();
    setScannedEquipment(eq);
  };

  const filteredEquipment = equipmentList.filter((eq) =>
    eq.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    eq.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
    eq.room.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quét Mã QR Thiết Bị Phòng Lab
              </h2>
              <p className="text-xs text-slate-500">
                Nhận diện máy tức thì để Check-in, xem SOP chuẩn, Video thực hành và Quick Notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          
          {/* Scanner Viewport / Simulation Box */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden shadow-lg border border-slate-800 flex flex-col items-center justify-center min-h-[220px]">
            {cameraActive ? (
              <div className="relative w-full h-56 rounded-xl overflow-hidden flex items-center justify-center bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                {/* Laser scan animation line */}
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                <div className="absolute inset-12 border-2 border-dashed border-white/60 rounded-xl pointer-events-none" />
              </div>
            ) : (
              <div className="relative w-full py-8 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-white">
                  Khung Quét Mã QR Thông Minh
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Hướng camera vào tem mã QR dán trên thân máy thí nghiệm hoặc chọn nhanh thiết bị bên dưới để mô phỏng quét thành công.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={startCamera}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Bật Camera Thực Tế</span>
                  </button>
                  {equipmentList[0] && (
                    <button
                      onClick={() => handleSimulateScan(equipmentList[0])}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thử Quét [{equipmentList[0].code}]</span>
                    </button>
                  )}
                </div>

                {cameraError && (
                  <p className="text-[11px] text-amber-300 mt-3 max-w-md bg-amber-950/60 p-2 rounded-lg border border-amber-800">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Scanned Result Banner (When an equipment is scanned) */}
          {scannedEquipment && (
            <div className="bg-white rounded-xl border-2 border-emerald-500 p-5 shadow-md animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {scannedEquipment.code}
                      </span>
                      <span className="text-xs text-emerald-700 font-semibold">
                        Quét thành công!
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {scannedEquipment.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vị trí: <strong>{scannedEquipment.room} ({scannedEquipment.building})</strong> • Model: {scannedEquipment.model}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setScannedEquipment(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Đổi máy khác
                </button>
              </div>

              {/* Instant Action buttons for scanned machine */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onSelectEquipmentForHub(scannedEquipment);
                  }}
                  className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mở Toàn Bộ Hub</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onQuickCheckIn(scannedEquipment);
                  }}
                  className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Check-in Nhận Máy</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenSOP(scannedEquipment);
                  }}
                  className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xem SOP Chuẩn</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenVideo(scannedEquipment);
                  }}
                  className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  <span>Xem Video Demo</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Select & Simulator Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Hoặc Chọn Nhanh Thiết Bị Để Quét Mã
              </h4>
              <span className="text-xs text-slate-500">
                {filteredEquipment.length} thiết bị trong phòng lab
              </span>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tên máy, mã số LAB-... hoặc số phòng..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredEquipment.map((eq) => (
                <div
                  key={eq.id}
                  onClick={() => handleSimulateScan(eq)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                    scannedEquipment?.id === eq.id
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {eq.code}
                      </span>
                      <span className={`text-[10px] ${
                        eq.status === 'available' ? 'text-emerald-600' : eq.status === 'in_use' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {eq.status === 'available' ? '● Sẵn sàng' : eq.status === 'in_use' ? '● Đang đo' : '● Bảo trì'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate mt-1">
                      {eq.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {eq.room} • {eq.responsibleStaff}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 shrink-0"
                    title="Quét thiết bị này"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end text-xs text-slate-500 shrink-0">
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
