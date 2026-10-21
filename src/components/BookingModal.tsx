import React, { useState, useEffect } from 'react';
import { Equipment, User, Booking, ResearchProject, ConsumableSupply, ConsumedSupplyItem } from '../types';
import { LabStorage, checkBookingConflict, localDateStr } from '../services/storage';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, ShieldAlert, StickyNote, FolderGit2, Package, Plus, Minus, Tag, Coins } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentList: Equipment[];
  preselectedEquipmentId?: string;
  preselectedDate?: string;
  preselectedStartTime?: string;
  preselectedEndTime?: string;
  preselectedProjectId?: string;
  currentUser: User;
  bookings: Booking[];
  onBookSuccess: (newBooking: Booking) => void;
  onOpenQuickNotes?: (eqId: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  equipmentList,
  preselectedEquipmentId,
  preselectedDate,
  preselectedStartTime,
  preselectedEndTime,
  preselectedProjectId,
  currentUser,
  bookings,
  onBookSuccess,
  onOpenQuickNotes,
}) => {
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [date, setDate] = useState<string>(localDateStr());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [purpose, setPurpose] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Project Tracking & Supplies State
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [catalogSupplies, setCatalogSupplies] = useState<ConsumableSupply[]>([]);
  const [plannedSupplies, setPlannedSupplies] = useState<ConsumedSupplyItem[]>([]);
  const [isSuppliesAccordionOpen, setIsSuppliesAccordionOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const projList = LabStorage.getProjects();
      const supList = LabStorage.getConsumableSupplies();
      setProjects(projList);
      setCatalogSupplies(supList);

      if (preselectedProjectId) {
        setSelectedProjectId(preselectedProjectId);
        const match = projList.find((p) => p.id === preselectedProjectId);
        if (match) setProjectCode(match.code);
      }
    }
  }, [isOpen, preselectedProjectId]);

  // Handle Project Change
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId) {
      const proj = projects.find((p) => p.id === projId);
      if (proj) {
        setProjectCode(proj.code);
        if (!purpose) {
          setPurpose(`Thực nghiệm đo mẫu cho đề tài [${proj.code}] ${proj.name}`);
        }
      }
    } else {
      setProjectCode('');
    }
  };

  // Add / Increment supply item
  const handleAddSupply = (supply: ConsumableSupply, delta = 1) => {
    setPlannedSupplies((prev) => {
      const existing = prev.find((item) => item.supplyId === supply.id);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) {
          return prev.filter((item) => item.supplyId !== supply.id);
        }
        return prev.map((item) =>
          item.supplyId === supply.id
            ? { ...item, quantity: newQty, totalCostVND: newQty * item.unitCostVND }
            : item
        );
      } else if (delta > 0) {
        return [
          ...prev,
          {
            supplyId: supply.id,
            supplyCode: supply.code,
            supplyName: supply.name,
            quantity: delta,
            unit: supply.unit,
            unitCostVND: supply.unitCostVND,
            totalCostVND: delta * supply.unitCostVND,
          },
        ];
      }
      return prev;
    });
  };

  // Initialize selected equipment and time presets
  useEffect(() => {
    if (preselectedEquipmentId) {
      setSelectedEqId(preselectedEquipmentId);
    } else if (equipmentList.length > 0 && !selectedEqId) {
      const firstAvail = equipmentList.find((e) => e.status !== 'maintenance') || equipmentList[0];
      setSelectedEqId(firstAvail.id);
    }
    if (preselectedDate) {
      setDate(preselectedDate);
    }
    if (preselectedStartTime) {
      setStartTime(preselectedStartTime);
    }
    if (preselectedEndTime) {
      setEndTime(preselectedEndTime);
    }
  }, [preselectedEquipmentId, preselectedDate, preselectedStartTime, preselectedEndTime, equipmentList, isOpen]);

  if (!isOpen) return null;

  const selectedEquipment = equipmentList.find((e) => e.id === selectedEqId);

  // Real-time conflict calculation
  const conflictResult = selectedEqId && date && startTime && endTime
    ? checkBookingConflict(selectedEqId, date, startTime, endTime, bookings)
    : { hasConflict: false };

  // Calculate duration
  const getDurationHours = () => {
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diffMin > 0 ? (diffMin / 60).toFixed(1) : '0';
  };

  const durationHours = parseFloat(getDurationHours());
  const exceedsMaxHours = selectedEquipment && durationHours > selectedEquipment.maxBookingHoursPerSession;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (!selectedEqId) {
      setErrorMsg('Vui lòng chọn thiết bị.');
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg('Vui lòng nhập mục đích nghiên cứu / sử dụng thiết bị.');
      return;
    }

    if (durationHours <= 0) {
      setErrorMsg('Giờ kết thúc phải muộn hơn giờ bắt đầu.');
      return;
    }

    if (conflictResult.hasConflict) {
      setErrorMsg('Khung giờ bạn chọn đã bị trùng với lịch đặt trước đó.');
      return;
    }

    if (selectedEquipment?.status === 'maintenance') {
      setErrorMsg('Thiết bị này đang bảo trì, không thể tiếp nhận đăng ký.');
      return;
    }

    setSubmitting(true);
    const res = await LabStorage.createBooking({
      equipmentId: selectedEqId,
      userId: currentUser.id,
      date,
      startTime,
      endTime,
      purpose: purpose.trim(),
      projectId: selectedProjectId || undefined,
      projectCode: projectCode.trim() || undefined,
      plannedSupplies: plannedSupplies.length > 0 ? plannedSupplies : undefined,
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);
    if (res.success && res.booking) {
      onBookSuccess(res.booking);
      onClose();
    } else {
      setErrorMsg(res.error || 'Có lỗi xảy ra khi tạo lịch.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Đăng Ký Sử Dụng Thiết Bị
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống kiểm tra xung đột thời gian thực và tự động phê duyệt ngay
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current User Info */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-600">Người đăng ký:</span>
            <span className="font-semibold text-blue-900">
              {currentUser.name} ({currentUser.title}) · {currentUser.department}
            </span>
          </div>

          {/* Select Equipment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn thiết bị thí nghiệm <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEqId}
              onChange={(e) => setSelectedEqId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors bg-white font-medium"
              required
            >
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id} disabled={eq.status === 'maintenance'}>
                  [{eq.code}] {eq.name} - {eq.room} {eq.status === 'maintenance' ? '(Đang bảo trì)' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedEquipment && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Vị trí: <strong>{selectedEquipment.room} ({selectedEquipment.building})</strong></span>
                <span>Tối đa: <strong>{selectedEquipment.maxBookingHoursPerSession} giờ / phiên</strong></span>
              </div>
              <div className="text-slate-500 truncate">
                Quy cách: {selectedEquipment.specs}
              </div>

              {/* Quick Notes notice */}
              {(() => {
                const qnotes = LabStorage.getQuickNotesForEquipment(selectedEquipment.id);
                if (qnotes.length === 0) return null;
                return (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-slate-700">
                    <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                      <StickyNote className="w-3.5 h-3.5 text-blue-600" />
                      <span>Có <strong>{qnotes.length} Quick Notes</strong> cấu hình & hướng dẫn của đồng nghiệp</span>
                    </span>
                    {onOpenQuickNotes && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickNotes(selectedEquipment.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        Tham khảo ngay
                      </button>
                    )}
                  </div>
                );
              })()}

              {selectedEquipment.status === 'maintenance' && (
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold pt-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Cảnh báo: Thiết bị đang trong chế độ bảo trì kỹ thuật!</span>
                </div>
              )}
            </div>
          )}

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Ngày sử dụng</span>
              </label>
              <input
                type="date"
                value={date}
                min={localDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Giờ bắt đầu</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Giờ kết thúc</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                required
              />
            </div>
          </div>

          {/* Real-time Conflict Alert or OK indicator */}
          {conflictResult.hasConflict ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Trùng lịch: </span>
                {conflictResult.conflictingBooking ? (
                  <span>
                    Khung giờ {conflictResult.conflictingBooking.startTime} - {conflictResult.conflictingBooking.endTime} đã có người đặt trước. Vui lòng chọn giờ khác!
                  </span>
                ) : (
                  <span>Giờ kết thúc phải lớn hơn giờ bắt đầu.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Khung giờ còn trống ({durationHours} giờ). Sẵn sàng tự động duyệt ngay!
              </span>
            </div>
          )}

          {exceedsMaxHours && (
            <div className="text-[11px] text-amber-700">
              * Lưu ý: Thời lượng ({durationHours}h) vượt quy định tiêu chuẩn {selectedEquipment?.maxBookingHoursPerSession}h. Hãy cân nhắc chia nhỏ phiên đo.
            </div>
          )}

          {/* Purpose & Project Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mục đích thí nghiệm / Nội dung đo mẫu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ví dụ: Đo huỳnh quang phân tích hợp chất trong dịch chiết cây dược liệu"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              required
            />
          </div>

          {/* Project Tagging Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gắn Thẻ Đề Tài Nghiên Cứu (Project Tag)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Hạch toán vật tư theo đề tài
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Chọn đề tài nghiên cứu đã đăng ký --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => {
                    setProjectCode(e.target.value);
                    const match = projects.find((p) => p.code.toLowerCase() === e.target.value.trim().toLowerCase());
                    if (match) setSelectedProjectId(match.id);
                  }}
                  placeholder="Hoặc nhập mã đề tài khác (VD: DT-VAST-2026)"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Selected Project Quick Info Card */}
            {(() => {
              const proj = projects.find((p) => p.id === selectedProjectId || p.code === projectCode);
              if (!proj) return null;
              return (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs flex items-center justify-between gap-3 text-indigo-950">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-200/80 text-indigo-900 text-[11px]">
                        {proj.code}
                      </span>
                      <span className="font-semibold truncate">{proj.name}</span>
                    </div>
                    <div className="text-[11px] text-indigo-700">
                      Chủ nhiệm (PI): <strong>{proj.principalInvestigator}</strong> · {proj.department}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[10px] text-indigo-600 font-medium">Định mức vật tư:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {proj.materialBudgetVND.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Consumable Supplies Planner Section (Optional) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setIsSuppliesAccordionOpen(!isSuppliesAccordionOpen)}
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>Dự Trù Vật Tư Tiêu Hao Cho Phiên Này</span>
                {plannedSupplies.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {plannedSupplies.length} loại vật tư
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <span>
                  Ước tính: <strong className="text-slate-800">{plannedSupplies.reduce((acc, s) => acc + s.totalCostVND, 0).toLocaleString('vi-VN')} ₫</strong>
                </span>
                <span className="text-xs">{isSuppliesAccordionOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isSuppliesAccordionOpen && (
              <div className="p-3.5 bg-white space-y-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Chọn các vật tư dự kiến sử dụng để hệ thống tự động trừ kho và hạch toán vào báo cáo tiêu hao của đề tài:
                </p>

                {/* Quick Add Supply Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {catalogSupplies.map((sup) => {
                    const isAdded = plannedSupplies.some((item) => item.supplyId === sup.id);
                    return (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => handleAddSupply(sup, 1)}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition-all flex items-center gap-1 border ${
                          isAdded
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <Plus className="w-3 h-3 text-slate-400" />
                        <span>{sup.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({sup.unitCostVND.toLocaleString('vi-VN')}₫/{sup.unit})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Supplies Table */}
                {plannedSupplies.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-semibold text-slate-700 text-[11px]">Danh sách vật tư dự trù:</span>
                    <div className="space-y-1">
                      {plannedSupplies.map((item) => {
                        const supMatch = catalogSupplies.find((c) => c.id === item.supplyId);
                        return (
                          <div
                            key={item.supplyId}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate">{item.supplyName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Đơn giá: {item.unitCostVND.toLocaleString('vi-VN')} ₫ / {item.unit}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md p-0.5">
                                <button
                                  type="button"
                                  onClick={() => supMatch && handleAddSupply(supMatch, -1)}
                                  className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-bold text-indigo-700 px-1.5 text-xs">
                                  {item.quantity} {item.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => supMatch && handleAddSupply(supMatch, 1)}
                                  className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="font-mono font-bold text-slate-900 min-w-[70px] text-right">
                                {item.totalCostVND.toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú thêm (Mẫu phẩm, dung môi...)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Đã lọc mẫu 0.22µm, mang theo đĩa 96 giếng"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || conflictResult.hasConflict || selectedEquipment?.status === 'maintenance'}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
            >
              {submitting ? 'Đang gửi đăng ký...' : 'Xác Nhận Đăng Ký (Duyệt Ngay)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
