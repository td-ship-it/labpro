import React, { useState, useEffect } from 'react';
import { Equipment, User, UsageLog, Booking, MachineCondition } from '../types';
import { LabStorage } from '../services/storage';
import { checklistOf } from '../data/equipmentDefaults';
import { X, CheckCircle, AlertTriangle, HelpCircle, StickyNote, ExternalLink, CheckSquare, Square } from 'lucide-react';

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

/** Tình trạng 2 và 3 bắt buộc có ghi chú chi tiết. */
export const conditionNeedsNote = (c: MachineCondition) => c === 'minor_wear' || c === 'needs_calibration';

/** Ba mức tình trạng thả chọn (thay cho danh sách cũ có thêm mục "Hỏng hóc"). */
export const CONDITION_OPTIONS: { value: MachineCondition; label: string; desc: string; icon: React.ReactNode }[] = [
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
];

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
  const [operatorNotes, setOperatorNotes] = useState<string>('');

  // Check-out state
  const [finalCondition, setFinalCondition] = useState<MachineCondition>('good');
  const [conditionNote, setConditionNote] = useState<string>('');
  const [sampleCount, setSampleCount] = useState<string>(activeLog?.sampleCount !== undefined ? String(activeLog.sampleCount) : '');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [hasIncident, setHasIncident] = useState<boolean>(false);
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [incidentDesc, setIncidentDesc] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setCheckedItems([]);
      setSampleCount(activeLog?.sampleCount !== undefined ? String(activeLog.sampleCount) : '');
    }
  }, [isOpen, activeLog]);

  if (!isOpen) return null;

  const checklist = checklistOf(equipment);

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    if (conditionNeedsNote(initialCondition) && !operatorNotes.trim()) {
      setErrorMsg('Tình trạng máy đã chọn cần ghi chú chi tiết. Vui lòng nhập ghi chú bên dưới.');
      return;
    }

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
    if (sampleCount.trim() === '' || Number(sampleCount) < 0) {
      setErrorMsg('Vui lòng nhập số lượng mẫu đã phân tích.');
      return;
    }
    if (conditionNeedsNote(finalCondition) && !conditionNote.trim()) {
      setErrorMsg('Tình trạng máy đã chọn cần ghi chú chi tiết. Vui lòng nhập ghi chú bên dưới.');
      return;
    }
    if (hasIncident && !incidentDesc.trim()) {
      setErrorMsg('Vui lòng nhập chi tiết mô tả sự cố để kỹ thuật viên nắm bắt.');
      return;
    }

    const completed = checklist.filter((item) => checkedItems.includes(item));

    setSubmitting(true);
    const res = await LabStorage.checkOutEquipment({
      logId: activeLog.id,
      finalCondition,
      conditionNote: conditionNeedsNote(finalCondition) ? conditionNote.trim() : undefined,
      operatorNotesAddendum: completed.length > 0 ? 'Đã hoàn tất: ' + completed.join('; ') : undefined,
      sampleCount: Number(sampleCount) || 0,
      incidentReport: {
        hasIncident,
        severity: hasIncident ? incidentSeverity : undefined,
        description: hasIncident ? incidentDesc.trim() : undefined,
        resolved: false,
      },
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Lỗi khi trả máy.');
    }
  };

  const toggleItem = (item: string) => {
    setCheckedItems((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  /** Ô ghi chú bắt buộc: chỉ hiện khi chọn tình trạng 2 hoặc 3, ngay bên dưới danh sách. */
  const noteBox = (value: string, setValue: (v: string) => void, placeholder: string) => (
    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1 animate-in fade-in duration-100">
      <label className="block text-xs font-semibold text-amber-900">
        Mô tả chi tiết tình trạng: <span className="text-rose-600">*</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        required
        placeholder={placeholder}
        className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-amber-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
      />
    </div>
  );

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
                        className="text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Mở toàn bộ sổ ghi chú</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {displayNotes.map((note) => (
                      <div key={note.id} className="p-2 bg-white/95 rounded-lg border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{note.title}</span>
                          <span className="text-xs text-amber-700 font-medium">Bởi {note.authorName}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{note.content}</p>
                        {note.parameters && note.parameters.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {note.parameters.slice(0, 3).map((p, pIdx) => (
                              <span key={pIdx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono text-xs">
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
                {CONDITION_OPTIONS.map((opt) => (
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
                      <div className="text-xs text-slate-500 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {conditionNeedsNote(initialCondition) && (
                <div className="mt-2">
                  {noteBox(operatorNotes, setOperatorNotes, 'Mô tả vết xước, phụ kiện mòn, baseline trôi hoặc bước sóng cần hiệu chuẩn...')}
                </div>
              )}
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
                {CONDITION_OPTIONS.map((opt) => (
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
              {conditionNeedsNote(finalCondition) && (
                <div className="mt-2">
                  {noteBox(conditionNote, setConditionNote, 'Mô tả chi tiết tình trạng máy sau khi sử dụng...')}
                </div>
              )}
            </div>

            {/* Sample Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng mẫu đã phân tích: <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={sampleCount}
                onChange={(e) => setSampleCount(e.target.value)}
                placeholder="Nhập số mẫu"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            {/* Completion checklist: người dùng tự tick chọn theo từng thiết bị */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hoàn tất trước khi trả máy (tick chọn):
              </label>
              <div className="space-y-1.5">
                {checklist.map((item) => {
                  const on = checkedItems.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-colors ${
                        on ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {on ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
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
                    <label className="block text-xs font-semibold text-rose-900 mb-1">
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
                    <label className="block text-xs font-semibold text-rose-900 mb-1">
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
