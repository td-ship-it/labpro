import { Equipment, MachineCondition, UsageLog, User } from '../types';

/**
 * Các trường có thể chọn khi xuất file Excel (CSV) báo cáo sử dụng thiết bị.
 * Mỗi trường là MỘT cột riêng trong bảng. Admin chọn trường nào thì xuất trường đó.
 */
export interface UsageExportField {
  key: string;
  label: string;
  value: (log: UsageLog, eq?: Equipment, user?: User) => string | number;
}

const cond = (c?: MachineCondition) => {
  switch (c) {
    case 'good': return 'Tốt / Bình thường';
    case 'minor_wear': return 'Hao mòn nhẹ';
    case 'needs_calibration': return 'Cần hiệu chuẩn';
    case 'damaged': return 'Hỏng / Sự cố';
    default: return 'Chưa ghi nhận';
  }
};

const time = (iso?: string) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');

export const USAGE_EXPORT_FIELDS: UsageExportField[] = [
  { key: 'stt', label: 'STT', value: () => '' }, // điền theo thứ tự dòng khi xuất
  { key: 'logId', label: 'Mã nhật ký', value: (l) => l.id },
  { key: 'eqCode', label: 'Mã thiết bị', value: (l, e) => e?.code || l.equipmentId },
  { key: 'eqName', label: 'Tên thiết bị', value: (_l, e) => e?.name || '' },
  { key: 'room', label: 'Phòng Lab', value: (_l, e) => e?.room || '' },
  { key: 'operator', label: 'Người vận hành', value: (l, _e, u) => u?.name || l.userId },
  { key: 'dept', label: 'Bộ môn / Trung tâm', value: (_l, _e, u) => u?.department || '' },
  { key: 'project', label: 'Mã đề tài', value: (l) => l.projectCode || '' },
  { key: 'checkIn', label: 'Thời điểm check-in', value: (l) => time(l.checkInTime) },
  { key: 'checkOut', label: 'Thời điểm check-out', value: (l) => (l.checkOutTime ? time(l.checkOutTime) : 'Đang chạy') },
  { key: 'duration', label: 'Thời gian dùng (phút)', value: (l) => l.durationMinutes || 0 },
  { key: 'samples', label: 'Số lượng mẫu', value: (l) => l.sampleCount || 0 },
  { key: 'initCond', label: 'Tình trạng trước khi dùng', value: (l) => cond(l.initialCondition) },
  { key: 'finalCond', label: 'Tình trạng sau khi dùng', value: (l) => cond(l.finalCondition) },
  { key: 'incident', label: 'Có sự cố không', value: (l) => (l.incidentReport?.hasIncident ? 'CÓ SỰ CỐ' : 'Bình thường') },
  { key: 'severity', label: 'Mức độ sự cố', value: (l) => l.incidentReport?.severity || 'Không' },
  { key: 'incidentDesc', label: 'Mô tả sự cố', value: (l) => l.incidentReport?.description || '' },
  { key: 'notes', label: 'Ghi chú vận hành', value: (l) => l.operatorNotes || '' },
];

export const DEFAULT_USAGE_FIELDS = USAGE_EXPORT_FIELDS.map((f) => f.key);

const FIELDS_KEY = 'lablog_export_usage_fields';

export function loadUsageFieldPrefs(): string[] {
  try {
    const raw = localStorage.getItem(FIELDS_KEY);
    if (!raw) return DEFAULT_USAGE_FIELDS;
    const keys = JSON.parse(raw) as string[];
    const valid = keys.filter((k) => DEFAULT_USAGE_FIELDS.includes(k));
    return valid.length ? valid : DEFAULT_USAGE_FIELDS;
  } catch {
    return DEFAULT_USAGE_FIELDS;
  }
}

export function saveUsageFieldPrefs(keys: string[]): void {
  try {
    localStorage.setItem(FIELDS_KEY, JSON.stringify(keys));
  } catch {
    // trình duyệt chặn lưu trữ: vẫn xuất được trong phiên này
  }
}

/** Ô CSV: bọc dấu nháy, nhân đôi dấu nháy bên trong. Ô số giữ nguyên. */
const cell = (v: string | number) => (typeof v === 'number' ? String(v) : `"${String(v).replace(/"/g, '""')}"`);

/**
 * Tạo file CSV mở được bằng Excel ở mọi máy: dòng đầu "sep=;" để Excel dùng dấu chấm phẩy
 * (máy kiểu Việt Nam dùng ";" làm dấu phân cách, nếu không mọi cột sẽ dồn vào một ô),
 * có BOM UTF-8 để giữ tiếng Việt.
 */
export function buildUsageCsv(params: {
  logs: UsageLog[];
  eqMap: Map<string, Equipment>;
  userMap: Map<string, User>;
  fields: string[];
  summary: string[][];
}): string {
  const { logs, eqMap, userMap, summary } = params;
  const fields = USAGE_EXPORT_FIELDS.filter((f) => params.fields.includes(f.key));
  const lines: string[] = ['sep=;'];
  summary.forEach((row) => lines.push(row.map(cell).join(';')));
  lines.push('');
  lines.push(fields.map((f) => cell(f.label)).join(';'));
  logs.forEach((log, idx) => {
    const eq = eqMap.get(log.equipmentId);
    const u = userMap.get(log.userId);
    lines.push(fields.map((f) => (f.key === 'stt' ? cell(idx + 1) : cell(f.value(log, eq, u)))).join(';'));
  });
  return '﻿' + lines.join('\r\n');
}
