import React from 'react';
import { Bot, Sparkles, Globe } from 'lucide-react';

interface GeminiFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const GeminiFloatingButton: React.FC<GeminiFloatingButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 group">
      <button
        onClick={onClick}
        className="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/40 backdrop-blur-sm cursor-pointer"
        title="Mở Trợ lý AI phòng Lab"
        aria-label="Trợ lý AI"
      >
        {/* Animated pulse halo */}
        <span className="absolute -inset-1 rounded-full bg-blue-500/30 blur-sm animate-pulse pointer-events-none group-hover:bg-blue-400/50" />

        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/20 border border-white/30 text-cyan-200 shadow-inner">
          <Bot className="w-4 h-4" />
        </div>

        <div className="relative text-left hidden sm:block">
          <div className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-white leading-tight">
            <span>Trợ Lý AI</span>
            <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
          </div>
          <div className="text-[10px] text-cyan-100 font-medium flex items-center gap-1 leading-tight">
            <Globe className="w-2.5 h-2.5 text-emerald-300" />
            <span>Hỏi đáp SOP & thiết bị</span>
          </div>
        </div>

        {/* Small badge for mobile */}
        <span className="relative sm:hidden flex items-center text-xs font-bold">
          AI
        </span>

        {/* Live indicator dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      </button>
    </div>
  );
};
