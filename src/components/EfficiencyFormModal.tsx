import React, { useMemo, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Equipment, UsageLog } from '../types';

interface EfficiencyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  logs: UsageLog[];
  startDate: string;
  endDate: string;
  labName?: string;
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

/** Bảng đánh giá hiệu quả sử dụng thiết bị: số liệu tính sẵn từ nhật ký, người dùng có thể sửa trước khi in. */
export const EfficiencyFormModal: React.FC<EfficiencyFormModalProps> = ({ isOpen, onClose, equipment, logs, startDate, endDate }) => {
  const auto = useMemo(() => {
    if (!equipment) return null;
    const list = logs.filter((l) => {
      if (l.equipmentId !== equipment.id) return false;
      const d = l.checkInTime.split('T')[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
    const days = new Set(list.map((l) => l.checkInTime.split('T')[0]));
    const months = new Set(list.map((l) => l.checkInTime.slice(0, 7)));
    const totalHours = list.reduce((s, l) => s + (l.durationMinutes || 0), 0) / 60;
    const dates = [...days].sort();
    const first = startDate || dates[0];
    const last = endDate || dates[dates.length - 1];
    const spanMonths = first && last
      ? Math.max(1, (new Date(last).getTime() - new Date(first).getTime()) / (30.4 * 86400000))
      : 1;
    const incidents = list.filter((l) => l.incidentReport?.hasIncident).length;
    return {
      hoursPerDay: days.size ? round1(totalHours / days.size) : '0',
      daysPerMonth: String(Math.round(days.size / spanMonths)),
      monthsPerYear: String(Math.min(12, Math.round((months.size / spanMonths) * 12))),
      stable: incidents === 0 ? 'Có' : 'Không',
      effective: days.size > 0 ? 'Có' : 'Không',
      sessions: list.length,
      period: `${first || '---'} → ${last || '---'}`,
    };
  }, [equipment, logs, startDate, endDate]);

  const [form, setForm] = useState<{ hoursPerDay: string; daysPerMonth: string; monthsPerYear: string; stable: string; effective: string } | null>(null);
  const [lastKey, setLastKey] = useState<string>('');
  const key = `${equipment?.id}|${auto?.period}|${auto?.sessions}`;
  if (auto && key !== lastKey) {
    setLastKey(key);
    setForm({ hoursPerDay: auto.hoursPerDay, daysPerMonth: auto.daysPerMonth, monthsPerYear: auto.monthsPerYear, stable: auto.stable, effective: auto.effective });
  }

  if (!isOpen || !equipment || !auto || !form) return null;

  const handlePrint = () => {
    document.body.classList.add('print-only-target');
    const done = () => {
      document.body.classList.remove('print-only-target');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  const field = 'inline-block min-w-[3.5rem] border-b border-dotted border-slate-500 text-center';
  const YesNo = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <span className="inline-flex gap-3 print:gap-2">
      {['Có', 'Không'].map((opt) => (
        <label key={opt} className="inline-flex items-center gap-1 cursor-pointer">
          <input type="radio" className="print:hidden" checked={value === opt} onChange={() => onChange(opt)} />
          <span className="hidden print:inline-block w-3.5 h-3.5 border border-black text-center leading-none">{value === opt ? '✓' : ''}</span>
          <span>{opt}</span>
        </label>
      ))}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 print:border-none print:shadow-none print:max-w-none">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-2xl print:hidden">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Bảng đánh giá hiệu quả sử dụng thiết bị</h3>
            <p className="text-xs text-slate-500">Số liệu tính từ nhật ký ({auto.sessions} ca, {auto.period}). Có thể sửa trước khi in.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <Printer className="w-3.5 h-3.5" /> In / Lưu PDF
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 sm:p-10 print:p-0">
          <div id="printable-efficiency" className="bg-white text-black font-serif text-[15px] leading-relaxed mx-auto max-w-[680px] print:max-w-none">
            <div className="flex justify-between items-start text-center text-sm">
              <div className="w-1/2">
                <div>ĐẠI HỌC Y DƯỢC</div>
                <div>THÀNH PHỐ HỒ CHÍ MINH</div>
                <div className="font-bold underline underline-offset-4">TRƯỜNG DƯỢC</div>
              </div>
              <div className="w-1/2">
                <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center font-bold text-lg mt-10">BẢNG ĐÁNH GIÁ HIỆU QUẢ SỬ DỤNG</div>
            <div className="mt-6">
              <span className="font-bold">Hạng mục:</span> {equipment.name}. Hãng sản xuất {equipment.manufacturer || '......'}.
            </div>

            <table className="w-full mt-6 border-collapse text-[15px]">
              <tbody>
                <tr>
                  <td className="py-2 pr-2 align-top whitespace-nowrap">+ Tần suất sử dụng:</td>
                  <td className="py-2">
                    số giờ/ngày <input value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })} className={`${field} bg-transparent outline-none print:border-none`} />
                    {'  '}số ngày/tháng <input value={form.daysPerMonth} onChange={(e) => setForm({ ...form, daysPerMonth: e.target.value })} className={`${field} bg-transparent outline-none print:border-none`} />
                    {'  '}số tháng/năm <input value={form.monthsPerYear} onChange={(e) => setForm({ ...form, monthsPerYear: e.target.value })} className={`${field} bg-transparent outline-none print:border-none`} />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 align-top">+ Tính ổn định thiết bị:</td>
                  <td className="py-2"><YesNo value={form.stable} onChange={(v) => setForm({ ...form, stable: v })} /></td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 align-top">+ Hiệu quả sử dụng:</td>
                  <td className="py-2"><YesNo value={form.effective} onChange={(v) => setForm({ ...form, effective: v })} /></td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end mt-14 text-center">
              <div className="w-1/2">
                <div className="font-bold">XÁC NHẬN CỦA ĐƠN VỊ ĐÁNH GIÁ</div>
                <div className="italic text-sm">(Ký, ghi rõ họ tên và đóng dấu)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
