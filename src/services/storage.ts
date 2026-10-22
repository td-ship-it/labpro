/**
 * Kho dữ liệu phía trình duyệt.
 *
 * Dữ liệu thật nằm ở Google Sheets (qua Cloudflare Worker → Apps Script). Sau khi đăng nhập, toàn bộ
 * dữ liệu được tải một lần vào bộ nhớ để các màn hình đọc đồng bộ như trước. Mỗi thao tác ghi:
 *   - thao tác cần máy chủ kiểm tra (đặt lịch, nhận/trả máy, đăng nhập...) → chờ máy chủ trả lời;
 *   - thao tác đơn giản (ghi chú, đánh dấu đã đọc...) → cập nhật ngay trên màn hình rồi gửi lên máy chủ,
 *     nếu máy chủ từ chối thì báo lỗi và tải lại dữ liệu.
 */
import {
  User,
  Equipment,
  Booking,
  UsageLog,
  MachineCondition,
  IncidentReport,
  EmailNotification,
  EquipmentQuickNote,
  MaintenanceRecord,
  ResearchProject,
  ConsumableSupply,
  ConsumedSupplyItem,
  AiDocMeta,
} from '../types';
import { callApi, getToken, setToken, setAuthLostHandler, ApiError, ApiResponse } from './api';

interface Store {
  users: User[];
  equipment: Equipment[];
  bookings: Booking[];
  logs: UsageLog[];
  emails: EmailNotification[];
  quickNotes: EquipmentQuickNote[];
  maintenance: MaintenanceRecord[];
  projects: ResearchProject[];
  supplies: ConsumableSupply[];
}

export interface PublicConfig {
  registration: 'approval' | 'open' | 'closed' | string;
  labName: string;
  allowedDomains: string;
}

type TableName = keyof Store;
const TABLES: TableName[] = ['users', 'equipment', 'bookings', 'logs', 'emails', 'quickNotes', 'maintenance', 'projects', 'supplies'];

const emptyStore = (): Store => ({
  users: [],
  equipment: [],
  bookings: [],
  logs: [],
  emails: [],
  quickNotes: [],
  maintenance: [],
  projects: [],
  supplies: [],
});

let db: Store = emptyStore();
let me: User | null = null;
let config: PublicConfig = { registration: 'approval', labName: '', allowedDomains: '' };
let inflight = 0;
let dataVer: string | null = null;
let aiDocs: AiDocMeta[] = []; // danh sách tài liệu AI (chỉ Admin), không gồm nội dung

/* -------- Bản dữ liệu lưu ở trình duyệt: mở lại trang là thấy ngay, cập nhật ngầm sau -------- */
const SNAPSHOT_KEY = 'lablog_snapshot_v1';
let snapshotTimer: number | null = null;

function saveSnapshotSoon() {
  if (!me || !dataVer) return;
  if (snapshotTimer) window.clearTimeout(snapshotTimer);
  snapshotTimer = window.setTimeout(() => {
    snapshotTimer = null;
    if (!me) return;
    try {
      const json = JSON.stringify({ userId: me.id, ver: dataVer, me, config, db, aiDocs });
      if (json.length < 4_000_000) localStorage.setItem(SNAPSHOT_KEY, json);
      else localStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      // hết dung lượng hoặc bị chặn: bỏ qua
    }
  }, 800);
}

function loadSnapshot(): { userId: string; ver: string; me: User; config: PublicConfig; db: Store } | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap || !snap.me || !snap.db) return null;
    // Chỉ dùng khi bản lưu thuộc đúng người của phiên đăng nhập hiện tại
    const body = (getToken() || '').split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const tokenUser = JSON.parse(decodeURIComponent(escape(atob(body + '==='.slice((body.length + 3) % 4))))).u;
    return tokenUser === snap.userId ? snap : null;
  } catch {
    return null;
  }
}

function clearSnapshot() {
  if (snapshotTimer) window.clearTimeout(snapshotTimer);
  snapshotTimer = null;
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // bỏ qua
  }
}
const listeners = new Set<() => void>();
let errorHandler: (msg: string) => void = (msg) => console.error(msg);
let sessionEndedHandler: () => void = () => {};

setAuthLostHandler(() => {
  const wasLoggedIn = me !== null;
  me = null;
  dataVer = null;
  db = emptyStore();
  clearSnapshot();
  notify();
  if (wasLoggedIn) sessionEndedHandler();
});

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

