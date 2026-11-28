/**
 * Chế độ hiển thị Sáng / Tối / Theo thiết bị.
 * Lựa chọn lưu trong localStorage (nếu trình duyệt cho phép); mặc định theo thiết bị.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'lablog-theme';
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* trình duyệt chặn localStorage: dùng mặc định */
  }
  return 'system';
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && !!media?.matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* bỏ qua: chỉ mất việc ghi nhớ lựa chọn */
  }
  applyTheme(choice);
}

/** Gọi một lần khi khởi động ứng dụng. */
export function initTheme() {
  applyTheme(getThemeChoice());
  media?.addEventListener?.('change', () => {
    if (getThemeChoice() === 'system') applyTheme('system');
  });
}
