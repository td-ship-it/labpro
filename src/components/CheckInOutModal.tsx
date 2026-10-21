import React, { useState, useEffect } from 'react';
import { Equipment, User, UsageLog, Booking, MachineCondition, ConsumedSupplyItem, ConsumableSupply } from '../types';
import { LabStorage } from '../services/storage';
import { X, CheckCircle, AlertTriangle, AlertOctagon, HelpCircle, StickyNote, ExternalLink, Package, Plus, Minus, FolderGit2 } from 'lucide-react';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  equipment: Equipment;
  currentUser: User;
  activeBooking?: Booking;
  activeLog?: UsageLog;
  onSuccess: () => void;
  onOpenQuickNotes?: (eqId: string) => void;
}

export const CheckInOutModal: React.FC<CheckInOutModalProps> = ({
  isOpen,
  onClose,
  mode,
  equipment,
  currentUser,
  activeBooking,
  activeLog,
  onSuccess,
  onOpenQuickNotes,
}) => {
  // Check-in state
  const [initialCondition, setInitialCondition] = useState<MachineCondition>('good');
  const [operatorNotes, setOperatorNotes] = useState<string>('Thiết bị khởi động bình thường, buồng đo sạch sẽ.');

  // Check-out state
  const [finalCondition, setFinalCondition] = useState<MachineCondition>('good');
  const [sampleCount, setSampleCount] = useState<number>(activeLog?.sampleCount || 5);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('Đã tắt đèn quang phổ / khóa van khí an toàn và vệ sinh khu vực đo.');
  const [hasIncident, setHasIncident] = useState<boolean>(false);
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [incidentDesc, setIncidentDesc] = useState<string>('');

  // Project Tracking & Supplies Consumed state
  const [catalogSupplies, setCatalogSupplies] = useState<ConsumableSupply[]>([]);
  const [consumedSupplies, setConsumedSupplies] = useState<ConsumedSupplyItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCatalogSupplies(LabStorage.getConsumableSupplies());
      if (activeLog?.consumedSupplies && activeLog.consumedSupplies.length > 0) {
        setConsumedSupplies(activeLog.consumedSupplies);
      } else if (activeBooking?.plannedSupplies && activeBooking.plannedSupplies.length > 0) {
        setConsumedSupplies(activeBooking.plannedSupplies);
      } else {
        setConsumedSupplies([]);
      }
    }
  }, [isOpen, activeBooking, activeLog]);

  const handleAddSupply = (supply: ConsumableSupply, delta = 1) => {
    setConsumedSupplies((prev) => {
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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    setSubmitting(true);
    const res = await LabStorage.checkInEquipment({
      bookingId: activeBooking?.id,
      equipmentId: equipment.id,
      userId: currentUser.id,
      initialCondition,
      operatorNotes: operatorNotes.trim(),
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Lỗi khi nhận máy.');
    }
  };

  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (!activeLog) {
      setErrorMsg('Không tìm thấy nhật ký phiên hiện tại.');
      return;
    }

    if (hasIncident && !incidentDesc.trim()) {
      setErrorMsg('Vui lòng nhập chi tiết mô tả sự cố để kỹ thuật viên nắm bắt.');
      return;
    }

    setSubmitting(true);
    const res = await LabStorage.checkOutEquipment({
      logId: activeLog.id,
      finalCondition,
      operatorNotesAddendum: checkoutNotes.trim(),
      sampleCount: Number(sampleCount) || 0,
      incidentReport: {
        hasIncident,
        severity: hasIncident ? incidentSeverity : undefined,
        description: hasIncident ? incidentDesc.trim() : undefined,
        resolved: false,
      },
      consumedSupplies: consumedSupplies.length > 0 ? consumedSupplies : undefined,
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Lỗi khi trả máy.');
    }
  };

  const conditionOptions: { value: MachineCondition; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: 'good',
      label: 'Tốt / Bình thường',
      desc: 'Thiết bị hoạt động chuẩn xác, không có dấu hiệu bất thường',
      icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    },
    {
      value: 'minor_wear',
      label: 'Hao mòn nhẹ / Chấp nhận được',
      desc: 'Có vết xước ngoài vỏ hoặc phụ kiện mòn nhẹ nhưng không ảnh hưởng kết quả',
      icon: <HelpCircle className="w-4 h-4 text-amber-600" />,
    },
    {
      value: 'needs_calibration',
      label: 'Cần hiệu chuẩn lại',
      desc: 'Baseline bị trôi hoặc quang phổ cần chỉnh bước sóng chuẩn',
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    },
    {
      value: 'damaged',
      label: 'Hỏng hóc / Báo lỗi hệ thống',
      desc: 'Không thể tiếp tục đo, phát sinh mã lỗi phần cứng hoặc gãy phụ kiện',
      icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'checkin' ? 'Check-in: Bắt Đầu Sử Dụng Thiết Bị' : 'Check-out: Hoàn Tất & Trả Máy'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              [{equipment.code}] {equipment.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Check-In Mode */}
        {mode === 'checkin' && (
          <form onSubmit={handleCheckInSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Người vận hành:</span>
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Thời điểm nhận máy:</span>
                <span className="font-mono font-medium text-blue-700">{new Date().toLocaleTimeString('vi-VN')} ({new Date().toLocaleDateString('vi-VN')})</span>
              </div>
            </div>

            {/* Quick Notes for equipment before starting session */}
            {(() => {
              const qnotes = LabStorage.getQuickNotesForEquipment(equipment.id);
              if (qnotes.length === 0) return null;
              const pinned = qnotes.filter((n) => n.isPinned);
              const displayNotes = pinned.length > 0 ? pinned : qnotes.slice(0, 2);

              return (
                <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <StickyNote className="w-4 h-4 text-amber-600" />
                      <span>Lưu ý & Cấu hình khuyến nghị trước ca đo ({qnotes.length} Quick Notes)</span>
                    </div>
                    {onOpenQuickNotes && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickNotes(equipment.id)}
                        className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Mở toàn bộ sổ ghi chú</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {displayNotes.map((note) => (
                      <div key={note.id} className="p-2 bg-white/95 rounded-lg border border-amber-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{note.title}</span>
                          <span className="text-[10px] text-amber-700 font-medium">Bởi {note.authorName}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{note.content}</p>
                        {note.parameters && note.parameters.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {note.parameters.slice(0, 3).map((p, pIdx) => (
                              <span key={pIdx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                {p.key}: <strong className="text-blue-700">{p.value}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Initial Condition */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đánh giá tình trạng thiết bị trước khi vận hành:
              </label>
              <div className="space-y-2">
                {conditionOptions.filter((o) => o.value !== 'damaged').map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      initialCondition === opt.value
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="initialCondition"
                      value={opt.value}
                      checked={initialCondition === opt.value}
                      onChange={() => setInitialCondition(opt.value)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú tình trạng ban đầu & Kiểm tra an toàn:
              </label>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                rows={2}
                placeholder="Ghi nhận tình trạng buồng mẫu, áp suất khí, hóa chất tồn đọng..."
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-60"
              >
                {submitting ? 'Đang ghi nhận...' : 'Xác Nhận Nhận Máy (Check-in)'}
              </button>
            </div>
          </form>
        )}

        {/* Check-Out Mode */}
        {mode === 'checkout' && (
          <form onSubmit={handleCheckOutSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Người vận hành:</span>
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Giờ nhận máy:</span>
                <span className="font-mono text-slate-700">
                  {activeLog?.checkInTime ? new Date(activeLog.checkInTime).toLocaleTimeString('vi-VN') : '---'}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-600">Giờ trả máy hiện tại:</span>
                <span className="font-mono text-emerald-800 font-semibold">{new Date().toLocaleTimeString('vi-VN')}</span>
              </div>
            </div>

            {/* Final Condition */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tình trạng thiết bị sau khi kết thúc thí nghiệm:
              </label>
              <div className="space-y-1.5">
                {conditionOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      finalCondition === opt.value
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="finalCondition"
                      value={opt.value}
                      checked={finalCondition === opt.value}
                      onChange={() => setFinalCondition(opt.value)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sample Count & Work Performed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng mẫu đã phân tích:
                </label>
                <input
                  type="number"
                  min="0"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bàn giao / Vệ sinh thiết bị:
                </label>
                <div className="text-[11px] text-slate-500 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  Lau khô buồng mẫu, tắt thiết bị phụ trợ & khóa van an toàn.
                </div>
              </div>
            </div>

            {/* Project Consumables Logging */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span>Vật Tư Tiêu Hao Thực Tế (Ghi Nhận Cho Đề Tài)</span>
                  {(activeBooking?.projectCode || activeLog?.projectCode) && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                      [{activeBooking?.projectCode || activeLog?.projectCode}]
                    </span>
                  )}
                </label>
                <span className="text-[11px] font-mono text-slate-700">
                  Tổng: <strong className="text-emerald-700">{consumedSupplies.reduce((acc, s) => acc + s.totalCostVND, 0).toLocaleString('vi-VN')} ₫</strong>
                </span>
              </div>

              {/* Quick Add Supply buttons */}
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                {catalogSupplies.map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => handleAddSupply(sup, 1)}
                    className="px-2 py-0.5 text-[10px] rounded border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{sup.name}</span>
                  </button>
                ))}
              </div>

              {/* Consumed list with counter */}
              {consumedSupplies.length > 0 && (
                <div className="space-y-1 pt-1">
                  {consumedSupplies.map((item) => {
                    const supMatch = catalogSupplies.find((c) => c.id === item.supplyId);
                    return (
                      <div key={item.supplyId} className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-800 truncate max-w-[200px]">{item.supplyName}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 border border-slate-200 rounded p-0.5">
                            <button
                              type="button"
                              onClick={() => supMatch && handleAddSupply(supMatch, -1)}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-mono font-bold text-indigo-700 px-1 text-xs">{item.quantity} {item.unit}</span>
                            <button
                              type="button"
                              onClick={() => supMatch && handleAddSupply(supMatch, 1)}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <span className="font-mono font-bold text-slate-900 min-w-[60px] text-right">
                            {item.totalCostVND.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incident Report Section */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={hasIncident}
                  onChange={(e) => setHasIncident(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Báo cáo sự cố kỹ thuật trong ca làm việc
                </span>
              </label>

              {hasIncident && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                      Mức độ nghiêm trọng của sự cố:
                    </label>
                    <select
                      value={incidentSeverity}
                      onChange={(e) => setIncidentSeverity(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-rose-300 bg-white"
                    >
                      <option value="low">Nhẹ (Ảnh hưởng nhỏ, máy vẫn chạy được)</option>
                      <option value="medium">Trung bình (Baseline trôi, cần bảo trì sớm)</option>
                      <option value="high">Nghiêm trọng (Phát sinh lỗi báo động, dừng đo)</option>
                      <option value="critical">Khẩn cấp (Hỏng cơ học/điện, cần chuyển trạng thái Bảo trì)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                      Mô tả hiện tượng sự cố: <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      value={incidentDesc}
                      onChange={(e) => setIncidentDesc(e.target.value)}
                      rows={2}
                      placeholder="Mô tả mã lỗi, tiếng ồn lạ, áp suất tụt, cuvette nứt vỡ..."
                      className="w-full text-xs p-2 rounded border border-rose-300 bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Final Operator Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú hoàn tất của người vận hành:
              </label>
              <textarea
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                rows={2}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-60"
              >
                {submitting ? 'Đang lưu nhật ký...' : 'Xác Nhận Trả Máy & Hoàn Tất Nhật Ký'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
