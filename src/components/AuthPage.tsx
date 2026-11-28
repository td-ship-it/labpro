import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { LabStorage } from '../services/storage';
import { DEPARTMENT_OPTIONS } from '../data/departments';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Microscope,
  GraduationCap,
} from 'lucide-react';
import { LabLogProLogo, AcademicHeaderBadges } from './LabLogos';
import { ThemeSwitch } from './ThemeSwitch';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

// Lớp dùng chung cho ô nhập (sáng mặc định, tối khi <html> có class "dark")
const FIELD =
  'w-full py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500';
const LABEL = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const ICON = 'w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none';
const PRIMARY_BTN =
  'w-full py-2.5 px-4 text-sm font-bold text-white rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60';
const LINK = 'text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300';

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
  const [regDeptChoice, setRegDeptChoice] = useState<string>(DEPARTMENT_OPTIONS[0]);
  const [regDeptOther, setRegDeptOther] = useState<string>('');
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
      title: regRole === 'instructor' ? 'Giảng viên' : 'Trợ giảng/KTV',
      department: (regDeptChoice === 'Khác' ? regDeptOther.trim() : regDeptChoice) || 'Phòng Thí nghiệm',
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
    <div className="min-h-dvh flex flex-col relative overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Trang trí nền (nhẹ, không tràn ngang) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
      <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-teal-400/15 dark:bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Thanh thương hiệu: logo + chế độ hiển thị; logo học thuật hiện dưới dạng ảnh trên điện thoại */}
      <header className="relative z-10 w-full border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <LabLogProLogo
              size={36}
              className="min-w-0 max-sm:[&_span.text-slate-500]:hidden [&_span.text-slate-900]:text-slate-900 dark:[&_span.text-slate-900]:text-white [&_span.text-slate-500]:text-slate-500 dark:[&_span.text-slate-500]:text-slate-400"
            />
            <ThemeSwitch className="shrink-0" />
          </div>
          <div className="sm:hidden">
            <AcademicHeaderBadges compact />
          </div>
          <div className="hidden sm:block">
            <AcademicHeaderBadges />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-8 lg:gap-12">
        {/* Giới thiệu */}
        <section className="w-full min-w-0 lg:flex-1 space-y-4 text-center lg:text-left">
          <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cổng Đăng Ký Trực Tuyến & Quản Trị Phòng Lab</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
            Quản lý lịch & nhật ký thiết bị khoa học
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Mỗi giảng viên, nghiên cứu viên và người hướng dẫn được cấp tài khoản riêng để chủ động đăng ký sử dụng. Tự động kiểm tra xung đột thời gian thực và ghi nhận nhật ký Check-in/Check-out minh bạch.
          </p>

          <ul className="grid gap-2.5 text-left max-w-xl mx-auto lg:mx-0 text-sm text-slate-700 dark:text-slate-300">
            {[
              { icon: ShieldCheck, text: 'Chống trùng lịch tự động theo thời gian thực' },
              { icon: Microscope, text: 'Nhật ký check-in/out và tình trạng máy rõ ràng' },
              { icon: GraduationCap, text: 'Xuất báo cáo Excel và PDF cho bộ môn' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Thẻ đăng nhập / đăng ký */}
        <section className="w-full min-w-0 lg:w-[28rem] lg:shrink-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xl shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-black/30 space-y-5">
          {/* Chuyển tab */}
          <div className={`grid ${registrationOpen ? 'grid-cols-2' : 'grid-cols-1'} p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold dark:bg-slate-900/70 dark:border-slate-700`}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2 rounded-lg transition-colors text-center ${
                authMode !== 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            {registrationOpen && (
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 rounded-lg transition-colors text-center ${
                  authMode === 'register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Đăng Ký Tài Khoản
              </button>
            )}
          </div>

          {infoMsg && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 dark:text-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0">{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="min-w-0">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: ĐĂNG NHẬP */}
          {authMode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Email công tác / trường học</label>
                  <div className="relative">
                    <Mail className={ICON} />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@truong.edu.vn"
                      autoComplete="username"
                      className={`${FIELD} pl-9 pr-3 font-mono`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mật khẩu</span>
                    <button type="button" onClick={() => switchMode('forgot')} className={LINK}>
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={ICON} />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`${FIELD} pl-9 pr-3`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className={`${PRIMARY_BTN} bg-blue-600 hover:bg-blue-700 shadow-blue-600/20`}
                >
                  <span>{busy ? 'Đang đăng nhập...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {config.registration === 'approval' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chưa có tài khoản? Chọn <strong className="text-slate-700 dark:text-slate-200">Đăng Ký Tài Khoản</strong>; Quản trị viên phòng Lab sẽ kích hoạt sau khi xác minh.
                </p>
              )}
              {config.registration === 'closed' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tài khoản do Quản trị viên phòng Lab cấp. Vui lòng liên hệ để được cấp quyền.
                </p>
              )}
            </div>
          )}

          {/* TAB: QUÊN MẬT KHẨU */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
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
                className={`${FIELD} px-3 font-mono`}
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
                    className={`${FIELD} px-3 font-mono tracking-widest`}
                    required
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    className={`${FIELD} px-3`}
                    required
                  />
                </>
              )}
              <button type="submit" disabled={busy} className={`${PRIMARY_BTN} bg-blue-600 hover:bg-blue-700 shadow-blue-600/20`}>
                {busy ? 'Đang xử lý...' : resetStep === 'email' ? 'Gửi mã xác nhận' : 'Đặt mật khẩu mới'}
              </button>
              <button type="button" onClick={() => switchMode('login')} className={`w-full text-center ${LINK}`}>
                ← Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* TAB 2: ĐĂNG KÝ */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className={LABEL}>
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className={ICON} />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="vd: TS. Phạm Đình Duy"
                    className={`${FIELD} pl-9 pr-3`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>
                  Email công tác (dùng để đăng nhập) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className={ICON} />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="email@truong.edu.vn"
                    autoComplete="email"
                    className={`${FIELD} pl-9 pr-3 font-mono`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className={LABEL}>
                    Vai trò <span className="text-rose-500">*</span>
                  </label>
                  <select value={regRole} onChange={(e) => setRegRole(e.target.value as UserRole)} className={`${FIELD} px-2.5`}>
                    <option value="instructor">Giảng viên</option>
                    <option value="researcher">Trợ giảng/KTV bộ môn Bào chế</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className={LABEL}>Số điện thoại</label>
                  <div className="relative">
                    <Phone className={ICON} />
                    <input
                      type="text"
                      inputMode="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912..."
                      className={`${FIELD} pl-9 pr-3 font-mono`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL}>
                  Bộ môn / Trung tâm <span className="text-rose-500">*</span>
                </label>
                <select value={regDeptChoice} onChange={(e) => setRegDeptChoice(e.target.value)} className={`${FIELD} px-2.5`}>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {regDeptChoice === 'Khác' && (
                  <input
                    type="text"
                    value={regDeptOther}
                    onChange={(e) => setRegDeptOther(e.target.value)}
                    placeholder="Nhập tên bộ môn / trung tâm"
                    className={`${FIELD} px-2.5 mt-2`}
                    required
                  />
                )}
              </div>

              <div>
                <label className={LABEL}>
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className={ICON} />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete="new-password"
                    required
                    className={`${FIELD} pl-9 pr-3`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className={`${PRIMARY_BTN} mt-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{busy ? 'Đang gửi...' : config.registration === 'open' ? 'Hoàn Tất Đăng Ký & Đăng Nhập' : 'Gửi Đăng Ký'}</span>
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 w-full border-t border-slate-200 dark:border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        <span>© 2026 LabLog Pro · Hệ thống quản lý và nhật ký thiết bị khoa học phòng thí nghiệm</span>
      </footer>
    </div>
  );
};