function hydrate(data: any) {
  const next = emptyStore();
  TABLES.forEach((t) => {
    next[t] = Array.isArray(data?.[t]) ? data[t] : [];
  });
  db = next;
  if (data?.me) me = data.me;
  if (data?.config) config = data.config;
  if (data?.ver) dataVer = data.ver;
  if (Array.isArray(data?.aiDocs)) aiDocs = data.aiDocs;
  notify();
  saveSnapshotSoon();
}

function applyResponse(res: ApiResponse<any>) {
  const patch = res.patch || {};
  const removed = res.removed || {};
  let changed = false;
  (Object.keys(patch) as TableName[]).forEach((t) => {
    if (!TABLES.includes(t)) return;
    const list = [...(db[t] as any[])];
    (patch[t] || []).forEach((rec: any) => {
      const idx = list.findIndex((x) => x.id === rec.id);
      if (idx >= 0) list[idx] = rec;
      else list.unshift(rec);
      if (t === 'users' && me && rec.id === me.id) me = rec;
    });
    (db as any)[t] = list;
    changed = true;
  });
  (Object.keys(removed) as TableName[]).forEach((t) => {
    if (!TABLES.includes(t)) return;
    const ids = new Set(removed[t] || []);
    (db as any)[t] = (db[t] as any[]).filter((x) => !ids.has(x.id));
    changed = true;
  });
  if (changed) {
    notify();
    saveSnapshotSoon();
  }
}

/** Gọi máy chủ và áp các thay đổi trả về vào kho. */
async function call<T = any>(action: string, payload?: unknown): Promise<T> {
  inflight++;
  try {
    const res = await callApi<T>(action, payload);
    applyResponse(res);
    return res.data;
  } finally {
    inflight--;
  }
}

/** Cập nhật lạc quan: đã sửa kho trước, gửi lên máy chủ; lỗi thì báo và tải lại. */
function fire(action: string, payload: unknown) {
  call(action, payload).catch((err: ApiError) => {
    errorHandler(err.message || 'Không lưu được thay đổi.');
    if (err.code !== 'AUTH') LabStorage.refresh(true).catch(() => {}); // tải lại toàn bộ để hoàn tác thay đổi tạm
  });
}

