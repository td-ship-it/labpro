import React, { useState } from 'react';
import { Equipment, User, EquipmentQuickNote, QuickNoteCategory } from '../types';
import { LabStorage } from '../services/storage';
import { 
  X, 
  StickyNote, 
  Pin, 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Sliders, 
  AlertTriangle, 
  Lightbulb, 
  FileCode2, 
  ClipboardCheck, 
  User as UserIcon, 
  Clock, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

interface QuickNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  equipmentList: Equipment[];
  selectedEquipmentId?: string;
  onRefresh: () => void;
}

export const QuickNotesModal: React.FC<QuickNotesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  equipmentList,
  selectedEquipmentId,
  onRefresh,
}) => {
  const [activeEqId, setActiveEqId] = useState<string>(
    selectedEquipmentId || (equipmentList[0]?.id || '')
  );
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // New Note Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<QuickNoteCategory>('config');
  const [formContent, setFormContent] = useState<string>('');
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  const [formParams, setFormParams] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Update active equipment if passed via prop changes
  React.useEffect(() => {
    if (selectedEquipmentId) {
      setActiveEqId(selectedEquipmentId);
    } else if (!activeEqId && equipmentList.length > 0) {
      setActiveEqId(equipmentList[0].id);
    }
  }, [selectedEquipmentId, equipmentList]);

  if (!isOpen) return null;

  const currentEquipment = equipmentList.find((e) => e.id === activeEqId);
  const allNotes = LabStorage.getQuickNotes();
  const eqNotes = LabStorage.getQuickNotesForEquipment(activeEqId);

  // Category metadata definitions
  const categoriesMap: Record<QuickNoteCategory, { label: string; icon: React.ReactNode; badgeClass: string; borderClass: string; bgClass: string }> = {
    config: {
      label: 'Cấu hình máy',
      icon: <Sliders className="w-3.5 h-3.5 text-indigo-600" />,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      borderClass: 'border-l-indigo-500',
      bgClass: 'bg-indigo-50/30',
    },
    protocol: {
      label: 'Quy trình đo',
      icon: <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderClass: 'border-l-emerald-500',
      bgClass: 'bg-emerald-50/30',
    },
    tip: {
      label: 'Mẹo & Kinh nghiệm',
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600" />,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      borderClass: 'border-l-amber-500',
      bgClass: 'bg-amber-50/30',
    },
    warning: {
      label: 'Cảnh báo & An toàn',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-l-rose-500',
      bgClass: 'bg-rose-50/30',
    },
  };

  const filteredNotes = eqNotes.filter((n) => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.authorName.toLowerCase().includes(query) ||
      n.parameters?.some((p) => p.key.toLowerCase().includes(query) || p.value.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  const handleAddParamRow = () => {
    setFormParams([...formParams, { key: '', value: '' }]);
  };

  const handleRemoveParamRow = (index: number) => {
    setFormParams(formParams.filter((_, idx) => idx !== index));
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...formParams];
    updated[index][field] = val;
    setFormParams(updated);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('config');
    setFormContent('');
    setFormIsPinned(false);
    setFormParams([{ key: '', value: '' }]);
    setFormError(null);
    setShowAddForm(false);
  };

  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề cho Quick Note.');
      return;
    }

    if (!formContent.trim()) {
      setFormError('Vui lòng nhập nội dung hướng dẫn hoặc chi tiết cấu hình.');
      return;
    }

    const cleanParams = formParams
      .filter((p) => p.key.trim() && p.value.trim())
      .map((p) => ({ key: p.key.trim(), value: p.value.trim() }));

    LabStorage.addQuickNote({
      equipmentId: activeEqId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorTitle: currentUser.title,
      authorDepartment: currentUser.department,
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      parameters: cleanParams.length > 0 ? cleanParams : undefined,
      isPinned: formIsPinned,
    });

    onRefresh();
    resetForm();
  };

  const handleTogglePin = (note: EquipmentQuickNote) => {
    LabStorage.updateQuickNote({
      ...note,
      isPinned: !note.isPinned,
    });
    onRefresh();
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ghi chú kỹ thuật này?')) {
      LabStorage.deleteQuickNote(noteId);
      onRefresh();
    }
  };

  const handleCopyNoteParams = (note: EquipmentQuickNote) => {
    let textToCopy = `[${currentEquipment?.code || ''}] ${note.title}\n${note.content}\n`;
    if (note.parameters && note.parameters.length > 0) {
      textToCopy += '\nThông số kỹ thuật:\n' + note.parameters.map((p) => `- ${p.key}: ${p.value}`).join('\n');
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Quick Notes & Hướng Dẫn Vận Hành</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-mono font-medium">
                    {eqNotes.length} ghi chú
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chia sẻ cấu hình tối ưu, mẹo chuẩn bị mẫu và cảnh báo phòng thí nghiệm trước ca đo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipment Selector Ribbon */}
        <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-3 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Chọn thiết bị:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {equipmentList.map((eq) => {
              const count = allNotes.filter((n) => n.equipmentId === eq.id).length;
              const isSelected = eq.id === activeEqId;
              return (
                <button
                  key={eq.id}
                  onClick={() => {
                    setActiveEqId(eq.id);
                    setShowAddForm(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold">[{eq.code}]</span>
                  <span className="max-w-[140px] truncate">{eq.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Equipment Context Banner */}
        {currentEquipment && (
          <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="font-bold text-slate-900">{currentEquipment.name}</span>
              <span>·</span>
              <span className="text-slate-500 font-mono">[{currentEquipment.code}]</span>
              <span>·</span>
              <span className="text-slate-500">{currentEquipment.room} ({currentEquipment.building})</span>
              <span>·</span>
              <span className="text-slate-500">Phụ trách: <strong>{currentEquipment.responsibleStaff}</strong></span>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Đóng Form Ghi Chú' : 'Thêm Quick Note Cho Thiết Bị'}</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Add New Note Collapsible Form */}
          {showAddForm && (
            <form
              onSubmit={handleSaveNewNote}
              className="bg-slate-50 border-2 border-blue-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-3 duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Ghi lại Cấu hình & Hướng dẫn kỹ thuật mới
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Tác giả: <strong>{currentUser.title} {currentUser.name}</strong>
                </span>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề cấu hình / Kỹ thuật đo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Cấu hình quét baseline bước sóng sâu 190-300nm hoặc Chế độ SEI..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân loại ghi chú <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as QuickNoteCategory)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  >
                    <option value="config">⚙️ Cấu hình máy (Hardware / Config)</option>
                    <option value="protocol">📋 Quy trình đo (Method / Protocol)</option>
                    <option value="tip">💡 Mẹo & Kinh nghiệm (Pro Tips)</option>
                    <option value="warning">⚠️ Cảnh báo an toàn (Safety / Warning)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung chi tiết & Lưu ý quan trọng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Mô tả cụ thể cách cài đặt phần mềm điều khiển, dung môi tương thích, nhiệt độ buồng, bước hiệu chuẩn..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              {/* Dynamic Parameter Key-Value Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Bảng thông số kỹ thuật khuyến nghị (Key - Value)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddParamRow}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm hàng thông số</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {formParams.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                        placeholder="Tên thông số (e.g. Điện thế HT, Cột sắc ký, Áp suất)"
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                        placeholder="Giá trị (e.g. 15 kV, HP-5MS, < 5.0 Pa)"
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono font-medium"
                      />
                      {formParams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParamRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pin Checkbox & Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="flex items-center gap-1 text-slate-800">
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ghim ghi chú này lên đầu danh sách để đồng nghiệp luôn thấy trước khi đo</span>
                  </span>
                </label>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                  >
                    Lưu Quick Note
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filtering & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({eqNotes.length})
              </button>
              {Object.entries(categoriesMap).map(([key, cat]) => {
                const count = eqNotes.filter((n) => n.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategory === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tiêu đề, thông số, tác giả..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Notes Cards List */}
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <StickyNote className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Chưa có ghi chú kỹ thuật nào</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Hãy là người đầu tiên chia sẻ cấu hình đo hoặc lưu ý thực hành cho máy {currentEquipment?.code}.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Viết Quick Note Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredNotes.map((note) => {
                const catInfo = categoriesMap[note.category] || categoriesMap.config;
                const isAuthorOrAdmin =
                  currentUser.role === 'admin' || currentUser.id === note.authorId;
                const isCopied = copiedNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className={`bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all border-l-4 ${catInfo.borderClass} p-4 sm:p-5 space-y-3.5`}
                  >
                    {/* Header: Title, Category, Pin & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Ghim Ưu Tiên</span>
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold border ${catInfo.badgeClass}`}
                          >
                            {catInfo.icon}
                            <span>{catInfo.label}</span>
                          </span>

                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {note.title}
                        </h3>
                      </div>

                      {/* Top Action buttons */}
                      <div className="flex items-center gap-1.5 self-start shrink-0">
                        <button
                          onClick={() => handleCopyNoteParams(note)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                            isCopied
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                          title="Sao chép toàn bộ thông số và hướng dẫn"
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Đã chép' : 'Sao chép cấu hình'}</span>
                        </button>

                        {isAuthorOrAdmin && (
                          <>
                            <button
                              onClick={() => handleTogglePin(note)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                note.isPinned
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-slate-50 border-slate-200'
                              }`}
                              title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                              title="Xóa ghi chú"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content Description */}
                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {note.content}
                    </div>

                    {/* Parameters Table Grid if available */}
                    {note.parameters && note.parameters.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-slate-400" />
                          <span>Thông số cài đặt tham chiếu:</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {note.parameters.map((param, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                            >
                              <span className="text-slate-600 font-medium truncate pr-2">
                                {param.key}:
                              </span>
                              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                                {param.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Author & Lab Department Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {note.authorName.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {note.authorTitle} {note.authorName}
                        </span>
                        <span>·</span>
                        <span className="text-slate-500">{note.authorDepartment}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>Đã lưu vào hệ thống</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Mọi giảng viên và nghiên cứu viên đều có thể đóng góp Quick Notes để đồng nghiệp tham khảo.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
