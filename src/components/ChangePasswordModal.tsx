import React, { useEffect, useState } from 'react';
import { X, AlertCircle, KeyRound } from 'lucide-react';
import { LabStorage } from '../services/storage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (newPw.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (newPw !== confirmPw) return setError('Hai lần nhập mật khẩu mới không khớp.');
    setSaving(true);
    setError(null);
    const res = await LabStorage.changePassword(oldPw, newPw);
    setSaving(false);
    if (!res.success) return setError(res.error || 'Không đổi được mật khẩu.');
    onSuccess();
    onClose();
  };

  const inputCls = 'w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="block text-xs font-semibold text-slate-700">
            Mật khẩu hiện tại
            <input type="password" autoComplete="current-password" required value={oldPw} onChange={(e) => setOldPw(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Mật khẩu mới (tối thiểu 6 ký tự)
            <input type="password" autoComplete="new-password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Nhập lại mật khẩu mới
            <input type="password" autoComplete="new-password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
