import React from 'react';
import { EquipmentCategory } from '../types';
import { Microscope, Activity, Eye, Dna, Flame, Gauge } from 'lucide-react';

interface EquipmentVisualProps {
  category: EquipmentCategory;
  code: string;
  className?: string;
}

export const EquipmentVisual: React.FC<EquipmentVisualProps> = ({ category, code, className = 'h-36' }) => {
  const getVisualConfig = () => {
    switch (category) {
      case 'Kính hiển vi & Hình ảnh':
        return {
          icon: <Microscope className="w-8 h-8 text-indigo-600" />,
          bg: 'from-indigo-50 to-slate-100',
          accent: 'border-indigo-200',
          tag: 'Electron Optics / EDS Detector',
        };
      case 'Sắc ký & Khối phổ':
        return {
          icon: <Activity className="w-8 h-8 text-emerald-600" />,
          bg: 'from-emerald-50 to-slate-100',
          accent: 'border-emerald-200',
          tag: 'GC Column / Quadrupole MS',
        };
      case 'Quang phổ & Quang học':
        return {
          icon: <Eye className="w-8 h-8 text-blue-600" />,
          bg: 'from-blue-50 to-slate-100',
          accent: 'border-blue-200',
          tag: 'Dual Beam UV-Vis / Peltier Cell',
        };
      case 'Sinh học phân tử & Ly tâm':
        return {
          icon: <Dna className="w-8 h-8 text-teal-600" />,
          bg: 'from-teal-50 to-slate-100',
          accent: 'border-teal-200',
          tag: 'Rotor Centrifuge / Real-Time Optical',
        };
      case 'Nhiệt & Phân tích vật liệu':
        return {
          icon: <Flame className="w-8 h-8 text-amber-600" />,
          bg: 'from-amber-50 to-slate-100',
          accent: 'border-amber-200',
          tag: 'TGA/DSC Microbalance 1100°C',
        };
      default:
        return {
          icon: <Gauge className="w-8 h-8 text-slate-600" />,
          bg: 'from-slate-50 to-slate-100',
          accent: 'border-slate-200',
          tag: 'Calibrated Precision Meter',
        };
    }
  };

  const config = getVisualConfig();

  return (
    <div className={`w-full ${className} rounded-lg bg-gradient-to-br ${config.bg} border ${config.accent} p-4 flex flex-col justify-between relative overflow-hidden`}>
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 rounded-full bg-white/40 blur-xs pointer-events-none" />
      <div className="flex items-start justify-between z-10">
        <div className="p-2.5 bg-white rounded-lg shadow-2xs border border-slate-200/60">
          {config.icon}
        </div>
        <span className="font-mono text-[11px] font-semibold text-slate-600 px-2 py-0.5 bg-white/80 rounded border border-slate-200/80">
          {code}
        </span>
      </div>

      <div className="z-10 mt-auto">
        <span className="text-[11px] font-mono text-slate-500 block truncate">
          {config.tag}
        </span>
      </div>
    </div>
  );
};
