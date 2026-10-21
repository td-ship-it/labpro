import React from 'react';

/**
 * Authentic Vector Logos & Seals for:
 * 1. Đại Học Y Dược TP. Hồ Chí Minh (UMP - Thành lập 1947)
 * 2. Trường Dược (Khoa Dược) - Đại học Y Dược TP.HCM (UMPSP)
 * 3. Bộ môn Bào chế - Trường Dược - Đại học Y Dược TP.HCM
 * 4. LabLog Pro (Hệ thống Quản lý Thiết bị Phòng Lab Bộ môn Bào chế)
 */

export interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'icon' | 'badge' | 'horizontal' | 'white';
}

// ============================================================================
// 1. ĐẠI HỌC Y DƯỢC THÀNH PHỐ HỒ CHÍ MINH (UMP - UNIVERSITY OF MEDICINE & PHARMACY AT HCM CITY)
// ============================================================================
export const UmpHcmLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'badge',
}) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs"
    >
      <defs>
        {/* Official UMP Cyan Gradients */}
        <linearGradient id="ump-cyan-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0098A6" />
          <stop offset="50%" stopColor="#00838F" />
          <stop offset="100%" stopColor="#006064" />
        </linearGradient>
        <linearGradient id="ump-inner-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="dna-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0098A6" />
        </linearGradient>
        {/* Circular text paths */}
        <path id="ump-text-path-top" d="M 16,50 A 34,34 0 1,1 84,50" />
      </defs>

      {/* Outer Cyan Rim */}
      <circle cx="50" cy="50" r="48" fill="url(#ump-cyan-rim)" stroke="#004D40" strokeWidth="1.5" />
      {/* Concentric Gold Accent Ring */}
      <circle cx="50" cy="50" r="44.5" stroke="url(#ump-inner-gold)" strokeWidth="1" strokeDasharray="3 1.5" />
      
      {/* Central Clean White Disc */}
      <circle cx="50" cy="50" r="32" fill="#FFFFFF" stroke="#00838F" strokeWidth="1.2" />

      {/* Top Arch Text: ĐẠI HỌC Y DƯỢC TP. HỒ CHÍ MINH */}
      <text fill="#FFFFFF" fontSize="6.2" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">
        <textPath href="#ump-text-path-top" startOffset="50%" textAnchor="middle">
          ĐẠI HỌC Y DƯỢC TP. HỒ CHÍ MINH
        </textPath>
      </text>

      {/* Bottom Year and Stars */}
      <text x="50" y="92.5" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1">
        ★ 1947 ★
      </text>

      {/* Inner Central Emblem: Quyển sách mở */}
      {/* Book base & pages */}
      <path
        d="M 28,62 C 34,58 42,59 50,62 C 58,59 66,58 72,62 L 72,43 C 66,39 58,40 50,43 C 42,40 34,39 28,43 Z"
        fill="#F8FAFC"
        stroke="#00838F"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Central Book Spine */}
      <line x1="50" y1="43" x2="50" y2="62" stroke="#006064" strokeWidth="1.4" />

      {/* Left Page: Chuỗi xoắn kép ADN (Môn Khoa học cơ bản) */}
      <g stroke="url(#dna-grad)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M 33,46 Q 37,49 41,47 Q 45,51 45,58" fill="none" />
        <path d="M 45,46 Q 41,49 37,47 Q 33,51 33,58" fill="none" />
        <line x1="34" y1="47" x2="44" y2="47" strokeWidth="0.8" />
        <line x1="36" y1="50" x2="42" y2="50" strokeWidth="0.8" />
        <line x1="34" y1="53" x2="44" y2="53" strokeWidth="0.8" />
        <line x1="36" y1="56" x2="42" y2="56" strokeWidth="0.8" />
      </g>

      {/* Right Page: Ống nghe y tế Stethoscope (Môn lâm sàng) */}
      <g>
        {/* Binaural eartubes */}
        <path d="M 54,46 C 54,43 57,43 58,46 L 58,49 C 58,52 63,52 63,49 L 63,46 C 64,43 67,43 67,46" fill="none" stroke="#334155" strokeWidth="1.1" strokeLinecap="round" />
        {/* Tubing looping across right page */}
        <path d="M 60.5,50.5 C 60.5,57 68,57 68,52" fill="none" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
        {/* Chestpiece / Diaphragm */}
        <circle cx="68" cy="51" r="2.8" fill="#F59E0B" stroke="#0F172A" strokeWidth="1" />
        <circle cx="68" cy="51" r="1.3" fill="#FFFFFF" />
      </g>

      {/* Ribbon Banner at bottom: VIỆT NAM */}
      <path d="M 36,66 L 64,66 L 61,70 L 39,70 Z" fill="#DC2626" />
      <text x="50" y="69.2" fill="#FFFFFF" fontSize="3.6" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.6">
        VIỆT NAM
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[11px] font-black uppercase tracking-tight text-teal-950">
            ĐẠI HỌC Y DƯỢC TP. HỒ CHÍ MINH
          </span>
          <span className="text-[9.5px] font-semibold text-teal-700">
            University of Medicine & Pharmacy · UMP
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 shadow-2xs ${className}`}>
      {icon}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-black uppercase tracking-wider text-teal-900">
          ĐH Y DƯỢC TP.HCM
        </span>
        <span className="text-[8.5px] font-semibold text-teal-700">
          UMP · Est. 1947
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 2. TRƯỜNG DƯỢC (KHOA DƯỢC) - ĐẠI HỌC Y DƯỢC TP.HCM (UMPSP - SCHOOL OF PHARMACY)
// ============================================================================
export const UmpSchoolOfPharmacyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'badge',
}) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs"
    >
      <defs>
        {/* Pharmacy Emerald & UMP Cyan */}
        <linearGradient id="pharma-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="pharma-cyan-link" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0098A6" />
          <stop offset="100%" stopColor="#007A87" />
        </linearGradient>
        <linearGradient id="hygieia-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="essence-drop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <path id="pharm-text-path-top" d="M 16,50 A 34,34 0 1,1 84,50" />
      </defs>

      {/* Outer Ring: Dual Capsule Joint (Cyan top-left & Emerald bottom-right) */}
      <circle cx="50" cy="50" r="48" fill="url(#pharma-emerald)" stroke="#064E3B" strokeWidth="1.5" />
      {/* Upper arch Cyan overlay */}
      <path
        d="M 2,50 A 48,48 0 0,1 98,50 Z"
        fill="url(#pharma-cyan-link)"
      />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />

      {/* White inner disc */}
      <circle cx="50" cy="50" r="33" fill="#FFFFFF" stroke="#059669" strokeWidth="1.2" />

      {/* Top Text: TRƯỜNG DƯỢC - ĐH Y DƯỢC TP.HCM */}
      <text fill="#FFFFFF" fontSize="6" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.6">
        <textPath href="#pharm-text-path-top" startOffset="50%" textAnchor="middle">
          TRƯỜNG DƯỢC · ĐH Y DƯỢC TP.HCM
        </textPath>
      </text>

      {/* Bottom Abbreviation Text */}
      <text x="50" y="93" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="1.2">
        UMPSP · PHARMACY
      </text>

      {/* Centerpiece: Chén Hygeia (Bowl of Hygieia & Serpent of Healing) */}
      {/* Bowl Chalice Base */}
      <ellipse cx="50" cy="69" rx="10" ry="2.5" fill="url(#hygieia-gold)" stroke="#B45309" strokeWidth="0.8" />
      <path d="M 48,69 L 48,58 L 52,58 L 52,69 Z" fill="url(#hygieia-gold)" />
      
      {/* Chalice Cup (Ly thuốc) */}
      <path
        d="M 37,45 C 37,56 43,60 50,60 C 57,60 63,56 63,45 L 61,43 L 39,43 Z"
        fill="url(#hygieia-gold)"
        stroke="#B45309"
        strokeWidth="1.2"
      />
      <ellipse cx="50" cy="43" rx="11" ry="3.2" fill="#FEF3C7" stroke="#B45309" strokeWidth="1" />

      {/* Serpent of Epidaurus coiling around the chalice */}
      <path
        d="M 50,68 C 45,67 43,62 46,58 C 49,54 55,54 53,49 C 51,44 43,43 43,36 C 43,30 49,27 54,28 C 58,29 60,33 58,36 C 57,38 54,38 53,37"
        fill="none"
        stroke="#047857"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Serpent head looking into chalice */}
      <circle cx="53" cy="37" r="2.2" fill="#047857" />
      <circle cx="54.2" cy="36.4" r="0.6" fill="#FBBF24" />

      {/* Pure Medicinal Essence Droplet falling from serpent mouth into cup */}
      {/* Lotus bud / flame-shaped triple droplet */}
      <path
        d="M 50,39 C 48,41 48,43 50,45 C 52,43 52,41 50,39 Z"
        fill="url(#essence-drop)"
      />

      {/* V-shaped Particle Wave (Victory, Knowledge & Vietnam) */}
      <path d="M 34,35 L 40,43 M 66,35 L 60,43" stroke="#059669" strokeWidth="1" strokeDasharray="1 1" />
      <circle cx="34" cy="35" r="1.2" fill="#059669" />
      <circle cx="66" cy="35" r="1.2" fill="#0098A6" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[11px] font-black uppercase tracking-tight text-emerald-950">
            TRƯỜNG DƯỢC · KHOA DƯỢC
          </span>
          <span className="text-[9.5px] font-semibold text-emerald-700">
            Đại học Y Dược TP.HCM · UMPSP
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 shadow-2xs ${className}`}>
      {icon}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
          TRƯỜNG DƯỢC (KHOA DƯỢC)
        </span>
        <span className="text-[8.5px] font-semibold text-emerald-700">
          UMPSP · ĐH Y Dược TP.HCM
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 3. BỘ MÔN BÀO CHẾ - TRƯỜNG DƯỢC - ĐẠI HỌC Y DƯỢC TP.HCM
// (DEPARTMENT OF PHARMACEUTICS & BIOPHARMACEUTICS)
// ============================================================================
export const BaocheDeptLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'badge',
}) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs"
    >
      <defs>
        {/* Department Colors: Deep Slate-Emerald & Royal Amber */}
        <linearGradient id="bc-gradient-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#065F46" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id="bc-mortar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="bc-capsule-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="bc-capsule-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <path id="bc-text-path-top" d="M 16,50 A 34,34 0 1,1 84,50" />
      </defs>

      {/* Outer Rim */}
      <circle cx="50" cy="50" r="48" fill="url(#bc-gradient-rim)" stroke="#064E3B" strokeWidth="1.5" />
      {/* Precision measurement ticks */}
      <circle cx="50" cy="50" r="44" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2.5 1.5" />

      {/* Clean White Inner Core */}
      <circle cx="50" cy="50" r="33" fill="#FFFFFF" stroke="#047857" strokeWidth="1.2" />

      {/* Top Arch Text: BỘ MÔN BÀO CHẾ */}
      <text fill="#FFFFFF" fontSize="6.4" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">
        <textPath href="#bc-text-path-top" startOffset="50%" textAnchor="middle">
          BỘ MÔN BÀO CHẾ · TRƯỜNG DƯỢC
        </textPath>
      </text>

      {/* Bottom Subtitle Text */}
      <text x="50" y="93" fill="#FFFFFF" fontSize="6.2" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.8">
        PHARMACEUTICS · UMP
      </text>

      {/* Central Pharmaceutics Emblems */}

      {/* 1. Traditional Mortar & Pestle (Cối và Chày sứ nghiền thuốc) */}
      {/* Mortar Body */}
      <path
        d="M 31,52 C 31,64 40,68 50,68 C 60,68 69,64 69,52 L 67,50 L 33,50 Z"
        fill="url(#bc-mortar)"
        stroke="#0F172A"
        strokeWidth="1.2"
      />
      {/* Mortar Rim */}
      <ellipse cx="50" cy="50" rx="18" ry="4" fill="#475569" stroke="#0F172A" strokeWidth="1" />
      {/* Mortar Base foot */}
      <rect x="42" y="68" width="16" height="2.5" rx="1" fill="#1E293B" />

      {/* Pestle (Chày giã nghiền dược chất) positioned diagonally */}
      <path
        d="M 40,32 L 46,30 L 58,54 L 52,56 Z"
        fill="#94A3B8"
        stroke="#0F172A"
        strokeWidth="1"
      />
      <circle cx="43" cy="31" r="3" fill="#64748B" stroke="#0F172A" strokeWidth="1" />

      {/* 2. Modern Drug Delivery Capsule (Viên nang bào chế công nghệ cao mở tỏa dược chất) */}
      {/* Left half: Cyan */}
      <rect x="34" y="38" width="10" height="6" rx="3" transform="rotate(-25 34 38)" fill="url(#bc-capsule-cyan)" stroke="#0369A1" strokeWidth="0.8" />
      {/* Right half: Gold Amber */}
      <rect x="58" y="34" width="10" height="6" rx="3" transform="rotate(25 58 34)" fill="url(#bc-capsule-gold)" stroke="#B45309" strokeWidth="0.8" />

      {/* Micro-pellets / Nano-particles dispersing into formulation */}
      <circle cx="47" cy="42" r="1.2" fill="#0098A6" />
      <circle cx="50" cy="40" r="1.4" fill="#F59E0B" />
      <circle cx="53" cy="43" r="1.2" fill="#10B981" />
      <circle cx="49" cy="46" r="1.3" fill="#0284C7" />

      {/* Leaf of Medicinal Plant (Cành thảo dược thiên nhiên) */}
      <path
        d="M 64,48 C 69,45 71,40 71,40 C 71,40 67,41 63,45 C 60,48 61,50 64,48 Z"
        fill="#10B981"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[11px] font-black uppercase tracking-tight text-emerald-950">
            BỘ MÔN BÀO CHẾ
          </span>
          <span className="text-[9.5px] font-semibold text-emerald-700">
            Khoa Dược · ĐH Y Dược TP.HCM
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 shadow-2xs ${className}`}>
      {icon}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
          BỘ MÔN BÀO CHẾ
        </span>
        <span className="text-[8.5px] font-semibold text-amber-700">
          Trường Dược · ĐH Y Dược TP.HCM
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 4. BỘ 3 LOGO HỌC THUẬT CHÍNH THỨC (TRIPLET ACADEMIC HEADER BADGES)
// Đại Học Y Dược TP.HCM · Trường Dược · Bộ Môn Bào Chế
// ============================================================================
export const AcademicHeaderBadges: React.FC<{
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  textColor?: 'dark' | 'light';
}> = ({
  className = '',
  compact = false,
  showLabels = true,
  textColor = 'dark',
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div title="Đại học Y Dược TP. Hồ Chí Minh (UMP)">
          <UmpHcmLogo size={24} variant="icon" />
        </div>
        <div title="Trường Dược - ĐH Y Dược TP.HCM (UMPSP)">
          <UmpSchoolOfPharmacyLogo size={24} variant="icon" />
        </div>
        <div title="Bộ môn Bào chế - Trường Dược - ĐH Y Dược TP.HCM">
          <BaocheDeptLogo size={24} variant="icon" />
        </div>
      </div>
    );
  }

  const isLight = textColor === 'light';

  return (
    <div className={`flex items-center gap-2 sm:gap-3 flex-wrap ${className}`}>
      {/* 1. UMP */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl transition-shadow ${
          isLight
            ? 'bg-slate-800/80 border border-slate-700 text-slate-100'
            : 'bg-teal-50/90 border border-teal-200 text-teal-950 shadow-2xs'
        }`}
        title="Đại học Y Dược TP. Hồ Chí Minh (Thành lập 1947)"
      >
        <UmpHcmLogo size={26} variant="icon" />
        {showLabels && (
          <div className="flex flex-col text-left leading-none">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-teal-300' : 'text-teal-900'}`}>
              ĐH Y DƯỢC TP.HCM
            </span>
            <span className={`text-[8.5px] font-medium mt-0.5 ${isLight ? 'text-slate-400' : 'text-teal-700'}`}>
              UMP · 1947
            </span>
          </div>
        )}
      </div>

      {/* 2. Trường Dược */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl transition-shadow ${
          isLight
            ? 'bg-slate-800/80 border border-slate-700 text-slate-100'
            : 'bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-2xs'
        }`}
        title="Trường Dược (Khoa Dược) - Đại học Y Dược TP.HCM"
      >
        <UmpSchoolOfPharmacyLogo size={26} variant="icon" />
        {showLabels && (
          <div className="flex flex-col text-left leading-none">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-emerald-300' : 'text-emerald-900'}`}>
              TRƯỜNG DƯỢC
            </span>
            <span className={`text-[8.5px] font-medium mt-0.5 ${isLight ? 'text-slate-400' : 'text-emerald-700'}`}>
              UMPSP · Khoa Dược
            </span>
          </div>
        )}
      </div>

      {/* 3. Bộ môn Bào chế */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl transition-shadow ${
          isLight
            ? 'bg-slate-800/80 border border-slate-700 text-slate-100'
            : 'bg-amber-50/90 border border-amber-200 text-amber-950 shadow-2xs'
        }`}
        title="Bộ môn Bào chế - ĐH Y Dược TP.HCM"
      >
        <BaocheDeptLogo size={26} variant="icon" />
        {showLabels && (
          <div className="flex flex-col text-left leading-none">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-amber-300' : 'text-amber-900'}`}>
              BỘ MÔN BÀO CHẾ
            </span>
            <span className={`text-[8.5px] font-medium mt-0.5 ${isLight ? 'text-slate-400' : 'text-amber-700'}`}>
              Pharmaceutics Dept.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 5. LABLOG PRO SOFTWARE LOGO
