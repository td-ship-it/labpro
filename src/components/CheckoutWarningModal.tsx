import React from 'react';
import { Equipment, UsageLog } from '../types';
import { 
  AlertTriangle, 
  AlertOctagon, 
  LogOut, 
  X, 
  Clock, 
  MapPin, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface CheckoutWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: {
    log: UsageLog;
    equipment?: Equipment;
    elapsedDisplay: string;
    isOverdue: boolean;
  } | null;
  onProceedLogout: () => void;
  onOpenCheckOutNow: () => void;
  actionTitle?: string;
}

export const CheckoutWarningModal: React.FC<CheckoutWarningModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onProceedLogout,
  onOpenCheckOutNow,
  actionTitle = 'Đăng xuất khỏi hệ thống',
}) => {
  if (!isOpen || !activeSession) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-rose-50 p-5 border-b border-rose-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                Cảnh Báo Chưa Trả Máy (Check-out)
              </h3>
              <p className="text-xs text-rose-700">
                Bạn vẫn đang có ca vận hành chưa kết thúc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-rose-100/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Trước khi <strong className="text-slate-900">{actionTitle}</strong>, vui lòng thực hiện Check-out bàn giao thiết bị để hệ thống ghi nhận chính xác thời gian vận hành và trạng thái máy cho người dùng kế tiếp.
          </p>

          {/* Machine Session Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {activeSession.equipment?.code || 'THIẾT BỊ'}
              </span>
              <span className="text-xs font-bold text-slate-900 truncate">
                {activeSession.equipment?.name}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span>Vị trí đặt máy:</span>
                <span className="font-medium text-slate-800">{activeSession.equipment?.room || 'Phòng Lab'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Thời gian đã chạy:</span>
                <span className="font-mono font-bold text-rose-600">{activeSession.elapsedDisplay}</span>
              </div>
              {activeSession.isOverdue && (
                <div className="text-rose-600 font-bold bg-rose-50 p-1 rounded text-center">
                  ⚠️ Ca làm việc này hiện đã quá hạn so với lịch đặt ban đầu!
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Nếu không check-out, thiết bị sẽ tiếp tục tính thời gian sử dụng và tài khoản có thể bị nhắc nhở vi phạm quy chế phòng Lab.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onProceedLogout}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Vẫn tiếp tục {actionTitle.toLowerCase()}
          </button>

          <button
            type="button"
            onClick={onOpenCheckOutNow}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Check-out Bàn Giao Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
