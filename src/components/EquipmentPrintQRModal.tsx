import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { Equipment } from '../types';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Sliders, 
  Layers, 
  Eye, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Info, 
  Scissors, 
  MapPin, 
  User, 
  Phone, 
  Calendar, 
  Search,
  Filter
} from 'lucide-react';
import { 
  UmpHcmLogo, 
  UmpSchoolOfPharmacyLogo, 
  BaocheDeptLogo, 
  VilasLogo, 
  Iso17025Badge, 
  LabLogProLogo 
} from './LabLogos';

interface EquipmentPrintQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  allEquipment: Equipment[];
  initialMode?: 'single' | 'batch';
}

type LabelSize = 'standard' | 'compact' | 'detailed';
type LabelColor = 'blue' | 'mono' | 'emerald';

export const EquipmentPrintQRModal: React.FC<EquipmentPrintQRModalProps> = ({
  isOpen,
  onClose,
  equipment: initialEquipment,
  allEquipment,
  initialMode = 'single',
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>(
    initialEquipment ? initialMode : 'batch'
  );
  const [selectedEqId, setSelectedEqId] = useState<string>(
    initialEquipment ? initialEquipment.id : allEquipment[0]?.id || ''
  );

  // Label Customization State
  const [labelSize, setLabelSize] = useState<LabelSize>('standard');
  const [labelColor, setLabelColor] = useState<LabelColor>('blue');
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showStaff, setShowStaff] = useState<boolean>(true);
  const [showDueDate, setShowDueDate] = useState<boolean>(true);
  const [showCutGuide, setShowCutGuide] = useState<boolean>(true);

  // Single QR state
  const [singleQrDataUrl, setSingleQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

  // Batch Selection State
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>(
    allEquipment.map((e) => e.id)
  );
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  const [batchCategoryFilter, setBatchCategoryFilter] = useState<string>('all');
  const [batchQrMap, setBatchQrMap] = useState<Record<string, string>>({});

  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update selected equipment when prop changes
  useEffect(() => {
    if (initialEquipment) {
      setSelectedEqId(initialEquipment.id);
      setMode('single');
    }
  }, [initialEquipment]);

  const currentEquipment = useMemo(() => {
    return allEquipment.find((e) => e.id === selectedEqId) || initialEquipment || allEquipment[0];
  }, [allEquipment, selectedEqId, initialEquipment]);

  // Generate single QR code
  useEffect(() => {
    if (!currentEquipment) return;
    const origin = window.location.origin || 'http://localhost:3000';
    const directUrl = `${origin}?qr_equipment=${currentEquipment.id}#equipment-${currentEquipment.code}`;

    QRCode.toDataURL(directUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: labelColor === 'blue' ? '#1e3a8a' : labelColor === 'emerald' ? '#065f46' : '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setSingleQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Lỗi tạo mã QR:', err);
      });
  }, [currentEquipment, labelColor]);

  // Generate batch QR codes for selected equipment
  useEffect(() => {
    if (mode !== 'batch') return;
    const origin = window.location.origin || 'http://localhost:3000';
    const newMap: Record<string, string> = {};
    let isCancelled = false;

    Promise.all(
      allEquipment.map(async (eq) => {
        const directUrl = `${origin}?qr_equipment=${eq.id}#equipment-${eq.code}`;
        const url = await QRCode.toDataURL(directUrl, {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        return { id: eq.id, url };
      })
    ).then((results) => {
      if (!isCancelled) {
        results.forEach((r) => {
          newMap[r.id] = r.url;
        });
        setBatchQrMap(newMap);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [mode, allEquipment]);

  if (!isOpen) return null;

  const currentDirectUrl = currentEquipment
    ? `${window.location.origin || 'http://localhost:3000'}?qr_equipment=${currentEquipment.id}#equipment-${currentEquipment.code}`
    : '';

  const handleCopyLink = () => {
    if (!currentDirectUrl) return;
    navigator.clipboard.writeText(currentDirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadRawQR = () => {
    if (!singleQrDataUrl || !currentEquipment) return;
    const link = document.createElement('a');
    link.download = `QR_Code_${currentEquipment.code}.png`;
    link.href = singleQrDataUrl;
    link.click();
  };

  // High-Res Sticker PNG Export via Canvas
  const handleDownloadStickerPNG = async () => {
    if (!currentEquipment || !singleQrDataUrl) return;
    setIsExportingPng(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // High-DPI canvas dimensions (approx 1200 x 750 px for 80x50mm at 300 DPI)
      const width = labelSize === 'compact' ? 900 : labelSize === 'detailed' ? 1400 : 1200;
      const height = labelSize === 'compact' ? 550 : labelSize === 'detailed' ? 900 : 750;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Outer border
      const primaryColor = labelColor === 'blue' ? '#1d4ed8' : labelColor === 'emerald' ? '#047857' : '#0f172a';
      const secondaryBg = labelColor === 'blue' ? '#eff6ff' : labelColor === 'emerald' ? '#ecfdf5' : '#f8fafc';

      ctx.lineWidth = 6;
      ctx.strokeStyle = primaryColor;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Header Banner
      const headerHeight = labelSize === 'compact' ? 70 : 90;
      ctx.fillStyle = primaryColor;
      ctx.fillRect(10, 10, width - 20, headerHeight);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('TRUNG TÂM PHÂN TÍCH & PHÒNG THÍ NGHIỆM TRỌNG ĐIỂM', width / 2, 42);

      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText('TEM TÀI SẢN & QUÉT CHECK-IN THIẾT BỊ', width / 2, 80);

      // Load and draw QR code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = singleQrDataUrl;
      });

      const qrSize = labelSize === 'compact' ? 360 : 440;
      const qrX = 35;
      const qrY = headerHeight + 35;

      // QR container box
      ctx.fillStyle = secondaryBg;
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Content on the right
      const textX = qrX + qrSize + 40;
      let textY = headerHeight + 60;
      ctx.textAlign = 'left';

      // Equipment Code Badge
      ctx.font = 'bold 44px JetBrains Mono, monospace';
      ctx.fillStyle = primaryColor;
      ctx.fillText(currentEquipment.code, textX, textY);

      textY += 48;
      // Equipment Name
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      // Word wrap for long name
      const words = currentEquipment.name.split(' ');
      let line = '';
      const maxWidth = width - textX - 40;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, textX, textY);
          line = words[i] + ' ';
          textY += 40;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, textX, textY);

      textY += 50;
      // Model & Manufacturer
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Model: ${currentEquipment.model}  ·  Hãng: ${currentEquipment.manufacturer}`, textX, textY);

      if (showLocation) {
        textY += 42;
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`Vị trí: ${currentEquipment.room} (${currentEquipment.building})`, textX, textY);
      }

      if (showStaff) {
        textY += 42;
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Phụ trách: ${currentEquipment.responsibleStaff}${currentEquipment.emergencyContact ? `  |  Hotline: ${currentEquipment.emergencyContact}` : ''}`, textX, textY);
      }

      if (showDueDate && labelSize !== 'compact') {
        textY += 42;
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillStyle = '#0284c7';
        ctx.fillText(`Lịch kiểm định / bảo trì: ${currentEquipment.maintenanceSchedule || 'Định kỳ hàng quý'}`, textX, textY);
      }

      // Footer divider
      const footerY = height - 55;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(20, footerY);
      ctx.lineTo(width - 20, footerY);
      ctx.stroke();

      // Footer text
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.fillText('Hệ thống Quản lý Thiết bị Lab ISO 17025', 30, footerY + 34);

      ctx.textAlign = 'right';
      ctx.fillText('Quét QR bằng điện thoại để xem SOP, Video & Check-in', width - 30, footerY + 34);

      // Trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Tem_Decal_${currentEquipment.code}_${labelSize}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    } catch (err) {
      console.error('Lỗi tải ảnh tem decal:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  // Direct Browser Print Triggers
  const handlePrintSingle = () => {
    document.body.classList.add('printing-qr-single');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-qr-single');
    }, 1000);
  };

  const handlePrintBatch = () => {
    document.body.classList.add('printing-qr-batch');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-qr-batch');
    }, 1000);
  };

  // Filtered equipment for batch selection
  const filteredBatchEquipment = allEquipment.filter((eq) => {
    const matchesCat = batchCategoryFilter === 'all' || eq.category === batchCategoryFilter;
    const query = batchSearchTerm.toLowerCase().trim();
    const matchesQuery =
      !query ||
      eq.name.toLowerCase().includes(query) ||
      eq.code.toLowerCase().includes(query) ||
      eq.room.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  const allCategories = Array.from(new Set(allEquipment.map((e) => e.category)));

  const handleToggleSelectAllBatch = () => {
    const visibleIds = filteredBatchEquipment.map((e) => e.id);
    const allSelected = visibleIds.every((id) => batchSelectedIds.includes(id));
    if (allSelected) {
      setBatchSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setBatchSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const selectedBatchItems = allEquipment.filter((e) => batchSelectedIds.includes(e.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Tạo & In Mã QR Tem Dán Thiết Bị Thực Tế</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Chuẩn ISO 17025
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết kế tem nhãn Decal bóc dán lên máy, quét camera điện thoại để mở nhanh hướng dẫn SOP & Check-in ca đo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'single'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Tem Đơn (1 Thiết Bị)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'batch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>In Hàng Loạt Tem (Trang Decal A4)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                mode === 'batch' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 font-bold'
              }`}>
                {batchSelectedIds.length} máy
              </span>
            </button>
          </div>

          {mode === 'single' && currentEquipment && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500">Đang chọn:</span>
              <select
                value={selectedEqId}
                onChange={(e) => setSelectedEqId(e.target.value)}
                className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                {allEquipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/60">
          
          {/* MODE 1: SINGLE EQUIPMENT PRINT */}
          {mode === 'single' && currentEquipment && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Customization Controls */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Device Selector on mobile */}
                <div className="block sm:hidden bg-white p-3.5 rounded-xl border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Thiết bị cần tạo tem:
                  </label>
                  <select
                    value={selectedEqId}
                    onChange={(e) => setSelectedEqId(e.target.value)}
                    className="w-full text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {allEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        [{eq.code}] {eq.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Presets */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kích Thước Tem Dán</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {labelSize === 'standard' ? '80 x 50 mm' : labelSize === 'compact' ? '50 x 30 mm' : '100 x 65 mm'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelSize('standard')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        labelSize === 'standard'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Chuẩn Lab</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">80 x 50 mm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLabelSize('compact')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        labelSize === 'compact'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Nhỏ gọn</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">50 x 30 mm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLabelSize('detailed')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        labelSize === 'detailed'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Mở rộng</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">100 x 65 mm</span>
                    </button>
                  </div>
                </div>

                {/* Color Theme */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Tông Màu Nhận Diện
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelColor('blue')}
                      className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                        labelColor === 'blue'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-xs">Xanh ISO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLabelColor('mono')}
                      className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                        labelColor === 'mono'
                          ? 'border-slate-800 bg-slate-100 text-slate-900 ring-1 ring-slate-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-slate-900 shrink-0" />
                      <span className="text-xs">In Nhiệt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLabelColor('emerald')}
                      className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                        labelColor === 'emerald'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-600 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                      <span className="text-xs">An Toàn</span>
                    </button>
                  </div>
                </div>

                {/* Content Toggles */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Thông Tin Hiển Thị Trên Tem
                  </span>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={showLocation}
                        onChange={(e) => setShowLocation(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Vị trí phòng máy & Tòa nhà ({currentEquipment.room})</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={showStaff}
                        onChange={(e) => setShowStaff(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Cán bộ phụ trách máy ({currentEquipment.responsibleStaff})</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={showDueDate}
                        onChange={(e) => setShowDueDate(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Hạn kiểm định / hiệu chuẩn kế tiếp</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={showCutGuide}
                        onChange={(e) => setShowCutGuide(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Viền nét đứt hướng dẫn cắt kéo (Cut Guide)</span>
                    </label>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePrintSingle}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Tem Dán Này (Print Sticker)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadStickerPNG}
                      disabled={isExportingPng}
                      className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Xuất file ảnh tem hoàn chỉnh độ phân giải 300 DPI để chèn văn bản hoặc gửi xưởng in"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isExportingPng ? 'Đang tạo ảnh...' : 'Tải Tem (PNG)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadRawQR}
                      className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Tải ảnh mã QR riêng lẻ"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tải QR Gốc</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-1.5 px-3 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Đã sao chép link quét mã QR!' : 'Sao chép đường dẫn quét mã máy'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Physical Sticker Preview */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-2 mb-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem trước tem dán thực tế (Tỷ lệ hiển thị thực):</span>
                  </span>
                  <span className="font-mono text-[11px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                    {labelSize === 'standard' ? '80mm x 50mm' : labelSize === 'compact' ? '50mm x 30mm' : '100mm x 65mm'}
                  </span>
                </div>

                {/* Sticker Canvas Simulator Container */}
                <div className="w-full p-4 sm:p-8 bg-slate-200/70 rounded-2xl border border-slate-300 flex items-center justify-center overflow-x-auto min-h-[360px]">
                  
                  {/* Single Printable Asset Tag */}
                  <div
                    id="printable-single-qr-tag"
                    className={`bg-white rounded-xl shadow-xl transition-all font-sans relative ${
                      showCutGuide ? 'border-2 border-dashed border-slate-400 p-2' : ''
                    } ${
                      labelSize === 'compact' 
                        ? 'w-[340px] text-xs' 
                        : labelSize === 'detailed' 
                        ? 'w-[480px] text-xs' 
                        : 'w-[430px] text-xs'
                    }`}
                  >
                    {/* Inner Sticker Box */}
                    <div className={`rounded-lg overflow-hidden border-2 bg-white ${
                      labelColor === 'blue'
                        ? 'border-blue-800'
                        : labelColor === 'emerald'
                        ? 'border-emerald-800'
                        : 'border-slate-900'
                    }`}>
                      
                      {/* Sticker Top Header */}
                      <div className={`py-1.5 px-3 text-white flex items-center justify-between gap-2 ${
                        labelColor === 'blue'
                          ? 'bg-blue-800'
                          : labelColor === 'emerald'
                          ? 'bg-emerald-800'
                          : 'bg-slate-900'
                      }`}>
                        <div className="shrink-0 flex items-center gap-1">
                          <UmpHcmLogo size={22} variant="icon" />
                          <UmpSchoolOfPharmacyLogo size={22} variant="icon" />
                        </div>
                        <div className="text-center min-w-0 flex-1">
                          <div className="text-[8.5px] font-extrabold uppercase tracking-widest opacity-95 truncate">
                            ĐẠI HỌC Y DƯỢC TP.HCM · TRƯỜNG DƯỢC
                          </div>
                          <div className="text-xs sm:text-sm font-black uppercase tracking-tight leading-tight mt-0.5">
                            BỘ MÔN BÀO CHẾ · TEM THIẾT BỊ & CHECK-IN
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <BaocheDeptLogo size={22} variant="icon" />
                        </div>
                      </div>

                      {/* Sticker Content Body */}
                      <div className="p-3.5 flex items-center gap-3.5">
                        {/* Left: High-Res QR code */}
                        <div className={`shrink-0 p-1.5 rounded-lg border-2 bg-white ${
                          labelColor === 'blue'
                            ? 'border-blue-300 bg-blue-50/40'
                            : labelColor === 'emerald'
                            ? 'border-emerald-300 bg-emerald-50/40'
                            : 'border-slate-300'
                        }`}>
                          {singleQrDataUrl ? (
                            <img
                              src={singleQrDataUrl}
                              alt={`QR ${currentEquipment.code}`}
                              className={labelSize === 'compact' ? 'w-24 h-24 object-contain' : 'w-28 h-28 object-contain'}
                            />
                          ) : (
                            <div className="w-28 h-28 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                              Đang tạo QR...
                            </div>
                          )}
                        </div>

                        {/* Right: Technical Details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                              Mã tài sản (Code):
                            </span>
                            <span className={`font-mono font-black text-base sm:text-lg leading-tight ${
                              labelColor === 'blue'
                                ? 'text-blue-700'
                                : labelColor === 'emerald'
                                ? 'text-emerald-700'
                                : 'text-slate-950'
                            }`}>
                              {currentEquipment.code}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                              Tên máy:
                            </span>
                            <span className="font-bold text-slate-900 line-clamp-2 text-xs leading-snug">
                              {currentEquipment.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            <span>Model: <strong>{currentEquipment.model}</strong></span>
                            <span className="mx-1">·</span>
                            <span>{currentEquipment.manufacturer}</span>
                          </div>

                          {showLocation && (
                            <div className="text-[11px] text-slate-800 font-medium">
                              Vị trí: <strong>{currentEquipment.room}</strong> ({currentEquipment.building})
                            </div>
                          )}

                          {showDueDate && labelSize !== 'compact' && (
                            <div className="text-[10px] text-sky-800 font-semibold">
                              Lịch bảo trì: {currentEquipment.maintenanceSchedule || 'Định kỳ hàng quý'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sticker Footer */}
                      <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-1.5 text-[10px] text-slate-600 flex items-center justify-between">
                        {showStaff ? (
                          <div className="truncate pr-2">
                            <span>Phụ trách: <strong>{currentEquipment.responsibleStaff}</strong></span>
                            {currentEquipment.emergencyContact && (
                              <span className="ml-1 text-slate-500">({currentEquipment.emergencyContact})</span>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-700">ISO 17025 Certified</span>
                        )}
                        <div className="text-right font-medium text-slate-700 shrink-0">
                          Quét QR để Check-in & xem SOP
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5 text-center">
                  <Scissors className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tem in ra có thể dán lên decal nhựa chống nước, bóc dán trực tiếp lên góc mặt trước của máy.</span>
                </div>
              </div>

            </div>
          )}

          {/* MODE 2: BATCH PRINT ON A4 DECAL SHEET */}
          {mode === 'batch' && (
            <div className="space-y-4">
              
              {/* Filter and selection toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllBatch}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {batchSelectedIds.length === allEquipment.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả thiết bị'}
                    </span>
                  </button>

                  <span className="text-xs text-slate-600">
                    Đã chọn <strong className="text-blue-700 font-bold">{batchSelectedIds.length}</strong> / {allEquipment.length} thiết bị
                    (Dự kiến {Math.ceil(batchSelectedIds.length / 8)} trang A4)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={batchSearchTerm}
                      onChange={(e) => setBatchSearchTerm(e.target.value)}
                      placeholder="Tìm máy cần in..."
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white w-44"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintBatch}
                    disabled={batchSelectedIds.length === 0}
                    className="py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Toàn Bộ Trang A4 ({batchSelectedIds.length} Tem)</span>
                  </button>
                </div>
              </div>

              {/* Category Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-slate-400 text-[11px] font-bold uppercase mr-1">Lọc:</span>
                <button
                  type="button"
                  onClick={() => setBatchCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    batchCategoryFilter === 'all'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setBatchCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      batchCategoryFilter === cat
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Equipment Selection Pills */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {filteredBatchEquipment.map((eq) => {
                  const isChecked = batchSelectedIds.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => {
                        setBatchSelectedIds((prev) =>
                          isChecked ? prev.filter((id) => id !== eq.id) : [...prev, eq.id]
                        );
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                      <span>[{eq.code}]</span>
                      <span className="max-w-[140px] truncate">{eq.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Batch A4 Sheet Visual Preview */}
              <div className="bg-slate-200/80 p-4 sm:p-6 rounded-2xl border border-slate-300">
                <div className="text-xs text-slate-600 font-semibold mb-3 flex items-center justify-between">
                  <span>Xem trước bố cục trang in Decal A4 (2 cột x 4 hàng = 8 tem/trang):</span>
                  <span>Khổ giấy A4 Chuẩn · Viền cắt kéo nét đứt</span>
                </div>

                {/* Printable Batch Sheet Element */}
                <div 
                  id="printable-batch-qr-sheet"
                  className="bg-white shadow-lg mx-auto p-6 max-w-4xl border border-slate-200 text-slate-900"
                  style={{ minHeight: '800px' }}
                >
                  {/* A4 Sheet Header */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900">
                        DANH MỤC TEM TÀI SẢN & MÃ QR THIẾT BỊ PHÒNG THÍ NGHIỆM
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Hệ thống Quản lý Thiết bị Lab · Ngày xuất in: {new Date().toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      Tổng số: {selectedBatchItems.length} tem
                    </div>
                  </div>

                  {/* Grid 2 Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedBatchItems.map((eq, idx) => {
                      const qrUrl = batchQrMap[eq.id];
                      return (
                        <div
                          key={eq.id}
                          className="border-2 border-dashed border-slate-400 p-2 rounded-lg bg-white"
                        >
                          <div className="border-2 border-blue-900 rounded-md overflow-hidden bg-white">
                            {/* Sticker Header */}
                            <div className="bg-teal-900 text-white py-1 px-2 text-center flex items-center justify-between gap-1">
                              <UmpHcmLogo size={16} variant="icon" />
                              <div className="min-w-0 flex-1">
                                <div className="text-[7.5px] font-extrabold uppercase tracking-wider truncate">
                                  ĐH Y DƯỢC TP.HCM · TRƯỜNG DƯỢC
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-tight leading-tight">
                                  BỘ MÔN BÀO CHẾ · TEM CHECK-IN
                                </div>
                              </div>
                              <BaocheDeptLogo size={16} variant="icon" />
                            </div>

                            {/* Sticker Body */}
                            <div className="p-2.5 flex items-center gap-2.5">
                              <div className="shrink-0 p-1 border border-slate-300 rounded bg-white">
                                {qrUrl ? (
                                  <img src={qrUrl} alt={eq.code} className="w-20 h-20 object-contain" />
                                ) : (
                                  <div className="w-20 h-20 flex items-center justify-center bg-slate-100 text-[9px] text-slate-400">
                                    QR
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                                <div className="font-mono font-black text-sm text-blue-700 leading-none">
                                  {eq.code}
                                </div>
                                <div className="font-bold text-slate-900 line-clamp-1 leading-tight text-xs">
                                  {eq.name}
                                </div>
                                <div className="text-[10px] text-slate-600 truncate">
                                  {eq.model} ({eq.manufacturer})
                                </div>
                                <div className="text-[10px] text-slate-800 font-medium">
                                  Phòng: <strong>{eq.room}</strong>
                                </div>
                                <div className="text-[9px] text-slate-500 truncate">
                                  Phụ trách: {eq.responsibleStaff}
                                </div>
                              </div>
                            </div>

                            {/* Sticker Footer */}
                            <div className="border-t border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] text-slate-600 flex items-center justify-between">
                              <span>ISO 17025</span>
                              <span className="font-medium text-slate-700">Quét QR xem SOP & Check-in</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
            <span>
              {mode === 'single'
                ? 'Mã QR chứa deep-link quét trực tiếp bằng camera điện thoại tại phòng lab.'
                : `Sẵn sàng in ${selectedBatchItems.length} tem dán decal lên khổ A4.`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Đóng
            </button>

            {mode === 'single' ? (
              <button
                onClick={handlePrintSingle}
                className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Tem Này</span>
              </button>
            ) : (
              <button
                onClick={handlePrintBatch}
                disabled={selectedBatchItems.length === 0}
                className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Hàng Loạt</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
