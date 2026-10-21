import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  /** Trả về thông báo lỗi, hoặc null nếu lưu thành công. */
  onSave: (user: User) => Promise<string | null>;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('instructor');
  const [title, setTitle] = useState<string>('Giảng viên');
  const [department, setDepartment] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [status, setStatus] = useState<User['status']>('active');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const avatarColors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-amber-600',
    'bg-purple-600',
    'bg-rose-600',
  ];

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setTitle(userToEdit.title);
      setDepartment(userToEdit.department);
      setPhone(userToEdit.phone);
      setStatus(userToEdit.status);
    } else {
      setName('');
      setEmail('');
      setRole('instructor');
      setTitle('Giảng viên');
      setDepartment('Khoa Hóa học');
      setPhone('');
      setStatus('active');
    }
    setErrorMsg(null);
    setPassword('');
    setSaving(false);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (password && password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Vui lòng nhập họ tên và email người dùng.');
      return;
    }

    const updatedUser: User = {
      id: userToEdit ? userToEdit.id : `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      title: title.trim() || 'Cán bộ nghiên cứu',
      department: department.trim() || 'Phòng Thí nghiệm Trung tâm',
      phone: phone.trim() || '---',
      status,
      avatarBg: userToEdit ? userToEdit.avatarBg : avatarColors[Math.floor(Math.random() * avatarColors.length)],
      password: password || undefined,
    };

    setSaving(true);
    setErrorMsg(null);
    const err = await onSave(updatedUser);
    setSaving(false);
    if (err) {
      setErrorMsg(err);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {userToEdit ? 'Chỉnh Sửa Tài Khoản Người Dùng' : 'Cấp Mới Tài Khoản Sử Dụng Lab'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân quyền giảng viên, nghiên cứu viên hoặc quản trị viên
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên cán bộ / học viên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: TS. Nguyễn Văn Minh"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vai trò phân quyền <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="instructor">Giảng viên / Hướng dẫn</option>
                <option value="researcher">Nghiên cứu viên / Học viên</option>
                <option value="admin">Quản trị viên (Admin)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Học hàm / Chức danh
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: PGS. TS., ThS., NCS"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công tác / trường học <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: minh.nguyen@lab.edu.vn"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khoa / Viện nghiên cứu
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="VD: Khoa Hóa học"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912 345 678"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {userToEdit ? 'Đặt lại mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu (để trống để hệ thống tự tạo)'}
            </label>
            <input
              type="text"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự · sẽ được gửi tới email người dùng"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trạng thái cấp phép đăng ký
            </label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="userStatus"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-emerald-600"
                />
                <span className="text-emerald-700 font-semibold">Được phép đăng ký (Hoạt động)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="userStatus"
                  value="suspended"
                  checked={status === 'suspended'}
                  onChange={() => setStatus('suspended')}
                  className="text-slate-600"
                />
                <span className="text-slate-600 font-medium">Tạm khóa quyền</span>
              </label>
            </div>
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
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : userToEdit ? 'Lưu Thông Tin' : 'Cấp Tài Khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