// ============================================================================
export const LabLogProLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  variant = 'full',
}) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="llp-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0098A6" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="llp-grad-glow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Outer Hexagonal Shield */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#llp-grad-primary)" />

      {/* Precision Geometric Grid lines */}
      <path d="M12 24H36M24 12V36" stroke="white" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="2 2" />
      <circle cx="24" cy="24" r="16" stroke="white" strokeWidth="0.75" strokeOpacity="0.15" />

      {/* Stylized Modern Scientific Flask */}
      <path
        d="M21 12H27V18L33.5 29.5C34.5 31.2 33.3 33.5 31.3 33.5H16.7C14.7 33.5 13.5 31.2 14.5 29.5L21 18V12Z"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Liquid Wave inside flask */}
      <path
        d="M17.5 28C19.5 26.5 22 29 25 27.5C27.5 26 29.5 27 30.5 28L31.3 29.5C31.5 29.8 31.2 30.5 30.5 30.5H17.5C16.8 30.5 16.5 29.8 16.7 29.5L17.5 28Z"
        fill="url(#llp-grad-glow)"
      />
      {/* Bubbles */}
      <circle cx="21" cy="24" r="1.5" fill="white" fillOpacity="0.9" />
      <circle cx="26" cy="22" r="1" fill="white" fillOpacity="0.7" />
      <circle cx="24" cy="18" r="1.2" fill="#38BDF8" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-base font-extrabold tracking-tight text-slate-900">LabLog</span>
          <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-2xs">
            BÀO CHẾ
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 tracking-tight mt-0.5 truncate max-w-[210px]">
          Bộ Môn Bào Chế · ĐH Y Dược TP.HCM
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 6. PHARMACEUTICAL QUALITY & LAB COMPLIANCE BADGES (DƯỢC ĐIỂN VN V & ISO/IEC 17025)
// ============================================================================
export const VilasLogo: React.FC<LogoProps> = ({
  className = '',
  size = 30,
  variant = 'badge',
}) => {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect x="2" y="2" width="40" height="40" rx="8" fill="#0284C7" stroke="#0369A1" strokeWidth="1.5" />
      <rect x="4.5" y="4.5" width="35" height="35" rx="6" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
      <text x="22" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">
        VILAS
      </text>
      <text x="22" y="27" textAnchor="middle" fill="#BAE6FD" fontSize="8" fontWeight="800" fontFamily="monospace">
        886
      </text>
      <text x="22" y="35" textAnchor="middle" fill="white" fontSize="6" fontWeight="700" fontFamily="sans-serif">
        ISO/IEC 17025
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-950 ${className}`}>
      {icon}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-extrabold text-sky-900 tracking-tight">VILAS 886</span>
        <span className="text-[8px] font-semibold text-sky-700">Chuẩn Thử Nghiệm VN</span>
      </div>
    </div>
  );
};

export const Iso17025Badge: React.FC<LogoProps> = ({
  className = '',
  size = 30,
  variant = 'badge',
}) => {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect x="2" y="2" width="40" height="40" rx="9" fill="#047857" stroke="#059669" strokeWidth="1.5" />
      <circle cx="22" cy="17" r="9" fill="#10B981" fillOpacity="0.25" stroke="#34D399" strokeWidth="1" />
      <path d="M18 17L21 20L26 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="22" y="32" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">
        ISO 17025
      </text>
      <text x="22" y="38" textAnchor="middle" fill="#A7F3D0" fontSize="5.5" fontWeight="700" fontFamily="sans-serif">
        ACCREDITED
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 ${className}`}>
      {icon}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-extrabold text-emerald-900 tracking-tight">ISO/IEC 17025</span>
        <span className="text-[8px] font-semibold text-emerald-700">Dược Điển VN V / USP</span>
      </div>
    </div>
  );
};

// Aliases for compatibility if anything references previous names
export const VnuInstituteLogo = UmpHcmLogo;
export const AccreditationHeaderStrip = AcademicHeaderBadges;
