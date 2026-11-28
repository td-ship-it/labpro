import React, { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemeChoice, getThemeChoice, setThemeChoice } from '../services/theme';

const OPTIONS: { value: ThemeChoice; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo thiết bị', icon: Monitor },
];

/** Nút chọn chế độ Sáng / Tối / Theo thiết bị. */
export const ThemeSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [choice, setChoice] = useState<ThemeChoice>(() => getThemeChoice());

  const pick = (value: ThemeChoice) => {
    setChoice(value);
    setThemeChoice(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Chế độ hiển thị"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            title={label}
            onClick={() => pick(value)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              on
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

/** Nút biểu tượng đổi nhanh giữa Sáng và Tối (dùng trên thanh đầu trang). */
export const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [dark, setDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));

  const toggle = () => {
    const next: ThemeChoice = dark ? 'light' : 'dark';
    setThemeChoice(next);
    setDark(next === 'dark');
  };

  const Icon = dark ? Sun : Moon;
  const label = dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`p-2 rounded-lg border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors ${className}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
