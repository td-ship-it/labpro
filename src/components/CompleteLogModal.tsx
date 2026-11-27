import React, { useState } from 'react';
import { Equipment, MachineCondition, UsageLog } from '../types';
import { LabStorage } from '../services/storage';
import { AlertTriangle, X } from 'lucide-react';
import { CONDITION_OPTIONS, conditionNeedsNote } from './CheckInOutModal';

interface CompleteLogModalProps {
  log: UsageLog;
  equipment?: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Bổ sung số lượng mẫu và tình trạng máy cho ca do hệ thống tự check-out khi hết giờ.
 * Hệ thống không tự điền hai thông tin này, người sử dụng phải nhập lại.
 */
export const CompleteLogModal: React.FC<CompleteLogModalProps> = ({ log, equipment, onClose, onSuccess }) => {
  const [sampleCount, setSampleCount] = useState<string>('');
  const [finalCondition, setFinalCondition] = useState<MachineCondition>('good');
  const [conditionNote, setConditionNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    if (sampleCount.trim() === '' || Number(sampleCount) < 0) {
      setErrorMsg('Vui lòng nhập số lượng mẫu đã phân tích.');
      return;
    }
    if (conditionNeedsNote(finalCondition) && !conditionNote.trim()) {
      setErrorMsg('Tình trạng máy đã chọn cần ghi chú chi tiết.');
      return;
    }
    setSubmitting(true);
    const res = await LabStorage.completeLogDetails({
      logId: log.id,
      sampleCount: Number(sampleCount),
      finalCondition,
      conditionNote: conditionNeedsNote(finalCondition) ? conditionNote.trim() : undefined,
    });
    setSubmitting(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Không thể cập nhật nhật ký.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/70">
          <div>
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Bổ sung thông tin ca đã tự check-out
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {equipment ? `[${equipment.code}] ${equipment.name}` : 'Thiết bị'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            Ca này đã hết giờ đăng ký và được hệ thống tự check-out. Vui lòng nhập lại số lượng mẫu và tình trạng máy để hoàn tất nhật ký.
          </p>

          {errorMsg && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{errorMsg}</div>
          )}

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
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tình trạng thiết bị sau khi sử dụng:</label>
            <div className="space-y-1.5">
              {CONDITION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                    finalCondition === opt.value ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="completeCondition"
                    checked={finalCondition === opt.value}
                    onChange={() => setFinalCondition(opt.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {opt.icon}
                  <span className="font-semibold text-slate-900">{opt.label}</span>
                </label>
              ))}
            </div>
            {conditionNeedsNote(finalCondition) && (
              <textarea
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                rows={2}
                placeholder="Mô tả chi tiết tình trạng máy..."
                className="mt-2 w-full text-xs p-2.5 rounded-lg border border-amber-300 bg-white focus:outline-hidden"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
              Để sau
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Đang lưu...' : 'Lưu bổ sung nhật ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
