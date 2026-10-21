import React, { useState, useMemo } from 'react';
import { Equipment, User, EquipmentCategory } from '../types';
import { LabStorage } from '../services/storage';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Wrench, 
  CheckCircle2, 
  AlertOctagon, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  User as UserIcon,
  HelpCircle,
  StickyNote,
  Pin,
  QrCode,
  Sparkles,
  Filter,
  X,
  RotateCcw,
  Activity,
  Layers,
  FlaskConical,
  Printer
} from 'lucide-react';
import { EquipmentVisual } from './EquipmentVisual';
import { EquipmentModal } from './EquipmentModal';
import { EquipmentPrintQRModal } from './EquipmentPrintQRModal';
import { calculateEquipmentMaintenanceForecast } from '../services/maintenanceForecaster';

interface EquipmentManagerProps {
  currentUser: User;
  equipmentList: Equipment[];
  onOpenBookingModal: (eqId: string) => void;
  onRefresh: () => void;
  onOpenQuickNotes?: (eqId: string) => void;
  onOpenQRModal?: (equipment: Equipment) => void;
  onOpenQRScanner?: () => void;
  onNavigateToMaintenanceForecast?: () => void;
  onOpenGeminiChat?: (eq?: Equipment) => void;
}

export const EquipmentManager: React.FC<EquipmentManagerProps> = ({
  currentUser,
  equipmentList,
  onOpenBookingModal,
  onRefresh,
  onOpenQuickNotes,
  onOpenQRModal,
  onOpenQRScanner,
  onNavigateToMaintenanceForecast,
  onOpenGeminiChat,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'in_use' | 'maintenance'>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [printQRModal, setPrintQRModal] = useState<{
    isOpen: boolean;
    equipment: Equipment | null;
    mode: 'single' | 'batch';
  }>({
    isOpen: false,
    equipment: null,
    mode: 'single',
  });

  const isAdmin = currentUser.role === 'admin';

  // Dynamic unique categories extracted from equipment list + defaults
  const allCategories = useMemo(() => {
    const defaultCats = [
      'Quang phổ & Quang học',
      'Sắc ký & Khối phổ',
      'Kính hiển vi & Hình ảnh',
      'Sinh học phân tử & Ly tâm',
      'Nhiệt & Phân tích vật liệu',
      'Đo lường & Phân tích cơ bản'
    ];
    const set = new Set<string>(defaultCats);
    equipmentList.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [equipmentList]);

  // Counts for live badges
  const statusCounts = useMemo(() => {
    return {
      all: equipmentList.length,
      available: equipmentList.filter((e) => e.status === 'available').length,
      in_use: equipmentList.filter((e) => e.status === 'in_use').length,
      maintenance: equipmentList.filter((e) => e.status === 'maintenance').length,
    };
  }, [equipmentList]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    equipmentList.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + 1;
    });
    return map;
  }, [equipmentList]);

  const hasActiveFilters = searchTerm.trim() !== '' || selectedCategory !== 'all' || selectedStatus !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const filteredEquipment = equipmentList.filter((eq) => {
    const matchesCat = selectedCategory === 'all' || eq.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || eq.status === selectedStatus;
    const query = searchTerm.toLowerCase().trim();
    const matchesQuery =
      !query ||
      eq.name.toLowerCase().includes(query) ||
      eq.code.toLowerCase().includes(query) ||
      eq.room.toLowerCase().includes(query) ||
      (eq.building && eq.building.toLowerCase().includes(query)) ||
      (eq.manufacturer && eq.manufacturer.toLowerCase().includes(query)) ||
      (eq.model && eq.model.toLowerCase().includes(query)) ||
      (eq.specs && eq.specs.toLowerCase().includes(query)) ||
      (eq.responsibleStaff && eq.responsibleStaff.toLowerCase().includes(query));
    return matchesCat && matchesStatus && matchesQuery;
  });

  const handleToggleMaintenance = (eq: Equipment) => {
    if (!isAdmin) return;
    const nextStatus = eq.status === 'maintenance' ? 'available' : 'maintenance';
    const updated: Equipment = { ...eq, status: nextStatus };
    LabStorage.upsertEquipment(updated);
    onRefresh();
  };

  const handleDelete = async (eq: Equipment) => {
    if (!isAdmin) return;
    if (confirm(`Bạn có chắc chắn muốn xóa thiết bị [${eq.code}] ${eq.name}?`)) {
      const res = await LabStorage.deleteEquipment(eq.id);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.error || 'Không thể xóa thiết bị.');
      }
    }
  };

  const handleSaveEquipment = (eq: Equipment) => {
    LabStorage.upsertEquipment(eq);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Danh Mục Thiết Bị Phòng Thí Nghiệm
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Quản trị viên: Thêm mới, chỉnh sửa thông số kỹ thuật và thiết lập bảo trì thiết bị'
              : 'Tra cứu thông số kỹ thuật, vị trí phòng đặt máy và đăng ký lịch sử dụng'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Print QR Stickers Button */}
          <button
            type="button"
            onClick={() => setPrintQRModal({ isOpen: true, equipment: null, mode: 'batch' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Tạo và in hàng loạt mã QR tem decal dán lên tất cả thiết bị phòng lab"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>In Tem QR Decal</span>
          </button>

          {onOpenQRScanner && (
            <button
              onClick={onOpenQRScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              title="Quét mã QR tem dán trên thân máy để mở Check-in hoặc xem SOP/Video"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Quét Mã QR Máy</span>
            </button>
          )}

          {onNavigateToMaintenanceForecast && (
            <button
              onClick={onNavigateToMaintenanceForecast}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              title="Mở bảng tính toán thuật toán dự báo lịch bảo trì và kiểm định thiết bị định kỳ"
            >
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>Dự Báo Bảo Trì</span>
            </button>
          )}

          {/* Ask Gemini Chatbot with Google Search button */}
          {onOpenGeminiChat && (
            <button
              onClick={() => onOpenGeminiChat()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-900 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:from-blue-100 hover:to-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-all whitespace-nowrap"
              title="Hỏi trợ lý AI Gemini và tra cứu dữ liệu Google thời gian thực"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200" />
              <span>Trợ Lý AI & Google Search</span>
            </button>
          )}

          {isAdmin ? (
            <button
              onClick={() => {
                setEquipmentToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Thiết Bị Mới</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Chế độ xem cho: <strong>{currentUser.name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3.5">
        {/* Row 1: Search input + Live summary + Reset button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhanh theo tên máy, mã số (VD: HPLC-01, UV-01), phòng đặt, hãng sản xuất, thông số..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị <strong className="text-slate-900 font-bold">{filteredEquipment.length}</strong> / {equipmentList.length} thiết bị
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Đặt lại toàn bộ bộ lọc và từ khóa tìm kiếm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Bộ lọc nhanh theo trạng thái (Đang rảnh / Đang bận / Đang bảo trì) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Trạng thái:</span>
            </span>

            {/* Tất cả trạng thái */}
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {statusCounts.all}
              </span>
            </button>

            {/* Đang rảnh / Sẵn sàng */}
            <button
              type="button"
              onClick={() => setSelectedStatus('available')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                selectedStatus === 'available'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50/80'
              }`}
              title="Chỉ hiển thị các máy sẵn sàng phục vụ và có thể đăng ký ngay"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedStatus === 'available' ? 'bg-white' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span>Đang rảnh (Sẵn sàng)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === 'available' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {statusCounts.available}
              </span>
            </button>

            {/* Đang bận / Đang sử dụng */}
            <button
              type="button"
              onClick={() => setSelectedStatus('in_use')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                selectedStatus === 'in_use'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50/80'
              }`}
              title="Các máy hiện đang trong phiên đo của người dùng khác"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedStatus === 'in_use' ? 'bg-white' : 'bg-amber-500'
                }`}
              />
              <span>Đang bận (Đang dùng)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === 'in_use' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {statusCounts.in_use}
              </span>
            </button>

            {/* Đang bảo trì */}
            <button
              type="button"
              onClick={() => setSelectedStatus('maintenance')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                selectedStatus === 'maintenance'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50/80'
              }`}
              title="Thiết bị đang bảo dưỡng, hiệu chuẩn hoặc sự cố kỹ thuật"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedStatus === 'maintenance' ? 'bg-white' : 'bg-rose-500'
                }`}
              />
              <span>Đang bảo trì</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === 'maintenance' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {statusCounts.maintenance}
              </span>
            </button>
          </div>
        </div>

        {/* Row 3: Bộ lọc theo loại thiết bị (Category Pills) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Loại thiết bị:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả chủng loại ({equipmentList.length})
          </button>

          {allCategories.map((cat) => {
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy thiết bị nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Không có máy nào thỏa mãn tiêu chí tìm kiếm
              {searchTerm ? ` "${searchTerm}"` : ''}
              {selectedStatus !== 'all'
                ? ` với trạng thái "${
                    selectedStatus === 'available'
                      ? 'Đang rảnh'
                      : selectedStatus === 'in_use'
                      ? 'Đang bận'
                      : 'Đang bảo trì'
                  }"`
                : ''}
              {selectedCategory !== 'all' ? ` thuộc loại "${selectedCategory}"` : ''}.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc & Xem tất cả thiết bị</span>
              </button>
            )}
          </div>
        ) : (
          filteredEquipment.map((eq) => {
            const isMaintenance = eq.status === 'maintenance';
            const isInUse = eq.status === 'in_use';

            return (
              <div
                key={eq.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                {/* Visual Header */}
                <div className="p-4 pb-0">
                  <EquipmentVisual category={eq.category} code={eq.code} />
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {eq.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold ${
                          isMaintenance
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isInUse
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isMaintenance ? 'Đang bảo trì' : isInUse ? 'Đang hoạt động' : 'Sẵn sàng'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={eq.name}>
                        {eq.name}
                      </h3>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPrintQRModal({ isOpen: true, equipment: eq, mode: 'single' })}
                          className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={`Tạo và in tem mã QR dán lên thiết bị [${eq.code}]`}
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                        </button>
                        {onOpenQRModal && (
                          <button
                            type="button"
                            onClick={() => onOpenQRModal(eq)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title={`Xem trung tâm mã QR, SOP & Video của [${eq.code}]`}
                          >
                            <QrCode className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Hãng: {eq.manufacturer}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        Model: {eq.model}
                      </span>
                    </div>

                    {/* Location & Specs snippet */}
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{eq.room} ({eq.building})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Tối đa {eq.maxBookingHoursPerSession} giờ / ca đo</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Phụ trách: {eq.responsibleStaff}</span>
                      </div>
                    </div>

                    {/* Specs Details */}
                    <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 italic" title={eq.specs}>
                      {eq.specs}
                    </p>

                    {/* Quick Notes preview if any */}
                    {(() => {
                      const eqNotes = LabStorage.getQuickNotesForEquipment(eq.id);
                      const pinned = eqNotes.find((n) => n.isPinned);
                      return (
                        <div className="mt-2.5">
                          {pinned ? (
                            <div 
                              onClick={() => onOpenQuickNotes && onOpenQuickNotes(eq.id)}
                              className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 cursor-pointer hover:bg-amber-100/70 transition-colors flex items-start gap-1.5"
                              title="Nhấp để xem chi tiết ghi chú cấu hình của đồng nghiệp"
                            >
                              <Pin className="w-3 h-3 text-amber-600 shrink-0 mt-0.5 fill-amber-500" />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold truncate block">{pinned.title}</span>
                                <span className="text-[10px] text-amber-700 truncate block">
                                  Bởi {pinned.authorName} ({pinned.authorTitle})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                              <span>Ghi chú kỹ thuật:</span>
                              <span className="font-mono">{eqNotes.length} ghi chú</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Predictive Maintenance Status Badge */}
                    {(() => {
                      const allLogs = LabStorage.getLogs();
                      const allBookings = LabStorage.getBookings();
                      const allMaint = LabStorage.getMaintenanceRecords();
                      const forecast = calculateEquipmentMaintenanceForecast(eq, allLogs, allBookings, allMaint);
                      
                      return (
                        <div 
                          onClick={() => {
                            if (onNavigateToMaintenanceForecast) {
                              onNavigateToMaintenanceForecast();
                            } else if (onOpenQRModal) {
                              onOpenQRModal(eq);
                            }
                          }}
                          className={`mt-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            forecast.urgency === 'overdue'
                              ? 'bg-rose-50/90 border-rose-300 text-rose-950 hover:bg-rose-100'
                              : forecast.urgency === 'urgent'
                              ? 'bg-orange-50/90 border-orange-300 text-orange-950 hover:bg-orange-100'
                              : forecast.urgency === 'attention'
                              ? 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Nhấp để xem dự báo bảo trì chi tiết và lập kế hoạch kiểm định định kỳ"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <Wrench className={`w-3.5 h-3.5 ${
                                forecast.urgency === 'overdue' 
                                  ? 'text-rose-600' 
                                  : forecast.urgency === 'urgent' 
                                  ? 'text-orange-600' 
                                  : 'text-indigo-600'
                              }`} />
                              <span>Bảo trì thực tế:</span>
                            </div>
                            <span className="font-mono font-extrabold">
                              {forecast.healthPercentage}% sức khỏe
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>Giờ đo: <strong>{forecast.hoursSinceLastMaintenance}h</strong>/{forecast.maxOperatingHoursThreshold}h</span>
                            <span>Hạn: <strong>{forecast.predictedMaintenanceDate}</strong></span>
                          </div>

                          {forecast.isWearPacingFasterThanCalendar && (
                            <div className="text-[10px] text-rose-700 font-bold mt-1 flex items-center gap-1">
                              <span>⚠️ Hao mòn sớm hơn {Math.abs(forecast.daysVarianceVsCalendar)} ngày so với lịch!</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Area */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {/* QR Code, SOP & Video Guide Button */}
                    <button
                      type="button"
                      onClick={() => onOpenQRModal && onOpenQRModal(eq)}
                      className="w-full py-1.5 px-3 text-xs font-semibold text-blue-700 bg-blue-50/90 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Xem quy trình SOP, Video clip thực hành & Trung tâm điều khiển thiết bị"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>SOP, Video & Tra Cứu ({eq.code})</span>
                    </button>

                    {/* Create & Print QR Sticker Button */}
                    <button
                      type="button"
                      onClick={() => setPrintQRModal({ isOpen: true, equipment: eq, mode: 'single' })}
                      className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Tạo và in tem nhãn mã QR chuẩn ISO dán lên thân máy thực tế"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tạo & In Tem QR Dán Máy</span>
                    </button>

                    {/* Quick Notes Button */}
                    <button
                      type="button"
                      onClick={() => onOpenQuickNotes && onOpenQuickNotes(eq.id)}
                      className="w-full py-1.5 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-blue-600" />
                      <span>Xem Quick Notes & Cấu hình ({LabStorage.getQuickNotesForEquipment(eq.id).length})</span>
                    </button>

                    {/* Ask AI Gemini & Google Search for Equipment */}
                    {onOpenGeminiChat && (
                      <button
                        type="button"
                        onClick={() => onOpenGeminiChat(eq)}
                        className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        title="Hỏi AI Gemini về quy trình SOP, an toàn và tra cứu Google Search cho máy này"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hỏi AI về {eq.code} (SOP/Search)</span>
                      </button>
                    )}

                    {/* Primary Booking Button */}
                    <button
                      onClick={() => onOpenBookingModal(eq.id)}
                      disabled={isMaintenance}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{isMaintenance ? 'Tạm ngưng (Bảo trì)' : 'Đăng Ký Sử Dụng'}</span>
                    </button>

                    {/* Admin Specific Controls */}
                    {isAdmin && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          onClick={() => handleToggleMaintenance(eq)}
                          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                            isMaintenance
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          }`}
                          title="Bật/Tắt chế độ bảo trì kỹ thuật"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>{isMaintenance ? 'Mở lại máy' : 'Đặt bảo trì'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEquipmentToEdit(eq);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Sửa thông số"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(eq)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa thiết bị"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Equipment Modal for Admin */}
      <EquipmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        equipmentToEdit={equipmentToEdit}
        onSave={handleSaveEquipment}
      />

      {/* Equipment Print QR Label Modal */}
      <EquipmentPrintQRModal
        isOpen={printQRModal.isOpen}
        onClose={() => setPrintQRModal({ isOpen: false, equipment: null, mode: 'single' })}
        equipment={printQRModal.equipment}
        allEquipment={equipmentList}
        initialMode={printQRModal.mode}
      />
    </div>
  );
};
