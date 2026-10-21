import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentCategory } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentToEdit?: Equipment | null;
  onSave: (eq: Equipment) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  equipmentToEdit,
  onSave,
}) => {
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<EquipmentCategory>('Quang phổ & Quang học');
  const [room, setRoom] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [specs, setSpecs] = useState<string>('');
  const [safetyGuidelines, setSafetyGuidelines] = useState<string>('');
  const [maxHours, setMaxHours] = useState<number>(4);
  const [responsibleStaff, setResponsibleStaff] = useState<string>('');
  const [status, setStatus] = useState<Equipment['status']>('available');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (equipmentToEdit) {
      setCode(equipmentToEdit.code);
      setName(equipmentToEdit.name);
      setCategory(equipmentToEdit.category);
      setRoom(equipmentToEdit.room);
      setBuilding(equipmentToEdit.building);
      setManufacturer(equipmentToEdit.manufacturer);
      setModel(equipmentToEdit.model);
      setSpecs(equipmentToEdit.specs);
      setSafetyGuidelines(equipmentToEdit.safetyGuidelines);
      setMaxHours(equipmentToEdit.maxBookingHoursPerSession);
      setResponsibleStaff(equipmentToEdit.responsibleStaff);
      setStatus(equipmentToEdit.status);
    } else {
      setCode(`LAB-EQ-${Math.floor(10 + Math.random() * 90)}`);
      setName('');
      setCategory('Quang phổ & Quang học');
      setRoom('Phòng 201');
      setBuilding('Nhà Thí nghiệm Trung tâm');
      setManufacturer('');
      setModel('');
      setSpecs('');
      setSafetyGuidelines('Tuân thủ nghiêm ngặt quy định phòng thí nghiệm và bảo hộ lao động cá nhân.');
      setMaxHours(4);
      setResponsibleStaff('');
      setStatus('available');
    }
    setErrorMsg(null);
  }, [equipmentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Vui lòng điền mã thiết bị và tên thiết bị.');
      return;
    }

    const newOrUpdated: Equipment = {
      id: equipmentToEdit ? equipmentToEdit.id : `eq-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category,
      room: room.trim() || 'Phòng Thí nghiệm Trung tâm',
      building: building.trim() || 'Tòa nhà Thí nghiệm',
      manufacturer: manufacturer.trim() || 'Hãng sản xuất',
      model: model.trim() || 'Tiêu chuẩn',
      specs: specs.trim() || 'Thông số kỹ thuật tiêu chuẩn phòng lab',
      safetyGuidelines: safetyGuidelines.trim(),
      maxBookingHoursPerSession: Number(maxHours) || 4,
      responsibleStaff: responsibleStaff.trim() || 'Quản lý phòng máy',
      status,
    };

    onSave(newOrUpdated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {equipmentToEdit ? 'Chỉnh Sửa Thông Số Thiết Bị' : 'Thêm Thiết Bị Phòng Thí Nghiệm Mới'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quyền quản trị viên: Thiết lập danh mục và định mức sử dụng
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã thiết bị (Lab Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: LAB-SEM-01"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phân loại thiết bị <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="Quang phổ & Quang học">Quang phổ & Quang học</option>
                <option value="Sắc ký & Khối phổ">Sắc ký & Khối phổ</option>
                <option value="Kính hiển vi & Hình ảnh">Kính hiển vi & Hình ảnh</option>
                <option value="Sinh học phân tử & Ly tâm">Sinh học phân tử & Ly tâm</option>
                <option value="Nhiệt & Phân tích vật liệu">Nhiệt & Phân tích vật liệu</option>
                <option value="Đo lường & Phân tích cơ bản">Đo lường & Phân tích cơ bản</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên thiết bị khoa học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Kính hiển vi điện tử quét phát xạ trường FE-SEM"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hãng sản xuất / Quốc gia
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="VD: JEOL (Nhật Bản)"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model / Dòng máy
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="VD: JSM-7610FPlus"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phòng đặt máy
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="VD: Phòng 302"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tòa nhà / Khu thí nghiệm
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="VD: Nhà Hóa - Vật liệu (Tòa C)"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời lượng tối đa mỗi ca (giờ)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={maxHours}
                onChange={(e) => setMaxHours(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhân viên / KTV phụ trách
              </label>
              <input
                type="text"
                value={responsibleStaff}
                onChange={(e) => setResponsibleStaff(e.target.value)}
                placeholder="VD: KTV. Hoàng Tuấn Cường"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thông số kỹ thuật chính & Cấu hình máy
            </label>
            <textarea
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              rows={2}
              placeholder="VD: Độ phân giải 1nm, điện thế gia tốc 0.1 - 30kV, đầu dò EDS Oxford..."
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hướng dẫn an toàn & Lưu ý mẫu phẩm
            </label>
            <textarea
              value={safetyGuidelines}
              onChange={(e) => setSafetyGuidelines(e.target.value)}
              rows={2}
              placeholder="VD: Mẫu phải sấy khô hoàn toàn, không phân tích mẫu có tính ăn mòn..."
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trạng thái vận hành ban đầu
            </label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="available"
                  checked={status === 'available'}
                  onChange={() => setStatus('available')}
                  className="text-emerald-600"
                />
                <span className="text-emerald-700 font-semibold">Sẵn sàng sử dụng</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="maintenance"
                  checked={status === 'maintenance'}
                  onChange={() => setStatus('maintenance')}
                  className="text-rose-600"
                />
                <span className="text-rose-700 font-semibold">Bảo trì kỹ thuật (Tạm khóa)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              {equipmentToEdit ? 'Lưu Thay Đổi' : 'Thêm Thiết Bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