function localUpsert<K extends TableName>(table: K, rec: Store[K][number]) {
  saveSnapshotSoon();
  const list = [...(db[table] as any[])];
  const idx = list.findIndex((x) => x.id === (rec as any).id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  (db as any)[table] = list;
  notify();
}

function localRemove(table: TableName, id: string) {
  (db as any)[table] = (db[table] as any[]).filter((x) => x.id !== id);
  notify();
}

function clientId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

// Conflict Detection: Time overlap checker (kiểm tra nhanh trên màn hình; máy chủ kiểm tra lại khi lưu)
export function checkBookingConflict(
  equipmentId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: Booking } {
  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const reqStart = parseTimeToMinutes(startTime);
  const reqEnd = parseTimeToMinutes(endTime);

  if (reqEnd <= reqStart) {
    return { hasConflict: true };
  }

  const activeBookings = bookings.filter(
    (b) =>
      b.equipmentId === equipmentId &&
      b.date === date &&
      (b.status === 'confirmed' || b.status === 'active') &&
      b.id !== excludeBookingId
  );

  for (const b of activeBookings) {
    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = parseTimeToMinutes(b.endTime);
    if (reqStart < bEnd && reqEnd > bStart) {
      return { hasConflict: true, conflictingBooking: b };
    }
  }

  return { hasConflict: false };
}

/** Ngày hôm nay theo giờ máy người dùng (YYYY-MM-DD), tránh lệch ngày do toISOString dùng giờ UTC. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LabStorage = {
  /* ---------------- Đăng ký theo dõi & xử lý lỗi ---------------- */
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  setErrorHandler(fn: (msg: string) => void) {
    errorHandler = fn;
  },

  /** Gọi khi phiên đăng nhập hết hạn giữa chừng. */
  setSessionEndedHandler(fn: () => void) {
    sessionEndedHandler = fn;
  },

  isBusy(): boolean {
    return inflight > 0;
  },

  getConfig(): PublicConfig {
    return config;
  },

  async loadPublicConfig(): Promise<PublicConfig> {
    try {
      const res = await callApi<PublicConfig>('publicConfig');
      config = res.data;
    } catch {
      // giữ cấu hình mặc định
    }
    return config;
  },

  /* ---------------- Phiên đăng nhập ---------------- */
  hasStoredSession(): boolean {
    return Boolean(getToken());
  },

  /** Có bản dữ liệu đã lưu cho phiên này → hiển thị ngay, không cần chờ máy chủ. */
  hasSnapshot(): boolean {
    return Boolean(getToken()) && loadSnapshot() !== null;
  },

  /** Nạp ngay (đồng bộ) bản dữ liệu đã lưu của phiên hiện tại. Trả về người dùng nếu có. */
  hydrateFromSnapshot(): User | null {
    if (me) return me;
    if (!getToken()) return null;
    const snap = loadSnapshot();
    if (!snap) return null;
    db = { ...emptyStore(), ...snap.db };
    me = snap.me;
    config = snap.config || config;
    dataVer = snap.ver;
    aiDocs = Array.isArray((snap as any).aiDocs) ? (snap as any).aiDocs : [];
    return me;
  },

  async restoreSession(): Promise<User | null> {
    if (!getToken()) return null;
    if (this.hydrateFromSnapshot()) {
      // Đang hiện dữ liệu lần trước; lấy bản mới nhất ở nền (chỉ tải lại nếu có thay đổi)
      this.refresh().catch((e: ApiError) => {
        if (e?.code !== 'AUTH') errorHandler('Đang hiển thị dữ liệu đã lưu: ' + (e?.message || 'không kết nối được máy chủ.'));
      });
      return me;
    }
    try {
      const data = await call('bootstrap');
      hydrate(data);
      return me;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'AUTH') return null;
      throw e;
    }
  },

  /** Lấy dữ liệu mới nhất. Nếu không có gì thay đổi kể từ lần trước, máy chủ chỉ trả "same" (rất nhẹ). */
  async refresh(force = false): Promise<void> {
    if (!me) return;
    const data = await call('bootstrap', force ? {} : { since: dataVer || undefined });
    if (data?.same) return;
    hydrate(data);
  },

  isLoggedIn(): boolean {
    return me !== null;
  },

  getCurrentUser(): User | null {
    return me;
  },

  async login(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const data = await call('login', { email: email.trim(), password: password || '' });
      setToken(data.token);
      hydrate(data);
      return { success: true, user: data.me };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Đăng nhập không thành công.') };
    }
  },

  async register(userData: {
    name: string;
    email: string;
    password?: string;
    role: User['role'];
    title: string;
    department: string;
    phone: string;
  }): Promise<{ success: boolean; user?: User; pending?: boolean; error?: string }> {
    try {
      const data = await call('register', userData);
      if (data?.pending) return { success: true, pending: true };
      setToken(data.token);
      hydrate(data);
      return { success: true, user: data.me };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Đăng ký tài khoản không thành công.') };
    }
  },

  async logout(): Promise<void> {
    try {
      await callApi('logout');
    } catch {
      // vẫn đăng xuất phía trình duyệt
    }
    setToken(null);
    me = null;
    dataVer = null;
    aiDocs = [];
    db = emptyStore();
    clearSnapshot();
    notify();
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await call('changePassword', { oldPassword, newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không đổi được mật khẩu.') };
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await callApi('requestReset', { email: email.trim() });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không gửi được mã xác nhận.') };
    }
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await callApi('resetPassword', { email: email.trim(), code: code.trim(), newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không đặt lại được mật khẩu.') };
    }
  },

  /* ---------------- Đọc dữ liệu (đồng bộ, từ bộ nhớ) ---------------- */
  getUsers(): User[] {
    return db.users;
  },

  getEquipment(): Equipment[] {
    return db.equipment;
  },

  getBookings(): Booking[] {
    return db.bookings;
  },

  getLogs(): UsageLog[] {
    return db.logs;
  },

  getEmails(): EmailNotification[] {
    return db.emails;
  },

  getQuickNotes(): EquipmentQuickNote[] {
    return db.quickNotes;
  },

  getQuickNotesForEquipment(equipmentId: string): EquipmentQuickNote[] {
    return db.quickNotes
      .filter((n) => n.equipmentId === equipmentId)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  },

  getMaintenanceRecords(): MaintenanceRecord[] {
    return db.maintenance;
  },

  getMaintenanceRecordsForEquipment(equipmentId: string): MaintenanceRecord[] {
    return db.maintenance
      .filter((r) => r.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.performedDate).getTime() - new Date(a.performedDate).getTime());
  },

  getProjects(): ResearchProject[] {
    return db.projects;
  },

  getProjectById(id: string): ResearchProject | undefined {
    return db.projects.find((p) => p.id === id);
  },

  getProjectByCode(code: string): ResearchProject | undefined {
    return db.projects.find((p) => p.code.toLowerCase() === code.trim().toLowerCase());
  },

  getConsumableSupplies(): ConsumableSupply[] {
    return db.supplies;
  },

  /* ---------------- Tài liệu cho Trợ lý AI (Admin) ---------------- */
  getAiDocs(): AiDocMeta[] {
    return aiDocs;
  },

  async saveAiDoc(doc: {
    docId?: string;
    title: string;
    category: string;
    equipmentId?: string;
    sourceName?: string;
    content: string;
  }): Promise<{ success: boolean; docId?: string; error?: string }> {
    try {
      const data = await call('saveAiDoc', doc);
      aiDocs = data.aiDocs || aiDocs;
      notify();
      return { success: true, docId: data.docId };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không lưu được tài liệu.') };
    }
  },

  async deleteAiDoc(docId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await call('deleteAiDoc', { docId });
      aiDocs = data.aiDocs || aiDocs.filter((d) => d.docId !== docId);
      notify();
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không xóa được tài liệu.') };
    }
  },

  async getAiDocContent(docId: string): Promise<{ success: boolean; doc?: any; error?: string }> {
    try {
      return { success: true, doc: await call('getAiDoc', { docId }) };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không tải được nội dung tài liệu.') };
    }
  },

  /** Xem thử: với câu hỏi này, Trợ lý sẽ được gửi kèm những đoạn tài liệu / thông tin thiết bị nào. */
  async previewAiContext(question: string, equipmentId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      return { success: true, data: await call('aiContext', { question, equipmentId, maxChars: 7000 }) };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không kiểm tra được.') };
    }
  },

  /* ---------------- Email / hộp thư ---------------- */
  async sendUpcomingReminderEmail(booking: Booking): Promise<{ success: boolean; email?: EmailNotification; toEmail?: string; error?: string }> {
    try {
      const data = await call('sendReminder', { bookingId: booking.id });
      return { success: true, email: data.email, toEmail: data.toEmail };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không gửi được email nhắc lịch.') };
    }
  },

  markEmailRead(emailId: string): void {
    const m = db.emails.find((x) => x.id === emailId);
    if (!m || m.read) return;
    localUpsert('emails', { ...m, read: true });
    fire('markEmailRead', { emailId });
  },

  markAllEmailsRead(userEmail?: string): void {
    db.emails = db.emails.map((m) =>
      !userEmail || m.toEmail.toLowerCase() === userEmail.toLowerCase() ? { ...m, read: true } : m
    );
    notify();
    fire('markAllEmailsRead', { onlyMine: Boolean(userEmail) });
  },

  /* ---------------- Ghi chú nhanh ---------------- */
  addQuickNote(noteData: Omit<EquipmentQuickNote, 'id' | 'createdAt'>): EquipmentQuickNote {
    const newNote: EquipmentQuickNote = { ...noteData, id: clientId('qnote'), createdAt: new Date().toISOString() };
    localUpsert('quickNotes', newNote);
    fire('addQuickNote', newNote);
    return newNote;
  },

  updateQuickNote(updatedNote: EquipmentQuickNote): void {
    localUpsert('quickNotes', { ...updatedNote, updatedAt: new Date().toISOString() });
    fire('updateQuickNote', updatedNote);
  },

  deleteQuickNote(noteId: string): void {
    localRemove('quickNotes', noteId);
    fire('deleteQuickNote', { id: noteId });
  },

  togglePinQuickNote(noteId: string): void {
    const n = db.quickNotes.find((x) => x.id === noteId);
    if (n) this.updateQuickNote({ ...n, isPinned: !n.isPinned });
  },

  /* ---------------- Bảo trì ---------------- */
  addMaintenanceRecord(recordData: Omit<MaintenanceRecord, 'id' | 'createdAt'>): { success: boolean; record: MaintenanceRecord } {
    const record: MaintenanceRecord = { ...recordData, id: clientId('maint'), createdAt: new Date().toISOString() };
    localUpsert('maintenance', record);
    const eq = db.equipment.find((e) => e.id === recordData.equipmentId);
    if (eq) localUpsert('equipment', { ...eq, status: 'available', lastMaintenanceDate: recordData.performedDate });
    fire('addMaintenanceRecord', record);
    return { success: true, record };
  },

  deleteMaintenanceRecord(recordId: string): void {
    localRemove('maintenance', recordId);
    fire('deleteMaintenanceRecord', { id: recordId });
  },

  /* ---------------- Đặt lịch ---------------- */
  async createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    try {
      const data = await call('createBooking', bookingData);
      return { success: true, booking: data.booking };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Có lỗi xảy ra khi tạo lịch.') };
    }
  },

  async cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await call('cancelBooking', { bookingId });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không thể hủy lịch.') };
    }
  },

  /* ---------------- Nhận máy / trả máy ---------------- */
  async checkInEquipment(params: {
    bookingId?: string;
    equipmentId: string;
    userId: string;
    initialCondition: MachineCondition;
    operatorNotes: string;
    sampleCount?: number;
    projectId?: string;
    projectCode?: string;
  }): Promise<{ success: boolean; log?: UsageLog; error?: string }> {
    try {
      const data = await call('checkIn', params);
      return { success: true, log: data.log };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Lỗi khi nhận máy.') };
    }
  },

  async checkOutEquipment(params: {
    logId: string;
    finalCondition: MachineCondition;
    operatorNotesAddendum?: string;
    supervisorNotes?: string;
    incidentReport?: IncidentReport;
    sampleCount?: number;
    consumedSupplies?: ConsumedSupplyItem[];
  }): Promise<{ success: boolean; log?: UsageLog; error?: string }> {
    try {
      const data = await call('checkOut', params);
      return { success: true, log: data.log };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Lỗi khi trả máy.') };
    }
  },

  /* ---------------- Quản trị ---------------- */
  upsertEquipment(equipment: Equipment): void {
    localUpsert('equipment', equipment);
    fire('upsertEquipment', { equipment });
  },

  async deleteEquipment(equipmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await call('deleteEquipment', { id: equipmentId });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không thể xóa thiết bị.') };
    }
  },

  async upsertUser(user: User): Promise<{ success: boolean; user?: User; password?: string; error?: string }> {
    try {
      const data = await call('upsertUser', { user });
      return { success: true, user: data.user, password: data.password };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không lưu được tài khoản.') };
    }
  },

  toggleUserStatus(userId: string): void {
    const u = db.users.find((x) => x.id === userId);
    if (u) localUpsert('users', { ...u, status: u.status === 'active' ? 'suspended' : 'active' });
    fire('toggleUserStatus', { userId });
  },

  upsertProject(project: ResearchProject): void {
    localUpsert('projects', project);
    fire('upsertProject', { project });
  },

  async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await call('deleteProject', { id: projectId });
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không thể xóa đề tài.') };
    }
  },

  upsertConsumableSupply(supply: ConsumableSupply): void {
    localUpsert('supplies', supply);
    fire('upsertSupply', { supply });
  },

  /** Admin: nạp danh mục thiết bị (kèm SOP), vật tư, ghi chú và lịch sử bảo trì mẫu. Không ghi đè dữ liệu đã có. */
  async importSampleData(): Promise<{ success: boolean; counts?: Record<string, number>; error?: string }> {
    try {
      const mock = await import('../data/mockData');
      const data = await call('importSampleData', {
        equipment: mock.INITIAL_EQUIPMENT,
        supplies: mock.INITIAL_CONSUMABLE_SUPPLIES,
        quickNotes: mock.INITIAL_QUICK_NOTES,
        maintenance: mock.INITIAL_MAINTENANCE_RECORDS,
        projects: mock.INITIAL_PROJECTS,
      });
      return { success: true, counts: data.counts };
    } catch (e) {
      return { success: false, error: errMsg(e, 'Không nạp được dữ liệu mẫu.') };
    }
  },

  // Calculate deep project metrics: sessions, hours, supplies, budget used
  getProjectSummary(projectId: string) {
    const project = this.getProjectById(projectId);
    const bookings = this.getBookings().filter((b) => b.projectId === projectId || (project && b.projectCode === project.code));
    const logs = this.getLogs().filter((l) => l.projectId === projectId || (project && l.projectCode === project.code));

    const totalActualMinutes = logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    const totalActualHours = parseFloat((totalActualMinutes / 60).toFixed(1));
    const totalSamplesCount = logs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);

    const supplyMap: Record<string, {
      supplyCode: string;
      supplyName: string;
      unit: string;
      totalQuantity: number;
      unitCostVND: number;
      totalCostVND: number;
    }> = {};

    let totalMaterialCostVND = 0;

    logs.forEach((log) => {
      if (log.consumedSupplies && log.consumedSupplies.length > 0) {
        log.consumedSupplies.forEach((item) => {
          const cost = item.totalCostVND || (item.quantity * item.unitCostVND) || 0;
          totalMaterialCostVND += cost;

          if (!supplyMap[item.supplyCode]) {
            supplyMap[item.supplyCode] = {
              supplyCode: item.supplyCode,
              supplyName: item.supplyName,
              unit: item.unit,
              totalQuantity: 0,
              unitCostVND: item.unitCostVND,
              totalCostVND: 0,
            };
          }
          supplyMap[item.supplyCode].totalQuantity += item.quantity;
          supplyMap[item.supplyCode].totalCostVND += cost;
        });
      } else if (log.materialCostVND) {
        totalMaterialCostVND += log.materialCostVND;
      }
    });

    const materialBudget = project?.materialBudgetVND || 1;
    const budgetConsumedPercentage = Math.min(Math.round((totalMaterialCostVND / materialBudget) * 100), 100);
    const remainingMaterialBudgetVND = Math.max((project?.materialBudgetVND || 0) - totalMaterialCostVND, 0);

    const equipmentHoursMap: Record<string, number> = {};
    logs.forEach((log) => {
      equipmentHoursMap[log.equipmentId] = (equipmentHoursMap[log.equipmentId] || 0) + ((log.durationMinutes || 0) / 60);
    });

    return {
      project,
      totalBookingsCount: bookings.length,
      totalActualHours,
      totalSamplesCount,
      totalMaterialCostVND,
      budgetConsumedPercentage,
      remainingMaterialBudgetVND,
      suppliesSummary: Object.values(supplyMap).sort((a, b) => b.totalCostVND - a.totalCostVND),
      equipmentHoursMap,
    };
  },

  // Export Project Consumable Material Report to Excel / CSV with UTF-8 BOM
  exportProjectMaterialReportToCSV(params: {
    projectId?: string;
    projects: ResearchProject[];
    logs: UsageLog[];
    bookings: Booking[];
    equipment: Equipment[];
    users: User[];
  }): void {
    const { projectId, projects, logs, equipment, users } = params;
    const selectedProject = projectId && projectId !== 'all' ? projects.find((p) => p.id === projectId) : null;
    const eqMap = new Map(equipment.map((e) => [e.id, e]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const filteredLogs = logs.filter((log) => {
      if (selectedProject) {
        return log.projectId === selectedProject.id || log.projectCode === selectedProject.code;
      }
      return Boolean(log.projectId || log.projectCode);
    });

    const summaryRows = [
      'BÁO CÁO TỔNG HỢP TIÊU HAO VẬT TƯ THEO DỰ ÁN NGHIÊN CỨU',
      `Hệ thống Quản lý Thiết bị & Sổ Nhật ký Phòng Thí nghiệm LabLog Pro`,
      `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`,
      `Dự án: ${selectedProject ? `[${selectedProject.code}] ${selectedProject.name}` : 'TẤT CẢ CÁC ĐỀ TÀI NGHIÊN CỨU'}`,
      selectedProject ? `Chủ nhiệm đề tài (PI): ${selectedProject.principalInvestigator} - ${selectedProject.department}` : '',
      selectedProject ? `Ngân sách vật tư được duyệt: ${selectedProject.materialBudgetVND.toLocaleString('vi-VN')} VNĐ` : '',
      '',
      '--- DANH SÁCH CHI TIẾT TỪNG CA VẬN HÀNH & TIÊU HAO VẬT TƯ ---',
    ].filter(Boolean);

    const headers = [
      'STT',
      'Mã Đề Tài / Dự Án',
      'Mã Ca Nhật Ký',
      'Thời Điểm Check-in',
      'Thời Lượng (phút)',
      'Mã Thiết Bị',
      'Tên Thiết Bị',
      'Nghiên Cứu Viên / Giảng Viên',
      'Khoa / Viện',
      'Số Mẫu Đo',
      'Danh Mục Vật Tư Tiêu Hao',
      'Tổng Chi Phí Vật Tư (VNĐ)',
      'Ghi Chú Vận Hành',
    ];

    let totalSumCost = 0;

    const dataRows = filteredLogs.map((log, idx) => {
      const eq = eqMap.get(log.equipmentId);
      const u = userMap.get(log.userId);
      const proj = projects.find((p) => p.id === log.projectId || p.code === log.projectCode);
      const projCode = proj ? proj.code : (log.projectCode || 'N/A');

      const suppliesStr = log.consumedSupplies && log.consumedSupplies.length > 0
        ? log.consumedSupplies.map((s) => `${s.supplyName} (${s.quantity} ${s.unit})`).join('; ')
        : 'Không phát sinh vật tư tính phí';

      const cost = log.materialCostVND || (log.consumedSupplies?.reduce((acc, s) => acc + s.totalCostVND, 0) || 0);
      totalSumCost += cost;

      return [
        idx + 1,
        `"${projCode}"`,
        `"${log.id}"`,
        `"${log.checkInTime ? new Date(log.checkInTime).toLocaleString('vi-VN') : ''}"`,
        `"${log.durationMinutes || 0}"`,
        `"${eq?.code || log.equipmentId}"`,
        `"${(eq?.name || '').replace(/"/g, '""')}"`,
        `"${(u?.name || log.userId).replace(/"/g, '""')}"`,
        `"${(u?.department || '').replace(/"/g, '""')}"`,
        `"${log.sampleCount || 0}"`,
        `"${suppliesStr.replace(/"/g, '""')}"`,
        cost,
        `"${(log.operatorNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const totalRow = [
      '',
      '"TỔNG CỘNG"',
      `"${filteredLogs.length} ca"`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '"Tổng chi phí vật tư đã sử dụng"',
      totalSumCost,
      '',
    ].join(',');

    const csvContent = '\uFEFF' + [...summaryRows, headers.join(','), ...dataRows, totalRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeProj = selectedProject ? selectedProject.code : 'Tat_ca_du_an';
    link.download = `Bao_cao_tieu_hao_vat_tu_${safeProj}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },


  // Export to Excel / CSV with UTF-8 BOM
  exportLogsToCSV(logs: UsageLog[], equipment: Equipment[], users: User[]): void {
    const equipmentMap = new Map(equipment.map((e) => [e.id, e]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const conditionLabel = (c?: MachineCondition) => {
      switch (c) {
        case 'good':
          return 'Tốt / Bình thường';
        case 'minor_wear':
          return 'Hao mòn nhẹ';
        case 'needs_calibration':
          return 'Cần hiệu chuẩn';
        case 'damaged':
          return 'Hỏng / Sự cố';
        default:
          return 'Chưa ghi nhận';
      }
    };

    const headers = [
      'Mã Nhật Ký',
      'Mã Thiết Bị',
      'Tên Thiết Bị',
      'Người Sử Dụng',
      'Đơn Vị / Khoa',
      'Thời Điểm Check-in',
      'Thời Điểm Check-out',
      'Thời Gian Dùng (phút)',
      'Số Lượng Mẫu',
      'Tình Trạng Trước Khi Dùng',
      'Tình Trạng Sau Khi Dùng',
      'Có Sự Cố Không',
      'Mức Độ Sự Cố',
      'Mô Tả Sự Cố',
      'Ghi Chú Người Vận Hành',
    ];

    const rows = logs.map((log) => {
      const eq = equipmentMap.get(log.equipmentId);
      const u = userMap.get(log.userId);
      const inc = log.incidentReport;

      return [
        `"${log.id}"`,
        `"${eq?.code || log.equipmentId}"`,
        `"${(eq?.name || '').replace(/"/g, '""')}"`,
        `"${(u?.name || log.userId).replace(/"/g, '""')}"`,
        `"${(u?.department || '').replace(/"/g, '""')}"`,
        `"${log.checkInTime ? new Date(log.checkInTime).toLocaleString('vi-VN') : ''}"`,
        `"${log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('vi-VN') : 'Đang sử dụng'}"`,
        `"${log.durationMinutes || ''}"`,
        `"${log.sampleCount || 0}"`,
        `"${conditionLabel(log.initialCondition)}"`,
        `"${conditionLabel(log.finalCondition)}"`,
        `"${inc?.hasIncident ? 'CÓ SỰ CỐ' : 'Bình thường'}"`,
        `"${inc?.severity || 'Không'}"`,
        `"${(inc?.description || '').replace(/"/g, '""')}"`,
        `"${(log.operatorNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Add UTF-8 BOM so Excel opens Vietnamese characters without garbled font
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nhat_ky_thiet_bi_lab_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportBookingsToCSV(bookings: Booking[], equipment: Equipment[], users: User[]): void {
    const equipmentMap = new Map(equipment.map((e) => [e.id, e]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const statusLabel = (s: string) => {
      switch (s) {
        case 'confirmed':
          return 'Đã duyệt tự động';
        case 'active':
          return 'Đang chạy máy';
        case 'completed':
          return 'Đã hoàn thành';
        case 'cancelled':
          return 'Đã hủy';
        default:
          return s;
      }
    };

    const headers = [
      'Mã Đăng Ký',
      'Mã Thiết Bị',
      'Tên Thiết Bị',
      'Phòng Lab',
      'Người Đăng Ký',
      'Chức Danh',
      'Ngày Sử Dụng',
      'Giờ Bắt Đầu',
      'Giờ Kết Thúc',
      'Mục Đích Thí Nghiệm',
      'Mã Đề Tài / Dự Án',
      'Trạng Thái',
      'Thời Điểm Đăng Ký',
    ];

    const rows = bookings.map((b) => {
      const eq = equipmentMap.get(b.equipmentId);
      const u = userMap.get(b.userId);

      return [
        `"${b.id}"`,
        `"${eq?.code || b.equipmentId}"`,
        `"${(eq?.name || '').replace(/"/g, '""')}"`,
        `"${(eq?.room || '').replace(/"/g, '""')}"`,
        `"${(u?.name || b.userId).replace(/"/g, '""')}"`,
        `"${(u?.title || '').replace(/"/g, '""')}"`,
        `"${b.date}"`,
        `"${b.startTime}"`,
        `"${b.endTime}"`,
        `"${(b.purpose || '').replace(/"/g, '""')}"`,
        `"${(b.projectCode || '').replace(/"/g, '""')}"`,
        `"${statusLabel(b.status)}"`,
        `"${b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_dang_ky_thiet_bi_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportFilteredReportToCSV(params: {
    startDate: string;
    endDate: string;
    equipmentId: string;
    logs: UsageLog[];
    equipmentList: Equipment[];
    users: User[];
  }): void {
    const { startDate, endDate, equipmentId, logs, equipmentList, users } = params;
    const eqMap = new Map(equipmentList.map((e) => [e.id, e]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const filteredLogs = logs.filter((log) => {
      if (equipmentId !== 'all' && log.equipmentId !== equipmentId) return false;
      const logDate = log.checkInTime.split('T')[0];
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      return true;
    });

    const selectedEq = equipmentId !== 'all' ? eqMap.get(equipmentId) : null;
    const totalMinutes = filteredLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const totalSamples = filteredLogs.reduce((acc, l) => acc + (l.sampleCount || 0), 0);
    const incidentCount = filteredLogs.filter((l) => l.incidentReport?.hasIncident).length;

    const conditionLabel = (c?: MachineCondition) => {
      switch (c) {
        case 'good': return 'Tốt / Bình thường';
        case 'minor_wear': return 'Hao mòn nhẹ';
        case 'needs_calibration': return 'Cần hiệu chuẩn';
        case 'damaged': return 'Hỏng / Sự cố';
        default: return 'Chưa ghi nhận';
      }
    };

    const summaryRows = [
      'BÁO CÁO VẬN HÀNH & SỬ DỤNG THIẾT BỊ PHÒNG THÍ NGHIỆM',
      `Khoảng thời gian:,"Từ ${startDate || 'Ban đầu'} đến ${endDate || 'Hiện tại'}"`,
      `Phạm vi thiết bị:,"${selectedEq ? `[${selectedEq.code}] ${selectedEq.name}` : 'Tất cả thiết bị'}"`,
      `Thời điểm xuất:,"${new Date().toLocaleString('vi-VN')}"`,
      `Tổng số ca chạy máy:,${filteredLogs.length}`,
      `Tổng số giờ hoạt động:,${totalHours} giờ`,
      `Tổng số mẫu phân tích:,${totalSamples} mẫu`,
      `Số sự cố ghi nhận:,${incidentCount} vụ`,
      '',
    ];

    const headers = [
      'STT',
      'Mã Nhật Ký',
      'Mã Thiết Bị',
      'Tên Thiết Bị',
      'Phòng Lab',
      'Người Vận Hành',
      'Khoa / Đơn Vị',
      'Thời Điểm Check-in',
      'Thời Điểm Check-out',
      'Thời Gian Dùng (phút)',
      'Số Lượng Mẫu',
      'Tình Trạng Trước Khi Dùng',
      'Tình Trạng Sau Khi Dùng',
      'Có Sự Cố Không',
      'Mức Độ Sự Cố',
      'Ghi Chú Vận Hành',
    ];

    const dataRows = filteredLogs.map((log, idx) => {
      const eq = eqMap.get(log.equipmentId);
      const u = userMap.get(log.userId);
      const inc = log.incidentReport;

      return [
        idx + 1,
        `"${log.id}"`,
        `"${eq?.code || log.equipmentId}"`,
        `"${(eq?.name || '').replace(/"/g, '""')}"`,
        `"${(eq?.room || '').replace(/"/g, '""')}"`,
        `"${(u?.name || log.userId).replace(/"/g, '""')}"`,
        `"${(u?.department || '').replace(/"/g, '""')}"`,
        `"${log.checkInTime ? new Date(log.checkInTime).toLocaleString('vi-VN') : ''}"`,
        `"${log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('vi-VN') : 'Đang chạy'}"`,
        `"${log.durationMinutes || ''}"`,
        `"${log.sampleCount || 0}"`,
        `"${conditionLabel(log.initialCondition)}"`,
        `"${conditionLabel(log.finalCondition)}"`,
        `"${inc?.hasIncident ? 'CÓ SỰ CỐ' : 'Bình thường'}"`,
        `"${inc?.severity || 'Không'}"`,
        `"${(log.operatorNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [...summaryRows, headers.join(','), ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeEqName = selectedEq ? selectedEq.code : 'Tat_ca_thiet_bi';
    link.download = `Bao_cao_su_dung_${safeEqName}_${startDate || 'dau'}_den_${endDate || 'nay'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
