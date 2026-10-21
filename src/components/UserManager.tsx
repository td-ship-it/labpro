import React, { useState } from 'react';
import { User } from '../types';
import { LabStorage } from '../services/storage';
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  GraduationCap, 
  Microscope, 
  Edit3, 
  Lock, 
  Unlock, 
  Mail, 
  Phone, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { UserModal } from './UserModal';

interface UserManagerProps {
  currentUser: User;
  allUsers: User[];
  onRefresh: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  currentUser,
  allUsers,
  onRefresh,
}) => {
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const handleToggleStatus = (userId: string) => {
    if (!isAdmin) return;
    LabStorage.toggleUserStatus(userId);
    onRefresh();
  };

  const handleSaveUser = async (user: User): Promise<string | null> => {
    const isNew = !allUsers.some((u) => u.id === user.id);
    const res = await LabStorage.upsertUser(user);
    if (!res.success) return res.error || 'Không lưu được tài khoản.';
    onRefresh();
    if (res.password) {
      setNotice({
        type: 'ok',
        text: `${isNew ? 'Đã cấp tài khoản' : 'Đã đặt mật khẩu mới'} cho ${user.email}.\nMật khẩu: ${res.password}\nHệ thống đã gửi mật khẩu này tới email của người dùng.`,
      });
    } else {
      setNotice({ type: 'ok', text: `Đã lưu tài khoản ${user.email}.` });
    }
    return null;
  };

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Quản trị viên
          </span>
        );
      case 'instructor':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
            <GraduationCap className="w-3.5 h-3.5" />
            Giảng viên
          </span>
        );
      case 'researcher':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-200">
            <Microscope className="w-3.5 h-3.5" />
            Nghiên cứu viên
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Quản Lý Người Được Phép Đăng Ký
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cấp tài khoản riêng cho Giảng viên, Nghiên cứu viên, Người hướng dẫn và phân quyền truy cập
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <button
              onClick={() => {
                setUserToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Cấp Tài Khoản Mới</span>
            </button>
          ) : (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Chỉ Admin mới có quyền thêm người và phân quyền</span>
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span className="whitespace-pre-line">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-semibold shrink-0 hover:underline">Đóng</button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'admin', 'instructor', 'researcher'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'all'
                ? 'Tất cả'
                : r === 'admin'
                ? 'Quản trị viên'
                : r === 'instructor'
                ? 'Giảng viên'
                : 'Nghiên cứu viên'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, email, khoa..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Danh Sách Người Được Phép Đăng Ký ({filteredUsers.length} tài khoản)</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Đang hoạt động: {allUsers.filter((u) => u.status === 'active').length} / Tạm khóa: {allUsers.filter((u) => u.status === 'suspended').length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Họ Tên & Chức Danh</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Khoa / Đơn Vị</th>
                <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                <th className="py-3 px-4">Trạng Thái</th>
                {isAdmin && <th className="py-3 px-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.status === 'active';
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !isActive ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${u.avatarBg}`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded font-semibold border border-blue-200">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {u.title}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {u.department}
                        </div>
                      </td>

                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-sm font-semibold inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isActive ? 'Được phép' : 'Tạm khóa'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle lock */}
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              disabled={isCurrent}
                              className={`p-1.5 rounded transition-colors ${
                                isActive
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={isActive ? 'Khóa quyền đăng ký' : 'Mở khóa quyền'}
                            >
                              {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setUserToEdit(u);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Sửa thông tin"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={userToEdit}
        onSave={handleSaveUser}
      />
    </div>
  );
};
