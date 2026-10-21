import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { LabStorage } from '../services/storage';
import { 
  FlaskConical, 
  ShieldCheck, 
  GraduationCap, 
  Microscope, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Building2, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  BookOpenCheck,
  CalendarDays
} from 'lucide-react';
import { 
  LabLogProLogo, 
  UmpHcmLogo, 
  UmpSchoolOfPharmacyLogo, 
  BaocheDeptLogo, 
  AcademicHeaderBadges,
  VilasLogo, 
  Iso17025Badge 
} from './LabLogos';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [busy, setBusy] = useState<boolean>(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [config, setConfig] = useState(LabStorage.getConfig());
  // Lấy chế độ đăng ký từ máy chủ (đồng thời "đánh thức" Apps Script trong lúc người dùng gõ mật khẩu)
  useEffect(() => {
    LabStorage.loadPublicConfig().then((c) => setConfig({ ...c }));
  }, []);
  const registrationOpen = config.registration !== 'closed';

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register form state
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('instructor');
  const [regTitle, setRegTitle] = useState<string>('Giảng viên');
  const [regDepartment, setRegDepartment] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');

  // Forgot password state
  const [resetStep, setResetStep] = useState<'email' | 'code'>('email');
  const [resetCode, setResetCode] = useState<string>('');
  const [resetPw, setResetPw] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchMode = (mode: 'login' | 'register' | 'forgot') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setInfoMsg(null);
    setResetStep('email');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    const res = await LabStorage.login(loginEmail, loginPassword);
    setBusy(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.error || 'Đăng nhập không thành công.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);
    setInfoMsg(null);

    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Vui lòng điền họ tên và email.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setBusy(true);
    const res = await LabStorage.register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      title: regTitle.trim() || (regRole === 'instructor' ? 'Giảng viên' : 'Nghiên cứu viên'),
      department: regDepartment.trim() || 'Phòng Thí nghiệm',
      phone: regPhone.trim() || '---',
    });
    setBusy(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else if (res.success && res.pending) {
      setAuthMode('login');
      setLoginEmail(regEmail.trim());
      setLoginPassword('');
      setInfoMsg('Đã gửi đăng ký. Tài khoản sẽ dùng được sau khi Quản trị viên phòng Lab kích hoạt; bạn sẽ nhận email thông báo.');
    } else {
      setErrorMsg(res.error || 'Đăng ký tài khoản không thành công.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);
    setBusy(true);
    if (resetStep === 'email') {
      const res = await LabStorage.requestPasswordReset(loginEmail);
      setBusy(false);
      if (!res.success) return setErrorMsg(res.error || 'Không gửi được mã.');
      setResetStep('code');
      setInfoMsg(`Nếu ${loginEmail} có tài khoản đang hoạt động, mã xác nhận 6 số đã được gửi tới email này (hiệu lực 15 phút).`);
      return;
    }
    if (resetPw.length < 6) {
      setBusy(false);
      return setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }
    const res = await LabStorage.resetPassword(loginEmail, resetCode, resetPw);
    setBusy(false);
    if (!res.success) return setErrorMsg(res.error || 'Không đặt lại được mật khẩu.');
    setAuthMode('login');
    setResetStep('email');
    setResetCode('');
    setLoginPassword('');
    setInfoMsg('Đã đặt mật khẩu mới. Vui lòng đăng nhập.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <LabLogProLogo size={40} className="[&_span]:text-white [&_span.text-slate-500]:text-slate-400" />
        </div>

        {/* Academic Seals (ĐH Y Dược TP.HCM - Trường Dược - Bộ môn Bào chế) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AcademicHeaderBadges textColor="light" />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Left: Introduction & Highlights */}
        <div className="lg:w-1/2 space-y-5 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cổng Đăng Ký Trực Tuyến & Quản Trị Phòng Lab</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
              Chuẩn Quốc Tế ISO 17025:2017
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Quản Lý Lịch & Nhật Ký Thiết Bị Khoa Học
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Mỗi giảng viên, nghiên cứu viên và người hướng dẫn được cấp tài khoản riêng để chủ động đăng ký sử dụng. Tự động kiểm tra xung đột thời gian thực và ghi nhận nhật ký Check-in/Check-out minh bạch.
          </p>

          {/* 3 Core Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-left">
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <CalendarDays className="w-5 h-5 text-blue-400" />
              <h3 className="text-xs font-bold text-white">Tự Động Duyệt Ngay</h3>
              <p className="text-[11px] text-slate-400">
                Phê duyệt tức thì khi khung giờ còn trống, không lo trùng máy.
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <BookOpenCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Sổ Nhật Ký Điện Tử</h3>
              <p className="text-[11px] text-slate-400">
                Check-in/out, đánh giá tình trạng trước/sau & báo cáo sự cố.
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white">Admin Quản Trị</h3>
              <p className="text-[11px] text-slate-400">
                Toàn quyền thêm bớt thiết bị, cấp phép và phân quyền tài khoản.
              </p>
            </div>
          </div>

          {/* Academic Governance & Department Badges */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center lg:text-left">
              Đơn vị chủ quản & quản lý hệ thống:
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-teal-300 text-xs font-bold">
                <UmpHcmLogo size={22} variant="icon" />
                <span>ĐH Y Dược TP.HCM</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-emerald-300 text-xs font-bold">
                <UmpSchoolOfPharmacyLogo size={22} variant="icon" />
                <span>Trường Dược (UMPSP)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-amber-300 text-xs font-bold">
                <BaocheDeptLogo size={22} variant="icon" />
                <span>Bộ Môn Bào Chế</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Auth Box (Login / Register Card) */}
        <div className="lg:w-1/2 max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Mode Switch Tabs */}
          <div className={`grid ${registrationOpen ? 'grid-cols-2' : 'grid-cols-1'} p-1 bg-slate-900/80 rounded-xl border border-slate-700/60 text-xs font-semibold`}>
            <button
              onClick={() => switchMode('login')}
              className={`py-2 rounded-lg transition-colors text-center ${
                authMode !== 'register'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            {registrationOpen && (
            <button
              onClick={() => switchMode('register')}
              className={`py-2 rounded-lg transition-colors text-center ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Ký Tài Khoản
            </button>
            )}
          </div>

          {infoMsg && (
            <div className="p-3 text-xs text-emerald-200 bg-emerald-950/60 border border-emerald-800 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/60 border border-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {authMode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email công tác / trường học
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@truong.edu.vn"
                      autoComplete="username"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Mật khẩu</span>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-[11px] text-blue-400 hover:text-blue-300 font-normal">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{busy ? 'Đang đăng nhập...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {config.registration === 'approval' && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Chưa có tài khoản? Chọn <strong>Đăng Ký Tài Khoản</strong>; Quản trị viên phòng Lab sẽ kích hoạt sau khi xác minh.
                </p>
              )}
              {config.registration === 'closed' && (
                <p className="text-[11px] text-slate-400 leading-relaxed">Tài khoản do Quản trị viên phòng Lab cấp. Vui lòng liên hệ để được cấp quyền.</p>
              )}
            </div>
          )}

          {/* TAB: FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-300">
                {resetStep === 'email'
                  ? 'Nhập email tài khoản. Hệ thống sẽ gửi mã xác nhận 6 số để đặt mật khẩu mới.'
                  : 'Nhập mã 6 số trong email và mật khẩu mới.'}
              </p>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@truong.edu.vn"
                disabled={resetStep === 'code'}
                className="w-full px-3 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono disabled:opacity-60"
                required
              />
              {resetStep === 'code' && (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Mã 6 số"
                    className="w-full px-3 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono tracking-widest"
                    required
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full px-3 py-2.5 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-60"
              >
                {busy ? 'Đang xử lý...' : resetStep === 'email' ? 'Gửi mã xác nhận' : 'Đặt mật khẩu mới'}
              </button>
              <button type="button" onClick={() => switchMode('login')} className="w-full text-xs text-slate-400 hover:text-white">
                ← Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên giảng viên / nghiên cứu viên <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="vd: TS. Phạm Đình Duy"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email công tác (dùng để đăng nhập) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="email@truong.edu.vn"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vai trò <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="instructor">Giảng viên / Hướng dẫn</option>
                    <option value="researcher">Nghiên cứu viên / Học viên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Học hàm / Chức danh
                  </label>
                  <input
                    type="text"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    placeholder="vd: TS., ThS."
                    className="w-full px-2.5 py-2 text-xs bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Khoa / Viện nghiên cứu
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="Khoa Hóa học..."
                      className="w-full pl-8 pr-2 py-2 text-xs bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912..."
                      className="w-full pl-8 pr-2 py-2 text-xs bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mật khẩu <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete="new-password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full mt-2 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{busy ? 'Đang gửi...' : config.registration === 'open' ? 'Hoàn Tất Đăng Ký & Đăng Nhập' : 'Gửi Đăng Ký'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500 border-t border-slate-800">
        <span>© 2026 LabLog Pro · Hệ thống quản lý và nhật ký thiết bị khoa học phòng thí nghiệm</span>
      </footer>
    </div>
  );
};
