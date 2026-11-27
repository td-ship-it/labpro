import type { Equipment } from '../types';

/**
 * Thông tin mặc định áp dụng theo loại thiết bị. Admin có thể điều chỉnh riêng cho từng máy
 * (trường purposeOptions / checklistItems); nếu máy chưa được điều chỉnh thì dùng mặc định dưới đây.
 */
const PURPOSE_BY_CATEGORY: Record<string, string[]> = {
  'Quang phổ & Quang học': ['Xây dựng đường chuẩn', 'Đo độ hấp thu', 'Thẩm định quy trình'],
  'Sắc ký & Khối phổ': ['Định lượng hoạt chất', 'Xây dựng phương pháp phân tích', 'Thẩm định quy trình'],
  'Kính hiển vi & Hình ảnh': ['Quan sát mẫu', 'Chụp ảnh / phân tích hình thái', 'Đo kích thước hạt'],
  'Sinh học phân tử & Ly tâm': ['Ly tâm mẫu', 'Chuẩn bị mẫu sinh học', 'Thử nghiệm độ hòa tan'],
};

const DEFAULT_PURPOSES = ['Đo mẫu phân tích', 'Thẩm định quy trình'];

export const DEFAULT_CHECKLIST = [
  'Đã tắt thiết bị và đèn (nếu có)',
  'Lau khô buồng mẫu / vệ sinh khu vực đo',
  'Khóa van khí an toàn (nếu có)',
  'Tắt thiết bị phụ trợ (bơm, nguồn khí, máy tính)',
];

/** Các mục đích thả chọn của thiết bị (đã điều chỉnh hoặc mặc định theo loại). */
export function purposeOptionsOf(eq?: Pick<Equipment, 'category' | 'purposeOptions'>): string[] {
  if (eq?.purposeOptions && eq.purposeOptions.length > 0) return eq.purposeOptions;
  return (eq && PURPOSE_BY_CATEGORY[eq.category]) || DEFAULT_PURPOSES;
}

/** Danh mục tick chọn khi hoàn tất ca của thiết bị. */
export function checklistOf(eq?: Pick<Equipment, 'checklistItems'>): string[] {
  return eq?.checklistItems && eq.checklistItems.length > 0 ? eq.checklistItems : DEFAULT_CHECKLIST;
}
