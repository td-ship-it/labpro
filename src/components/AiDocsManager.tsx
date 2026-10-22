import React, { useMemo, useRef, useState } from 'react';
import { AiDocMeta, AI_DOC_CATEGORIES, Equipment, User } from '../types';
import { LabStorage } from '../services/storage';
import { ACCEPTED_DOC_TYPES, extractTextFromFile } from '../services/fileText';
import {
  BookMarked,
  Plus,
  Upload,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Search,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';

interface AiDocsManagerProps {
  currentUser: User;
  equipmentList: Equipment[];
}

const MAX_CHARS = 400000;

interface FormState {
  docId?: string;
  title: string;
  category: string;
  equipmentId: string;
  sourceName: string;
  content: string;
}

const emptyForm: FormState = { title: '', category: 'Nội quy & quy định', equipmentId: '', sourceName: '', content: '' };

const fmtChars = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

export const AiDocsManager: React.FC<AiDocsManagerProps> = ({ currentUser, equipmentList }) => {
  const docs = LabStorage.getAiDocs();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Thử tìm kiếm
  const [testQ, setTestQ] = useState('');
  const [testEq, setTestEq] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const eqMap = useMemo(() => new Map(equipmentList.map((e) => [e.id, e])), [equipmentList]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-sm text-slate-600">
        Chỉ Quản trị viên mới quản lý được tài liệu cho Trợ lý AI.
      </div>
    );
  }

  const filtered = docs.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const eq = d.equipmentId ? eqMap.get(d.equipmentId) : undefined;
    return [d.title, d.category, d.sourceName, eq?.code, eq?.name].some((x) => String(x || '').toLowerCase().includes(q));
  });
  const totalChars = docs.reduce((s, d) => s + d.chars, 0);

  const openNew = () => {
    setError(null);
    setForm({ ...emptyForm });
  };

  const openEdit = async (d: AiDocMeta) => {
    setError(null);
    setForm({ docId: d.docId, title: d.title, category: d.category, equipmentId: d.equipmentId || '', sourceName: d.sourceName || '', content: '' });
    setReading('Đang tải nội dung tài liệu...');
    const res = await LabStorage.getAiDocContent(d.docId);
    setReading(null);
    if (!res.success) {
      setError(res.error || 'Không tải được nội dung.');
      return;
    }
    setForm((f) => (f && f.docId === d.docId ? { ...f, content: res.doc.content || '' } : f));
  };

  const handleFile = async (file: File) => {
    setError(null);
    setReading('Đang đọc file...');
    try {
      const text = await extractTextFromFile(file, (m) => setReading(m));
      setForm((f) => {
        const base = f || { ...emptyForm };
        // Tên: dòng tiêu đề đầu tiên của tài liệu, nếu không có thì lấy theo tên file
        const firstLine = (text.split('\n').find((l) => l.trim().length >= 8) || '').trim();
        const guess = firstLine.length <= 150 && !/[.;,:]$/.test(firstLine) ? firstLine : file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        const title = base.title || guess;
        const content = base.content.trim() ? `${base.content.trim()}\n\n${text}` : text;
        return { ...base, title, content, sourceName: base.sourceName ? `${base.sourceName}, ${file.name}` : file.name };
      });
    } catch (e: any) {
      setError(e?.message || 'Không đọc được file.');
    } finally {
      setReading(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form || saving) return;
    if (!form.title.trim()) return setError('Vui lòng nhập tên tài liệu.');
    if (form.content.trim().length < 20) return setError('Nội dung tài liệu quá ngắn.');
    if (form.content.length > MAX_CHARS) return setError(`Tài liệu dài ${form.content.length.toLocaleString('vi-VN')} ký tự, vượt giới hạn ${MAX_CHARS.toLocaleString('vi-VN')}. Hãy tách thành nhiều tài liệu.`);
    setSaving(true);
    setError(null);
    const res = await LabStorage.saveAiDoc({
      docId: form.docId,
      title: form.title.trim(),
      category: form.category,
      equipmentId: form.equipmentId || undefined,
      sourceName: form.sourceName || undefined,
      content: form.content,
    });
    setSaving(false);
    if (!res.success) return setError(res.error || 'Không lưu được.');
    setNotice(`Đã lưu "${form.title.trim()}". Trợ lý AI dùng được tài liệu này ngay.`);
    setForm(null);
  };

  const handleDelete = async (d: AiDocMeta) => {
    if (!confirm(`Xóa tài liệu "${d.title}"? Trợ lý AI sẽ không dùng tài liệu này nữa.`)) return;
    const res = await LabStorage.deleteAiDoc(d.docId);
    if (!res.success) setError(res.error || 'Không xóa được.');
    else setNotice(`Đã xóa "${d.title}".`);
  };

  const runTest = async () => {
    if (!testQ.trim()) return;
    setTesting(true);
    const res = await LabStorage.previewAiContext(testQ.trim(), testEq || undefined);
    setTesting(false);
    setTestResult(res.success ? res.data : { error: res.error });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            Tài Liệu Cho Trợ Lý AI
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Nội quy, quy trình, hướng dẫn an toàn… của phòng Lab. Khi có người hỏi, Trợ lý tự tìm đoạn liên quan nhất và trả lời theo đúng
            tài liệu, kèm số trích dẫn. SOP, hướng dẫn an toàn và Quick Notes của từng thiết bị đã được dùng tự động — không cần thêm lại ở đây.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs whitespace-nowrap self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm tài liệu</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold hover:underline shrink-0">
            Đóng
          </button>
        </div>
      )}
      {error && !form && (
        <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div className="text-xs text-slate-600">
            <strong className="text-slate-900">{docs.length}</strong> tài liệu · <span className="font-mono">{fmtChars(totalChars)}</span> ký tự
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tài liệu..."
              className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">Chưa có tài liệu nào</p>
            <p className="text-xs text-slate-500">Bấm “Thêm tài liệu” để tải lên file PDF, Word hoặc dán nội dung.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((d) => {
              const eq = d.equipmentId ? eqMap.get(d.equipmentId) : undefined;
              return (
                <li key={d.docId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{d.title}</div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span>{d.category}</span>
                      <span>·</span>
                      <span>{eq ? `Thiết bị ${eq.code}` : 'Dùng chung'}</span>
                      <span>·</span>
                      <span className="font-mono">
                        {fmtChars(d.chars)} ký tự / {d.parts} đoạn
                      </span>
                      {d.sourceName && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[220px]">{d.sourceName}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Cập nhật {fmtDate(d.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="p-6 text-center text-xs text-slate-500">Không có tài liệu khớp “{search}”.</li>}
          </ul>
        )}
      </div>

      {/* Thử tìm kiếm */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Kiểm tra: Trợ lý sẽ đọc gì khi được hỏi?</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={testQ}
            onChange={(e) => setTestQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTest()}
            placeholder="Ví dụ: tràn đổ axit xử lý thế nào?"
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300"
          />
          <select value={testEq} onChange={(e) => setTestEq(e.target.value)} className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white sm:w-56">
            <option value="">Không chọn thiết bị</option>
            {equipmentList.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.code}] {e.name}
              </option>
            ))}
          </select>
          <button
            onClick={runTest}
            disabled={testing || !testQ.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            {testing ? 'Đang tìm...' : 'Kiểm tra'}
          </button>
        </div>
        {testResult && (
          <div className="space-y-2 text-xs">
            {testResult.error ? (
              <p className="text-rose-700">{testResult.error}</p>
            ) : (
              <>
                {testResult.docs.length === 0 && !testResult.equipment && (
                  <p className="text-slate-500">Không tìm thấy tài liệu liên quan — Trợ lý sẽ trả lời theo kiến thức chung.</p>
                )}
                {testResult.docs.map((d: any) => (
                  <div key={d.n} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-semibold text-slate-800">
                      [{d.n}] {d.title}
                      {d.parts > 1 && <span className="font-normal text-slate-500"> — đoạn {d.part}/{d.parts}</span>}
                    </div>
                    <p className="text-slate-600 mt-1 whitespace-pre-line line-clamp-4">{d.content}</p>
                  </div>
                ))}
                {testResult.equipment && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <div className="font-semibold text-blue-900">Thông tin thiết bị gửi kèm ({testResult.equipmentCodes.join(', ')})</div>
                    <p className="text-blue-900/80 mt-1 whitespace-pre-line line-clamp-6">{testResult.equipment}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Hộp thoại thêm / sửa */}
      {form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">{form.docId ? 'Sửa tài liệu' : 'Thêm tài liệu cho Trợ lý AI'}</h3>
              <button onClick={() => setForm(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
                  Tên tài liệu <span className="text-rose-500">*</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Nội quy phòng thí nghiệm Bộ môn Bào chế 2026"
                    className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-300 font-normal"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Loại tài liệu
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white font-normal"
                  >
                    {AI_DOC_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Gắn với thiết bị (để ưu tiên khi hỏi về máy đó)
                  <select
                    value={form.equipmentId}
                    onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                    className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white font-normal"
                  >
                    <option value="">Dùng chung cho cả phòng Lab</option>
                    {equipmentList.map((e) => (
                      <option key={e.id} value={e.id}>
                        [{e.code}] {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_DOC_TYPES}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={Boolean(reading)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-60 self-start"
                >
                  {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {reading || 'Tải lên PDF / Word / TXT'}
                </button>
                <span className="text-[11px] text-slate-500">
                  Chữ được lấy ra ngay trên máy bạn rồi điền vào ô dưới để kiểm tra trước khi lưu. Tải nhiều file sẽ nối tiếp nội dung.
                  PDF dạng ảnh scan không lấy được chữ.
                </span>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  <span>
                    Nội dung <span className="text-rose-500">*</span>
                  </span>
                  <span className={`font-mono font-normal ${form.content.length > MAX_CHARS ? 'text-rose-600' : 'text-slate-500'}`}>
                    {form.content.length.toLocaleString('vi-VN')} / {MAX_CHARS.toLocaleString('vi-VN')} ký tự
                  </span>
                </span>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={14}
                  placeholder="Dán nội dung tài liệu hoặc tải file lên..."
                  className="mt-1 w-full text-xs leading-relaxed px-3 py-2 rounded-lg border border-slate-300 font-normal"
                />
              </label>

              <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Viết rõ ràng, mỗi mục một đoạn sẽ giúp Trợ lý tìm đúng hơn. Không đưa thông tin mật (mật khẩu, số tài khoản…) vào tài liệu.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || Boolean(reading)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu tài liệu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
