/**
 * LabLog Pro — Máy chủ nghiệp vụ chạy trên Google Apps Script, dữ liệu lưu trong Google Sheets.
 *
 * Cài đặt (chi tiết trong README.md):
 *   1. Mở Google Sheet → Tiện ích mở rộng → Apps Script → dán toàn bộ file này.
 *   2. Chọn hàm `caiDat` → Chạy → cấp quyền. Mở "Nhật ký thực thi" để lấy PROXY_KEY và mật khẩu Admin.
 *   3. Triển khai → Tùy chọn triển khai mới → Ứng dụng web (Thực thi: Tôi · Truy cập: Bất kỳ ai).
 *
 * Trình duyệt KHÔNG gọi thẳng vào đây. Mọi yêu cầu đi qua Cloudflare Worker, Worker gắn PROXY_KEY bí mật.
 *
 * Thuộc tính tập lệnh (Cài đặt dự án → Thuộc tính tập lệnh), đều tùy chọn trừ PROXY_KEY:
 *   PROXY_KEY              Khóa bí mật dùng chung với Worker (caiDat tự tạo).
 *   APP_URL                Địa chỉ trang web, dùng cho đường dẫn trong email. Ví dụ https://lablog.ten.workers.dev
 *   LAB_NAME               Tên phòng thí nghiệm hiển thị trong email.
 *   REGISTRATION           approval (mặc định: tự đăng ký, chờ Admin kích hoạt) | open (vào được ngay) | closed (chỉ Admin tạo)
 *   ALLOWED_EMAIL_DOMAINS  Giới hạn tên miền email khi tự đăng ký, cách nhau dấu phẩy. Ví dụ ump.edu.vn
 *   SEND_EMAIL             true (mặc định) | false — tắt gửi email thật (vẫn lưu hộp thư trong ứng dụng).
 */

var TZ = 'Asia/Ho_Chi_Minh';
var APP = 'LabLog Pro';
var SESSION_SECONDS = 6 * 60 * 60;   // phiên đăng nhập: 6 giờ kể từ lần thao tác cuối
var MAX_LOGIN_FAIL = 5;              // sai mật khẩu 5 lần → khóa tạm
var LOGIN_LOCK_SECONDS = 15 * 60;
var MAX_CELL = 49000;                // Google Sheets giới hạn 50.000 ký tự / ô

/* ============================================================================
 * 1. LƯỢC ĐỒ DỮ LIỆU — mỗi bảng là một sheet, dòng 1 là tên cột.
 *    Cột được nhận theo TÊN, nên có thể đổi thứ tự hoặc thêm cột ghi chú riêng mà không hỏng.
 * ========================================================================== */
var SCHEMA = {
  users: {
    sheet: 'NguoiDung',
    cols: ['id', 'email', 'name', 'role', 'title', 'department', 'phone', 'status', 'avatarBg', 'createdAt', 'passwordHash', 'salt'],
  },
  equipment: {
    sheet: 'ThietBi',
    cols: ['id', 'code', 'name', 'category', 'room', 'building', 'status', 'manufacturer', 'model', 'specs', 'safetyGuidelines',
      'maxBookingHoursPerSession', 'maintenanceSchedule', 'responsibleStaff', 'sopTitle', 'sopDocCode', 'sopSteps', 'videoTutorial',
      'manualDocName', 'quickChecklist', 'emergencyContact', 'maintenanceConfig', 'lastMaintenanceDate'],
    num: ['maxBookingHoursPerSession'],
    json: ['sopSteps', 'videoTutorial', 'quickChecklist', 'maintenanceConfig'],
  },
  bookings: {
    sheet: 'LichDat',
    cols: ['id', 'equipmentId', 'userId', 'date', 'startTime', 'endTime', 'purpose', 'projectId', 'projectCode', 'plannedSupplies',
      'status', 'createdAt', 'notes', 'cancelledBy', 'cancelledAt'],
    json: ['plannedSupplies'],
  },
  logs: {
    sheet: 'NhatKySuDung',
    cols: ['id', 'bookingId', 'equipmentId', 'userId', 'checkInTime', 'checkOutTime', 'durationMinutes', 'initialCondition',
      'finalCondition', 'sampleCount', 'incidentReport', 'projectId', 'projectCode', 'consumedSupplies', 'materialCostVND',
      'operatorNotes', 'supervisorNotes'],
    num: ['durationMinutes', 'sampleCount', 'materialCostVND'],
    json: ['incidentReport', 'consumedSupplies'],
  },
  emails: {
    sheet: 'ThongBao',
    cols: ['id', 'toEmail', 'toName', 'type', 'subject', 'sentAt', 'bookingId', 'equipmentId', 'equipmentCode', 'equipmentName',
      'room', 'date', 'timeSlot', 'read', 'htmlPreview'],
    bool: ['read'],
    json: ['htmlPreview'],
  },
  quickNotes: {
    sheet: 'GhiChuNhanh',
    cols: ['id', 'equipmentId', 'authorId', 'authorName', 'authorTitle', 'authorDepartment', 'title', 'content', 'category',
      'parameters', 'isPinned', 'createdAt', 'updatedAt'],
    bool: ['isPinned'],
    json: ['parameters'],
  },
  maintenance: {
    sheet: 'BaoTri',
    cols: ['id', 'equipmentId', 'maintenanceType', 'performedDate', 'technicianName', 'agencyOrVendor', 'certificateNumber',
      'operatingHoursAtService', 'costVND', 'notes', 'replacedParts', 'nextRecommendedDueDate', 'createdAt'],
    num: ['operatingHoursAtService', 'costVND'],
    json: ['replacedParts'],
  },
  projects: {
    sheet: 'DeTai',
    cols: ['id', 'code', 'name', 'principalInvestigator', 'piEmail', 'department', 'fundingAgency', 'startDate', 'endDate',
      'budgetTotalVND', 'materialBudgetVND', 'status', 'colorTag', 'description', 'createdAt', 'createdBy'],
    num: ['budgetTotalVND', 'materialBudgetVND'],
  },
  supplies: {
    sheet: 'VatTu',
    cols: ['id', 'code', 'name', 'category', 'unit', 'unitCostVND', 'stockQuantity', 'compatibleCategory'],
    num: ['unitCostVND', 'stockQuantity'],
  },
};
var AUDIT_SHEET = 'LichSuThaoTac';
var AUDIT_COLS = ['thoiGian', 'nguoiThucHien', 'hanhDong', 'chiTiet'];

var DATE_COLS = ['date', 'performedDate', 'nextRecommendedDueDate', 'startDate', 'endDate', 'lastMaintenanceDate'];
var TIME_COLS = ['startTime', 'endTime'];
var SECRET_COLS = ['passwordHash', 'salt'];

var ROLES = ['admin', 'instructor', 'researcher'];
var CONDITIONS = ['good', 'minor_wear', 'needs_calibration', 'damaged'];
var EQ_STATUS = ['available', 'in_use', 'maintenance'];
var EQ_CATEGORIES = ['Quang phổ & Quang học', 'Sắc ký & Khối phổ', 'Kính hiển vi & Hình ảnh', 'Sinh học phân tử & Ly tâm',
  'Nhiệt & Phân tích vật liệu', 'Đo lường & Phân tích cơ bản'];
var NOTE_CATEGORIES = ['config', 'tip', 'warning', 'protocol'];
var MAINT_TYPES = ['periodic_inspection', 'calibration', 'preventive', 'overhaul', 'emergency_repair'];
var AVATARS = ['bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-teal-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600'];

/* ============================================================================
 * 2. TIỆN ÍCH CHUNG
 * ========================================================================== */
function prop_(k, d) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return v === null || v === undefined || v === '' ? d : v;
}

function fail_(msg, code) {
  var e = new Error(msg);
  e.userMsg = msg;
  e.code = code || 'INVALID';
  return e;
}

function fmt_(d, pattern) {
  return Utilities.formatDate(d, TZ, pattern);
}

function now_() {
  var d = new Date();
  var hm = fmt_(d, 'HH:mm');
  return { iso: d.toISOString(), date: fmt_(d, 'yyyy-MM-dd'), hm: hm, min: toMin_(hm), ms: d.getTime() };
}

function toMin_(hm) {
  var p = String(hm).split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

function newId_(prefix) {
  return prefix + '-' + Date.now().toString(36) + Utilities.getUuid().replace(/-/g, '').slice(0, 6);
}

function str_(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max || 500);
}

function optStr_(v, max) {
  var s = str_(v, max);
  return s ? s : undefined;
}

function num_(v, min, max) {
  var n = Number(v);
  if (!isFinite(n)) return undefined;
  if (min !== undefined && n < min) n = min;
  if (max !== undefined && n > max) n = max;
  return n;
}

function oneOf_(v, list, label) {
  if (list.indexOf(v) < 0) throw fail_(label + ' không hợp lệ.');
  return v;
}

function isEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isDate_(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isTime_(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function randomPassword_() {
  var chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  for (var i = 0; i < 10; i++) out += chars.charAt((bytes[i] + 256) % chars.length);
  return out;
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================================================================
 * 3. TẦNG DỮ LIỆU
 *    - Mọi ô định dạng Văn bản thuần (@) để Sheets không tự đổi "08:00", "0901..." hay ngày tháng.
 *    - Thao tác CHỈ ĐỌC (đăng nhập, tải dữ liệu) lấy bảng từ CacheService (nhanh, ~vài chục ms)
 *      thay vì đọc sheet (~0,1–0,3 giây mỗi sheet).
 *    - Thao tác GHI luôn đọc thẳng từ sheet (trong khóa), ghi xong cập nhật lại bộ nhớ đệm.
 *    - Sửa tay trên Google Sheet → trigger onChange xóa bộ nhớ đệm (cài bằng caiDat).
 * ========================================================================== */
var _T = {};          // bảng đã nạp trong một lần chạy
var FRESH = false;    // true khi đang trong thao tác ghi: luôn đọc thẳng từ sheet
var PENDING = [];     // bảng đọc từ sheet ở chế độ chỉ đọc, chờ đưa vào bộ nhớ đệm
var _VER = null;      // phiên bản dữ liệu (đổi sau mỗi lần ghi)
var PATCH = {};       // các bản ghi đã thay đổi, gửi về trình duyệt
var REMOVED = {};     // id đã xóa
var OUTBOX = [];      // email chờ gửi sau khi nhả khóa
var AUDIT = [];       // dòng nhật ký thao tác

var CACHE_TTL = 6 * 60 * 60;  // tối đa của CacheService
var CACHE_CHUNK = 25000;      // ký tự / phần (giới hạn 100 KB / khóa)

function resetRequest_() {
  _T = {}; FRESH = false; PENDING = []; _VER = null; PATCH = {}; REMOVED = {}; OUTBOX = []; AUDIT = [];
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var def = SCHEMA[name];
  var sh = ss.getSheetByName(def.sheet);
  if (!sh) throw fail_('Thiếu sheet "' + def.sheet + '". Hãy chạy hàm caiDat trong Apps Script.', 'SETUP');
  return sh;
}

function tbl_(name) {
  var t = _T[name];
  if (t && (!FRESH || !t.fromCache)) return t;
  if (!FRESH) {
    var cached = cacheGet_(name);
    if (cached) return (_T[name] = cached);
    var gen = CacheService.getScriptCache().get('tg:' + name);
    t = readSheet_(name);
    PENDING.push({ name: name, gen: gen });
    return (_T[name] = t);
  }
  return (_T[name] = readSheet_(name));
}

function readSheet_(name) {
  var def = SCHEMA[name];
  var sh = sheet_(name);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var lastRow = sh.getLastRow();
  var values = lastRow > 0 ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
  var headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  while (headers.length && !headers[headers.length - 1]) headers.pop();

  var missing = def.cols.filter(function (c) { return headers.indexOf(c) < 0; });
  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    headers = headers.concat(missing);
  }

  var t = { name: name, def: def, sh: sh, headers: headers, rows: [], rowOf: {}, raw: {}, fromCache: false, dirty: false };
  var display = null; // chỉ đọc khi gặp ô giờ do người sửa tay (Sheets lưu thành ngày 30/12/1899)
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key || def.cols.indexOf(key) < 0) continue;
      var cell = r[c];
      if (TIME_COLS.indexOf(key) >= 0 && isDateObj_(cell)) {
        if (!display) display = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();
        var m = /(\d{1,2}):(\d{2})/.exec(String(display[i][c]));
        cell = m ? ('0' + m[1]).slice(-2) + ':' + m[2] : cell;
      }
      var val = fromCell_(def, key, cell);
      if (val !== undefined) obj[key] = val;
    }
    if (!obj.id) continue;
    t.rows.push(obj);
    t.rowOf[obj.id] = i + 1;
    t.raw[obj.id] = r;
  }
  return t;
}

/** Bảng dùng để ghi: bảo đảm đọc thẳng từ sheet. */
function tblW_(name) {
  if (!FRESH) throw new Error('Ghi dữ liệu ngoài khóa: ' + name);
  return tbl_(name);
}

function cacheGet_(name) {
  try {
    var cache = CacheService.getScriptCache();
    var metaRaw = cache.get('tm:' + name);
    if (!metaRaw) return null;
    var meta = JSON.parse(metaRaw);
    var keys = [];
    for (var i = 0; i < meta.n; i++) keys.push('tp:' + name + ':' + meta.g + ':' + i);
    var parts = cache.getAll(keys);
    var str = '';
    for (var k = 0; k < keys.length; k++) {
      if (parts[keys[k]] === undefined || parts[keys[k]] === null) return null;
      str += parts[keys[k]];
    }
    var data = JSON.parse(str);
    return { name: name, def: SCHEMA[name], sh: null, headers: data.h, rows: data.r, rowOf: data.o, raw: {}, fromCache: true, dirty: false };
  } catch (e) {
    return null;
  }
}

function cachePut_(t, gen) {
  try {
    var cache = CacheService.getScriptCache();
    var str = JSON.stringify({ h: t.headers, r: t.rows, o: t.rowOf });
    var g = gen || Utilities.getUuid().slice(0, 8);
    var parts = {};
    var n = 0;
    for (var i = 0; i < str.length; i += CACHE_CHUNK) parts['tp:' + t.name + ':' + g + ':' + n++] = str.slice(i, i + CACHE_CHUNK);
    cache.putAll(parts, CACHE_TTL);
    cache.put('tm:' + t.name, JSON.stringify({ g: g, n: n }), CACHE_TTL);
  } catch (e) {
    // bảng quá lớn hoặc bộ nhớ đệm đầy: lần sau đọc thẳng từ sheet
    CacheService.getScriptCache().remove('tm:' + t.name);
  }
}

/** Sau thao tác ghi (đang giữ khóa): cập nhật bộ nhớ đệm các bảng đã đổi + tăng phiên bản dữ liệu. */
function commitWrites_() {
  var changed = false;
  var cache = CacheService.getScriptCache();
  Object.keys(_T).forEach(function (name) {
    var t = _T[name];
    if (!t.dirty) return;
    changed = true;
    var gen = Utilities.getUuid().slice(0, 8);
    cache.put('tg:' + name, gen, CACHE_TTL);  // báo cho các lần đọc đang dở rằng bảng đã đổi
    cachePut_(t, gen);
  });
  if (changed) bumpVer_();
}

/** Sau thao tác chỉ đọc: đưa các bảng vừa đọc từ sheet vào bộ nhớ đệm, nếu trong lúc đó không ai ghi. */
function fillCache_() {
  if (!PENDING.length) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(300)) return;
  try {
    var cache = CacheService.getScriptCache();
    PENDING.forEach(function (p) {
      if (cache.get('tg:' + p.name) === p.gen) cachePut_(_T[p.name]);
    });
  } finally {
    lock.releaseLock();
  }
  PENDING = [];
}

function dataVer_() {
  if (_VER === null) _VER = prop_('DATA_VER', '0');
  return _VER;
}

function bumpVer_() {
  _VER = Date.now().toString(36) + Utilities.getUuid().slice(0, 4);
  PropertiesService.getScriptProperties().setProperty('DATA_VER', _VER);
}

/** Xóa toàn bộ bộ nhớ đệm (khi sửa tay trên Sheet, hoặc chạy từ menu). */
function xoaBoNhoDem() {
  var cache = CacheService.getScriptCache();
  Object.keys(SCHEMA).forEach(function (name) {
    cache.remove('tm:' + name);
    cache.put('tg:' + name, Utilities.getUuid().slice(0, 8), CACHE_TTL);
  });
  bumpVer_();
}

/** Trigger cài đặt (onChange): mọi chỉnh sửa tay trên file Sheet. */
function khiSheetThayDoi() {
  xoaBoNhoDem();
}

function isDateObj_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

function fromCell_(def, key, v) {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.charAt(0) === "'" && v.charAt(1) === '=') v = v.slice(1);
  if (isDateObj_(v)) {
    if (DATE_COLS.indexOf(key) >= 0) return fmt_(v, 'yyyy-MM-dd');
    if (TIME_COLS.indexOf(key) >= 0) return fmt_(v, 'HH:mm');
    return v.toISOString();
  }
  if (def.json && def.json.indexOf(key) >= 0) {
    try { return JSON.parse(String(v)); } catch (e) { return undefined; }
  }
  if (def.bool && def.bool.indexOf(key) >= 0) return v === true || String(v).toUpperCase() === 'TRUE';
  if (def.num && def.num.indexOf(key) >= 0) {
    var n = Number(v);
    return isFinite(n) ? n : undefined;
  }
  return String(v);
}

function toCell_(def, key, v) {
  if (v === undefined || v === null) return '';
  var s;
  if (def.json && def.json.indexOf(key) >= 0) s = JSON.stringify(v);
  else if (typeof v === 'boolean') s = v ? 'TRUE' : 'FALSE';
  else s = String(v);
  if (s.charAt(0) === '=') s = "'" + s;   // không để chuỗi người dùng nhập bị hiểu thành công thức
  if (s.length > MAX_CELL) throw fail_('Nội dung trường "' + key + '" quá dài (tối đa ' + MAX_CELL + ' ký tự).');
  return s;
}

function rowFor_(t, obj) {
  var old = t.raw[obj.id];
  return t.headers.map(function (h, i) {
    if (t.def.cols.indexOf(h) < 0) return old ? old[i] : '';   // giữ nguyên cột tự thêm
    return toCell_(t.def, h, obj[h]);
  });
}

function all_(name) { return tbl_(name).rows; }

function find_(name, id) {
  if (!id) return null;
  var t = tbl_(name);
  for (var i = 0; i < t.rows.length; i++) if (t.rows[i].id === id) return t.rows[i];
  return null;
}

function upsert_(name, obj) {
  var t = tblW_(name);
  t.dirty = true;
  var row = rowFor_(t, obj);
  var r = t.rowOf[obj.id];
  if (r) {
    for (var i = 0; i < t.rows.length; i++) if (t.rows[i].id === obj.id) { t.rows[i] = obj; break; }
  } else {
    r = Math.max(t.sh.getLastRow(), 1) + 1;
    t.rows.push(obj);
    t.rowOf[obj.id] = r;
  }
  var rng = t.sh.getRange(r, 1, 1, row.length);
  rng.setNumberFormat('@');
  rng.setValues([row]);
  t.raw[obj.id] = row;
  patch_(name, obj);
  return obj;
}

/** Thêm nhiều dòng một lần (nhập dữ liệu mẫu). Bỏ qua id đã có. */
function insertMany_(name, objs) {
  var t = tblW_(name);
  var fresh = objs.filter(function (o) { return o && o.id && !t.rowOf[o.id]; });
  if (!fresh.length) return 0;
  t.dirty = true;
  var rows = fresh.map(function (o) { return rowFor_(t, o); });
  var start = Math.max(t.sh.getLastRow(), 1) + 1;
  var rng = t.sh.getRange(start, 1, rows.length, t.headers.length);
  rng.setNumberFormat('@');
  rng.setValues(rows);
  fresh.forEach(function (o, i) {
    t.rows.push(o);
    t.rowOf[o.id] = start + i;
    t.raw[o.id] = rows[i];
    patch_(name, o);
  });
  return fresh.length;
}

/** Ghi lại toàn bộ bảng trong một lần (dùng khi cập nhật hàng loạt). */
function rewriteAll_(name, changedIds) {
  var t = tblW_(name);
  if (!t.rows.length) return;
  t.dirty = true;
  var ordered = t.rows.slice().sort(function (a, b) { return t.rowOf[a.id] - t.rowOf[b.id]; });
  var first = t.rowOf[ordered[0].id];
  var last = t.rowOf[ordered[ordered.length - 1].id];
  var block = [];
  var byRow = {};
  ordered.forEach(function (o) { byRow[t.rowOf[o.id]] = o; });
  var existing = t.sh.getRange(first, 1, last - first + 1, t.headers.length).getValues();
  for (var r = first; r <= last; r++) {
    var o = byRow[r];
    block.push(o ? rowFor_(t, o) : existing[r - first]);
  }
  var rng = t.sh.getRange(first, 1, block.length, t.headers.length);
  rng.setNumberFormat('@');
  rng.setValues(block);
  (changedIds || []).forEach(function (id) { var o = find_(name, id); if (o) patch_(name, o); });
}

function remove_(name, id) {
  var t = tblW_(name);
  var r = t.rowOf[id];
  if (!r) return;
  t.dirty = true;
  t.sh.deleteRow(r);
  t.rows = t.rows.filter(function (o) { return o.id !== id; });
  delete t.rowOf[id];
  delete t.raw[id];
  Object.keys(t.rowOf).forEach(function (k) { if (t.rowOf[k] > r) t.rowOf[k]--; });
  (REMOVED[name] = REMOVED[name] || []).push(id);
}

function patch_(name, obj) {
  var clean = name === 'users' ? pubUser_(obj) : obj;
  var list = PATCH[name] = PATCH[name] || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === obj.id) { list[i] = clean; return; }
  list.push(clean);
}

function audit_(user, action, detail) {
  AUDIT.push([now_().iso, user ? user.email : '(khách)', action, str_(detail, 1000)]);
}

function flushAudit_() {
  if (!AUDIT.length) return;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET);
    if (!sh) return;
    AUDIT.forEach(function (row) {
      sh.appendRow(row.map(function (v) { var x = String(v); return x.charAt(0) === '=' ? "'" + x : x; }));
    });
  } catch (e) {
    console.error('Không ghi được nhật ký thao tác: ' + e);
  }
  AUDIT = [];
}

/* ============================================================================
 * 4. XÁC THỰC — mật khẩu băm SHA-256 có muối; phiên là token ký HMAC (dùng PROXY_KEY làm khóa ký).
 * ========================================================================== */
function hashPw_(pw, salt) {
  var h = salt + '|' + pw;
  for (var i = 0; i < 64; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function setPassword_(user, pw) {
  if (!pw || String(pw).length < 6) throw fail_('Mật khẩu phải có ít nhất 6 ký tự.');
  if (String(pw).length > 128) throw fail_('Mật khẩu quá dài.');
  user.salt = Utilities.getUuid();
  user.passwordHash = hashPw_(String(pw), user.salt);
}

function checkPw_(user, pw) {
  if (!user.passwordHash || !user.salt) return false;
  return hashPw_(String(pw || ''), user.salt) === user.passwordHash;
}

function b64url_(bytesOrStr) {
  var s = typeof bytesOrStr === 'string'
    ? Utilities.base64EncodeWebSafe(bytesOrStr, Utilities.Charset.UTF_8)
    : Utilities.base64EncodeWebSafe(bytesOrStr);
  return s.replace(/=+$/, '');
}

function sign_(body) {
  return b64url_(Utilities.computeHmacSha256Signature(body, prop_('PROXY_KEY', ''), Utilities.Charset.UTF_8));
}

/** Token = base64url(JSON{u: userId, e: hết hạn (ms), v: dấu vân tay mật khẩu}) + "." + chữ ký */
function makeToken_(user) {
  var body = b64url_(JSON.stringify({ u: user.id, e: Date.now() + SESSION_SECONDS * 1000, v: String(user.passwordHash || '').slice(0, 10) }));
  return body + '.' + sign_(body);
}

function readToken_(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  var parts = token.split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return null;
  try {
    var json = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0] + '==='.slice((parts[0].length + 3) % 4))).getDataAsString('UTF-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function auth_(token) {
  var p = readToken_(token);
  if (!p || !p.u || !p.e || p.e < Date.now()) throw fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'AUTH');
  if (CacheService.getScriptCache().get('lo:' + token.split('.')[1])) throw fail_('Bạn đã đăng xuất. Vui lòng đăng nhập lại.', 'AUTH');
  var user = find_('users', p.u);
  if (!user) throw fail_('Tài khoản không còn tồn tại.', 'AUTH');
  if (user.status !== 'active') throw fail_('Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Admin.', 'AUTH');
  if (String(user.passwordHash || '').slice(0, 10) !== p.v) throw fail_('Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.', 'AUTH');
  return user;
}

function pubUser_(u) {
  var o = {};
  Object.keys(u).forEach(function (k) { if (SECRET_COLS.indexOf(k) < 0) o[k] = u[k]; });
  return o;
}

function isAdmin_(u) { return u && u.role === 'admin'; }

function requireAdmin_(u) {
  if (!isAdmin_(u)) throw fail_('Chỉ Quản trị viên mới được thực hiện thao tác này.', 'FORBIDDEN');
}

function admins_() {
  return all_('users').filter(function (u) { return u.role === 'admin' && u.status === 'active'; });
}

function findUserByEmail_(email) {
  var e = String(email || '').trim().toLowerCase();
  var list = all_('users');
  for (var i = 0; i < list.length; i++) if (String(list[i].email).toLowerCase() === e) return list[i];
  return null;
}

/* ============================================================================
 * 5. ĐIỂM VÀO WEB APP
 * ========================================================================== */
function doGet() {
  return json_({ ok: true, app: APP, time: now_().iso });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (x) {
    return json_({ ok: false, error: 'Yêu cầu không hợp lệ.', code: 'BAD_REQUEST' });
  }
  var key = prop_('PROXY_KEY', '');
  if (!key || req.key !== key) {
    return json_({ ok: false, error: 'Sai khóa kết nối PROXY_KEY giữa Cloudflare và Apps Script.', code: 'BAD_KEY' });
  }
  return json_(handle_(req));
}

function handle_(req) {
  resetRequest_();
  var action = String(req.action || '');
  var fn = ACTIONS[action];
  var lock = null;
  var ctx = { ip: str_(req.ip, 64), payload: req.payload || {}, token: req.token, user: null };
  try {
    if (!fn) throw fail_('Thao tác không được hỗ trợ: ' + action, 'BAD_ACTION');
    if (WRITE_ACTIONS.indexOf(action) >= 0) {
      var l = LockService.getScriptLock();
      if (!l.tryLock(25000)) throw fail_('Hệ thống đang bận xử lý yêu cầu khác. Vui lòng thử lại sau vài giây.', 'BUSY');
      lock = l;
      FRESH = true;
    }
    if (PUBLIC_ACTIONS.indexOf(action) < 0) ctx.user = auth_(req.token);
    var data = fn(ctx);
    var res = { ok: true, data: data === undefined ? null : data, patch: PATCH, removed: REMOVED };
    if (ctx.user && PUBLIC_ACTIONS.indexOf(action) < 0 && action !== 'logout') res.token = makeToken_(ctx.user);
    return res;
  } catch (x) {
    if (!x.userMsg) console.error(action + ': ' + (x.stack || x));
    return { ok: false, error: x.userMsg || ('Lỗi máy chủ: ' + x.message), code: x.code || 'SERVER' };
  } finally {
    if (lock) {
      try {
        commitWrites_();
        flushAudit_();
        SpreadsheetApp.flush();
      } finally {
        lock.releaseLock();
      }
    } else {
      flushAudit_();
      fillCache_();
    }
    sendOutbox_();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

var PUBLIC_ACTIONS = ['login', 'register', 'requestReset', 'resetPassword', 'publicConfig'];
var WRITE_ACTIONS = ['register', 'resetPassword','changePassword', 'createBooking', 'cancelBooking',
  'checkIn', 'checkOut', 'sendReminder', 'markEmailRead', 'markAllEmailsRead', 'addQuickNote', 'updateQuickNote',
  'deleteQuickNote', 'addMaintenanceRecord', 'deleteMaintenanceRecord', 'upsertEquipment', 'deleteEquipment', 'upsertUser',
  'toggleUserStatus', 'upsertProject', 'deleteProject', 'upsertSupply', 'importSampleData'];

var ACTIONS = {
  publicConfig: function () { return publicConfig_(); },
  login: login_,
  register: register_,
  requestReset: requestReset_,
  resetPassword: resetPassword_,
  bootstrap: function (ctx) {
    var since = ctx.payload && ctx.payload.since;
    if (since && since === dataVer_()) return { same: true, ver: since };
    return bootstrap_(ctx.user);
  },
  logout: logout_,
  changePassword: changePassword_,
  createBooking: createBooking_,
  cancelBooking: cancelBooking_,
  checkIn: checkIn_,
  checkOut: checkOut_,
  sendReminder: sendReminder_,
  markEmailRead: markEmailRead_,
  markAllEmailsRead: markAllEmailsRead_,
  addQuickNote: addQuickNote_,
  updateQuickNote: updateQuickNote_,
  deleteQuickNote: deleteQuickNote_,
  addMaintenanceRecord: addMaintenanceRecord_,
  deleteMaintenanceRecord: deleteMaintenanceRecord_,
  upsertEquipment: upsertEquipment_,
  deleteEquipment: deleteEquipment_,
  upsertUser: upsertUser_,
  toggleUserStatus: toggleUserStatus_,
  upsertProject: upsertProject_,
  deleteProject: deleteProject_,
  upsertSupply: upsertSupply_,
  importSampleData: importSampleData_,
};

/* ============================================================================
 * 6. TÀI KHOẢN
 * ========================================================================== */
function publicConfig_() {
  return {
    registration: prop_('REGISTRATION', 'approval'),
    labName: prop_('LAB_NAME', 'Phòng Thí nghiệm'),
    allowedDomains: prop_('ALLOWED_EMAIL_DOMAINS', ''),
  };
}

function login_(ctx) {
  var p = ctx.payload;
  var email = str_(p.email, 200).toLowerCase();
  var cache = CacheService.getScriptCache();
  var failKey = 'lf:' + email;
  var ipKey = 'lfip:' + ctx.ip;
  var fails = Number(cache.get(failKey) || 0);
  var ipFails = ctx.ip ? Number(cache.get(ipKey) || 0) : 0;
  if (fails >= MAX_LOGIN_FAIL || ipFails >= MAX_LOGIN_FAIL * 10) {
    throw fail_('Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc dùng "Quên mật khẩu".', 'LOCKED');
  }
  var user = findUserByEmail_(email);
  if (!user || !checkPw_(user, p.password)) {
    cache.put(failKey, String(fails + 1), LOGIN_LOCK_SECONDS);
    if (ctx.ip) cache.put(ipKey, String(ipFails + 1), LOGIN_LOCK_SECONDS);
    audit_(null, 'Đăng nhập thất bại', email + ' · IP ' + ctx.ip);
    throw fail_('Email hoặc mật khẩu không đúng.', 'LOGIN');
  }
  if (user.status !== 'active') {
    throw fail_('Tài khoản của bạn chưa được kích hoạt hoặc đang bị tạm khóa. Vui lòng liên hệ Admin phòng Lab.', 'SUSPENDED');
  }
  cache.remove(failKey);
  // Không ghi sheet khi đăng nhập thành công: tiết kiệm ~0,2 giây mỗi lần đăng nhập
  var out = bootstrap_(user);
  out.token = makeToken_(user);
  return out;
}

function register_(ctx) {
  var p = ctx.payload;
  var mode = prop_('REGISTRATION', 'approval');
  if (mode === 'closed') throw fail_('Hệ thống không mở đăng ký. Vui lòng liên hệ Admin phòng Lab để được cấp tài khoản.', 'CLOSED');

  var email = str_(p.email, 200).toLowerCase();
  if (!isEmail_(email)) throw fail_('Email không hợp lệ.');
  var domains = prop_('ALLOWED_EMAIL_DOMAINS', '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(String);
  if (domains.length && !domains.some(function (d) { return email.slice(-(d.length + 1)) === '@' + d || email.slice(-(d.length + 1)) === '.' + d; })) {
    throw fail_('Chỉ chấp nhận email thuộc: ' + domains.join(', ') + '.');
  }
  if (findUserByEmail_(email)) throw fail_('Email này đã được đăng ký tài khoản trước đó.');
  var name = str_(p.name, 120);
  if (!name) throw fail_('Vui lòng nhập họ tên.');
  var role = p.role === 'researcher' ? 'researcher' : 'instructor';

  var user = {
    id: newId_('user'),
    email: email,
    name: name,
    role: role,
    title: str_(p.title, 80) || (role === 'instructor' ? 'Giảng viên' : 'Nghiên cứu viên'),
    department: str_(p.department, 150) || 'Phòng Thí nghiệm',
    phone: str_(p.phone, 30) || '---',
    status: mode === 'open' ? 'active' : 'suspended',
    avatarBg: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    createdAt: now_().iso,
  };
  setPassword_(user, p.password);
  upsert_('users', user);
  audit_(user, 'Tự đăng ký tài khoản', role + ' · ' + user.department + (mode === 'open' ? '' : ' · chờ kích hoạt'));

  admins_().forEach(function (a) {
    queueMail_(a.email, '[' + APP + '] Tài khoản mới đăng ký: ' + user.name,
      'Có tài khoản mới vừa đăng ký trên hệ thống.',
      ['Họ tên: ' + user.title + ' ' + user.name, 'Email: ' + user.email, 'Đơn vị: ' + user.department, 'Điện thoại: ' + user.phone,
        mode === 'open' ? 'Tài khoản đã được kích hoạt tự động.' : 'Tài khoản đang CHỜ KÍCH HOẠT. Vào mục Người dùng để mở khóa nếu hợp lệ.'],
      'Mở trang quản trị');
  });

  if (user.status !== 'active') return { pending: true };
  var out = bootstrap_(user);
  out.token = makeToken_(user);
  return out;
}

function logout_(ctx) {
  var sig = String(ctx.token || '').split('.')[1];
  if (sig) CacheService.getScriptCache().put('lo:' + sig, '1', SESSION_SECONDS);
  return true;
}

function changePassword_(ctx) {
  var p = ctx.payload;
  var u = ctx.user;
  if (!checkPw_(u, p.oldPassword)) throw fail_('Mật khẩu hiện tại không đúng.');
  setPassword_(u, p.newPassword);
  upsert_('users', u);
  audit_(u, 'Đổi mật khẩu', '');
  return { ok: true };
}

function requestReset_(ctx) {
  var email = str_(ctx.payload.email, 200).toLowerCase();
  var cache = CacheService.getScriptCache();
  if (cache.get('rsl:' + email)) return { sent: true };   // chống gửi dồn
  var user = findUserByEmail_(email);
  if (user && user.status === 'active') {
    var code = String(100000 + Math.floor(Math.random() * 900000));
    cache.put('rs:' + email, JSON.stringify({ code: code, tries: 0 }), 15 * 60);
    cache.put('rsl:' + email, '1', 60);
    queueMail_(user.email, '[' + APP + '] Mã đặt lại mật khẩu: ' + code,
      'Mã xác nhận đặt lại mật khẩu của bạn là: ' + code,
      ['Mã có hiệu lực trong 15 phút.', 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.']);
    audit_(user, 'Yêu cầu đặt lại mật khẩu', 'IP ' + ctx.ip);
  }
  return { sent: true };
}

function resetPassword_(ctx) {
  var p = ctx.payload;
  var email = str_(p.email, 200).toLowerCase();
  var cache = CacheService.getScriptCache();
  var raw = cache.get('rs:' + email);
  if (!raw) throw fail_('Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.');
  var st = JSON.parse(raw);
  if (st.tries >= 5) {
    cache.remove('rs:' + email);
    throw fail_('Nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới.');
  }
  if (str_(p.code, 10) !== st.code) {
    st.tries++;
    cache.put('rs:' + email, JSON.stringify(st), 15 * 60);
    throw fail_('Mã xác nhận không đúng.');
  }
  var user = findUserByEmail_(email);
  if (!user) throw fail_('Tài khoản không tồn tại.');
  setPassword_(user, p.newPassword);
  upsert_('users', user);
  cache.remove('rs:' + email);
  cache.remove('lf:' + email);
  audit_(user, 'Đặt lại mật khẩu qua email', 'IP ' + ctx.ip);
  return { ok: true };
}

/* ============================================================================
 * 7. TẢI DỮ LIỆU BAN ĐẦU
 * ========================================================================== */
function newestFirst_(list) {
  return list.slice().reverse();
}

function bootstrap_(user) {
  var admin = isAdmin_(user);
  var myEmail = String(user.email).toLowerCase();
  return {
    me: pubUser_(user),
    users: newestFirst_(all_('users')).map(pubUser_),
    equipment: newestFirst_(all_('equipment')),
    bookings: newestFirst_(all_('bookings')),
    logs: newestFirst_(all_('logs')),
    emails: newestFirst_(all_('emails')).filter(function (m) {
      return admin || String(m.toEmail).toLowerCase() === myEmail;
    }).slice(0, admin ? 300 : 150),
    quickNotes: newestFirst_(all_('quickNotes')),
    maintenance: newestFirst_(all_('maintenance')),
    projects: newestFirst_(all_('projects')),
    supplies: newestFirst_(all_('supplies')),
    config: publicConfig_(),
    serverTime: now_().iso,
    ver: dataVer_(),
  };
}

/* ============================================================================
 * 8. ĐẶT LỊCH
 * ========================================================================== */
function findConflict_(equipmentId, date, start, end, excludeId) {
  var s = toMin_(start), e = toMin_(end);
  var list = all_('bookings');
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (b.equipmentId !== equipmentId || b.date !== date || b.id === excludeId) continue;
    if (b.status !== 'confirmed' && b.status !== 'active') continue;
    if (s < toMin_(b.endTime) && e > toMin_(b.startTime)) return b;
  }
  return null;
}

function userName_(id) {
  var u = find_('users', id);
  return u ? (u.title ? u.title + ' ' : '') + u.name : 'người khác';
}

function cleanSupplies_(list) {
  if (!Array.isArray(list)) return undefined;
  var out = [];
  list.slice(0, 50).forEach(function (it) {
    if (!it) return;
    var qty = num_(it.quantity, 0, 1e7);
    if (!qty) return;
    var cat = find_('supplies', it.supplyId);
    var unitCost = cat ? Number(cat.unitCostVND || 0) : num_(it.unitCostVND, 0, 1e12) || 0;
    out.push({
      supplyId: str_(it.supplyId, 80),
      supplyCode: cat ? cat.code : str_(it.supplyCode, 80),
      supplyName: cat ? cat.name : str_(it.supplyName, 200),
      quantity: qty,
      unit: cat ? cat.unit : str_(it.unit, 30),
      unitCostVND: unitCost,
      totalCostVND: Math.round(qty * unitCost),
      notes: optStr_(it.notes, 300),
    });
  });
  return out.length ? out : undefined;
}

function createBooking_(ctx) {
  var p = ctx.payload, u = ctx.user;
  var userId = u.id;
  if (p.userId && p.userId !== u.id) {
    requireAdmin_(u);
    var target = find_('users', p.userId);
    if (!target) throw fail_('Người dùng được đặt hộ không tồn tại.');
    userId = target.id;
  }
  var eq = find_('equipment', p.equipmentId);
  if (!eq) throw fail_('Thiết bị không tồn tại.');
  if (eq.status === 'maintenance') throw fail_('Thiết bị hiện đang ở chế độ bảo trì, không thể tiếp nhận đăng ký mới.');

  var date = str_(p.date, 10), start = str_(p.startTime, 5), end = str_(p.endTime, 5);
  if (!isDate_(date) || !isTime_(start) || !isTime_(end)) throw fail_('Ngày hoặc giờ không hợp lệ.');
  if (toMin_(end) <= toMin_(start)) throw fail_('Giờ kết thúc phải muộn hơn giờ bắt đầu.');
  var now = now_();
  if (date < now.date || (date === now.date && toMin_(end) <= now.min)) throw fail_('Không thể đăng ký khung giờ đã qua.');
  var purpose = str_(p.purpose, 1000);
  if (!purpose) throw fail_('Vui lòng nhập mục đích sử dụng thiết bị.');

  var c = findConflict_(eq.id, date, start, end);
  if (c) throw fail_('Khung giờ này đã có ' + userName_(c.userId) + ' đặt (' + c.startTime + ' - ' + c.endTime + '). Vui lòng chọn giờ khác.', 'CONFLICT');

  var project = p.projectId ? find_('projects', p.projectId) : null;
  var booking = {
    id: newId_('book'),
    equipmentId: eq.id,
    userId: userId,
    date: date,
    startTime: start,
    endTime: end,
    purpose: purpose,
    projectId: project ? project.id : undefined,
    projectCode: project ? project.code : optStr_(p.projectCode, 60),
    plannedSupplies: cleanSupplies_(p.plannedSupplies),
    status: 'confirmed',
    createdAt: now.iso,
    notes: optStr_(p.notes, 1000),
  };
  upsert_('bookings', booking);
  audit_(u, 'Đặt lịch', '[' + eq.code + '] ' + date + ' ' + start + '-' + end + (userId !== u.id ? ' · đặt hộ ' + userName_(userId) : ''));

  var owner = find_('users', userId);
  if (owner) mailBookingConfirmed_(booking, eq, owner);
  return { booking: booking };
}

function cancelBooking_(ctx) {
  var u = ctx.user;
  var b = find_('bookings', ctx.payload.bookingId);
  if (!b) throw fail_('Lịch đặt không tồn tại.');
  if (b.userId !== u.id && !isAdmin_(u)) throw fail_('Bạn chỉ có thể hủy lịch của chính mình.', 'FORBIDDEN');
  if (b.status === 'active') throw fail_('Máy đang trong quá trình sử dụng, vui lòng thực hiện Check-out trả máy thay vì hủy.');
  if (b.status !== 'confirmed') throw fail_('Lịch này đã kết thúc hoặc đã hủy trước đó.');
  b.status = 'cancelled';
  b.cancelledBy = u.id;
  b.cancelledAt = now_().iso;
  upsert_('bookings', b);
  var eq = find_('equipment', b.equipmentId) || {};
  audit_(u, 'Hủy lịch', '[' + (eq.code || b.equipmentId) + '] ' + b.date + ' ' + b.startTime + '-' + b.endTime);

  if (b.userId !== u.id) {
    var owner = find_('users', b.userId);
    if (owner) {
      recordMail_(owner, 'maintenance_notice', '[' + APP + '] Lịch đặt [' + (eq.code || '') + '] ngày ' + b.date + ' đã bị hủy', b, eq, {
        greeting: 'Kính gửi ' + owner.title + ' ' + owner.name + ',',
        headline: 'Lịch đăng ký thiết bị của bạn đã được Quản trị viên hủy.',
        contentParagraphs: [
          'Thiết bị: [' + (eq.code || '') + '] ' + (eq.name || '') + '.',
          'Khung giờ: ' + b.startTime + ' - ' + b.endTime + ', ngày ' + b.date + '.',
          'Người hủy: ' + u.title + ' ' + u.name + '. Vui lòng liên hệ phòng Lab nếu cần đặt lại.',
        ],
        actionLabel: 'Đặt lịch mới',
      });
    }
  }
  return { booking: b };
}

/* ============================================================================
 * 9. NHẬN MÁY / TRẢ MÁY
 * ========================================================================== */
function openLogFor_(equipmentId) {
  var list = all_('logs');
  for (var i = 0; i < list.length; i++) if (list[i].equipmentId === equipmentId && !list[i].checkOutTime) return list[i];
  return null;
}

function checkIn_(ctx) {
  var p = ctx.payload, u = ctx.user;
  var eq = find_('equipment', p.equipmentId);
  if (!eq) throw fail_('Thiết bị không tồn tại.');
  if (eq.status === 'maintenance') throw fail_('Thiết bị đang bảo trì kỹ thuật, không thể nhận máy.');
  var open = openLogFor_(eq.id);
  if (open) throw fail_('Thiết bị đang được ' + userName_(open.userId) + ' sử dụng. Người đó cần trả máy (Check-out) trước.');

  var now = now_();
  var booking = null;
  if (p.bookingId) {
    booking = find_('bookings', p.bookingId);
    if (!booking || booking.equipmentId !== eq.id) throw fail_('Lịch đặt không khớp với thiết bị.');
    if (booking.userId !== u.id && !isAdmin_(u)) throw fail_('Đây không phải lịch đặt của bạn.', 'FORBIDDEN');
    if (booking.status !== 'confirmed') throw fail_('Lịch đặt này đã được nhận máy, đã hoàn tất hoặc đã hủy.');
    if (booking.date !== now.date) throw fail_('Chỉ nhận máy được trong ngày của lịch đặt (' + booking.date + ').');
    if (now.min < toMin_(booking.startTime) - 30) throw fail_('Chưa tới giờ. Bạn có thể nhận máy từ 30 phút trước giờ bắt đầu (' + booking.startTime + ').');
    if (now.min >= toMin_(booking.endTime)) throw fail_('Lịch đặt đã quá giờ kết thúc (' + booking.endTime + '). Vui lòng đặt lịch mới.');
  } else {
    // Nhận máy đột xuất: không được chiếm khung giờ người khác đã đặt
    var nowEnd = Math.min(now.min + 15, 24 * 60 - 1);
    var hm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
    var c = findConflict_(eq.id, now.date, now.hm, hm(nowEnd));
    if (c && c.userId === u.id && c.status === 'confirmed') booking = c;   // tự gắn lịch của chính mình
    else if (c) throw fail_('Khung giờ hiện tại đã được ' + userName_(c.userId) + ' đặt (' + c.startTime + ' - ' + c.endTime + ').');
  }

  var project = p.projectId ? find_('projects', p.projectId) : null;
  var log = {
    id: newId_('log'),
    bookingId: booking ? booking.id : undefined,
    equipmentId: eq.id,
    userId: booking && isAdmin_(u) ? booking.userId : u.id,
    checkInTime: now.iso,
    initialCondition: oneOf_(p.initialCondition, CONDITIONS, 'Tình trạng máy'),
    operatorNotes: str_(p.operatorNotes, 2000),
    sampleCount: num_(p.sampleCount, 0, 1e6),
    projectId: project ? project.id : booking ? booking.projectId : undefined,
    projectCode: project ? project.code : (optStr_(p.projectCode, 60) || (booking ? booking.projectCode : undefined)),
    incidentReport: { hasIncident: false },
  };
  upsert_('logs', log);
  eq.status = 'in_use';
  upsert_('equipment', eq);
  if (booking) {
    booking.status = 'active';
    upsert_('bookings', booking);
  }
  audit_(u, 'Nhận máy (Check-in)', '[' + eq.code + '] tình trạng: ' + log.initialCondition + (booking ? ' · lịch ' + booking.startTime + '-' + booking.endTime : ' · đột xuất'));
  return { log: log };
}

function checkOut_(ctx) {
  var p = ctx.payload, u = ctx.user;
  var log = find_('logs', p.logId);
  if (!log) throw fail_('Không tìm thấy nhật ký phiên này.');
  if (log.checkOutTime) throw fail_('Phiên này đã trả máy trước đó.');
  if (log.userId !== u.id && !isAdmin_(u)) throw fail_('Chỉ người nhận máy hoặc Admin mới trả máy được.', 'FORBIDDEN');

  var now = now_();
  var finalCondition = oneOf_(p.finalCondition, CONDITIONS, 'Tình trạng máy sau sử dụng');
  var inc = p.incidentReport || {};
  var incident = { hasIncident: !!inc.hasIncident };
  if (incident.hasIncident) {
    incident.severity = ['low', 'medium', 'high', 'critical'].indexOf(inc.severity) >= 0 ? inc.severity : 'medium';
    incident.description = str_(inc.description, 2000);
    if (!incident.description) throw fail_('Vui lòng mô tả sự cố.');
    incident.resolved = false;
  }
  var supplies = cleanSupplies_(p.consumedSupplies) || log.consumedSupplies;
  var cost = (supplies || []).reduce(function (s, it) { return s + (it.totalCostVND || 0); }, 0);
  var addendum = str_(p.operatorNotesAddendum, 2000);

  log.checkOutTime = now.iso;
  log.durationMinutes = Math.max(1, Math.round((now.ms - new Date(log.checkInTime).getTime()) / 60000));
  log.finalCondition = finalCondition;
  log.operatorNotes = addendum ? (log.operatorNotes ? log.operatorNotes + '\n' : '') + '[Trả máy]: ' + addendum : log.operatorNotes;
  if (p.supervisorNotes) log.supervisorNotes = str_(p.supervisorNotes, 2000);
  log.incidentReport = incident;
  if (p.sampleCount !== undefined && p.sampleCount !== null && p.sampleCount !== '') log.sampleCount = num_(p.sampleCount, 0, 1e6);
  log.consumedSupplies = supplies;
  log.materialCostVND = cost > 0 ? cost : undefined;
  upsert_('logs', log);

  // Trừ tồn kho vật tư đã dùng
  (cleanSupplies_(p.consumedSupplies) || []).forEach(function (it) {
    var s = find_('supplies', it.supplyId);
    if (s && typeof s.stockQuantity === 'number') {
      s.stockQuantity = Math.round((s.stockQuantity - it.quantity) * 1000) / 1000;
      upsert_('supplies', s);
    }
  });

  var eq = find_('equipment', log.equipmentId);
  var toMaintenance = finalCondition === 'damaged' || incident.hasIncident;
  if (eq) {
    eq.status = toMaintenance ? 'maintenance' : 'available';
    upsert_('equipment', eq);
  }
  if (log.bookingId) {
    var b = find_('bookings', log.bookingId);
    if (b) { b.status = 'completed'; upsert_('bookings', b); }
  }
  audit_(u, 'Trả máy (Check-out)', '[' + (eq ? eq.code : log.equipmentId) + '] ' + log.durationMinutes + ' phút · tình trạng: ' + finalCondition +
    (incident.hasIncident ? ' · SỰ CỐ ' + incident.severity + ': ' + incident.description : ''));

  if (toMaintenance && eq) mailIncident_(log, eq, u, incident, finalCondition);
  return { log: log };
}

/* ============================================================================
 * 10. EMAIL — vừa lưu vào sheet ThongBao (hộp thư trong ứng dụng) vừa gửi email thật.
 * ========================================================================== */
function emailEnabled_() {
  return String(prop_('SEND_EMAIL', 'true')).toLowerCase() !== 'false';
}

function appUrl_() {
  return prop_('APP_URL', '');
}

function htmlMail_(headline, paragraphs, actionLabel, notes, greeting) {
  var url = appUrl_();
  var lab = prop_('LAB_NAME', 'Phòng Thí nghiệm');
  var h = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
    '<div style="background:#0f172a;color:#fff;padding:14px 20px;font-weight:bold">' + esc_(APP) + ' · ' + esc_(lab) + '</div>' +
    '<div style="padding:20px;color:#0f172a;font-size:14px;line-height:1.6">';
  if (greeting) h += '<p>' + esc_(greeting) + '</p>';
  h += '<p style="font-size:16px;font-weight:bold;color:#1d4ed8">' + esc_(headline) + '</p>';
  (paragraphs || []).forEach(function (p) { h += '<p style="margin:6px 0">' + esc_(p) + '</p>'; });
  if (notes) h += '<p style="margin-top:14px;padding:10px;background:#fef3c7;border-radius:6px;font-size:13px">' + esc_(notes) + '</p>';
  if (url && actionLabel) {
    h += '<p style="margin-top:18px"><a href="' + esc_(url) + '" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">' +
      esc_(actionLabel) + '</a></p>';
  }
  h += '</div><div style="padding:10px 20px;background:#f8fafc;color:#64748b;font-size:12px">Email tự động từ hệ thống ' + esc_(APP) +
    '. Vui lòng không trả lời email này.</div></div>';
  return h;
}

/** Chỉ gửi email thật (không lưu hộp thư) — dùng cho mã OTP, thông báo Admin. */
function queueMail_(to, subject, headline, paragraphs, actionLabel) {
  if (!to || !isEmail_(to)) return;
  OUTBOX.push({ to: to, subject: subject, html: htmlMail_(headline, paragraphs, actionLabel), text: headline + '\n\n' + (paragraphs || []).join('\n') });
}

/** Lưu vào hộp thư trong ứng dụng + gửi email thật. */
function recordMail_(user, type, subject, booking, eq, preview) {
  var mail = {
    id: newId_('mail'),
    toEmail: user.email,
    toName: (user.title ? user.title + ' ' : '') + user.name,
    type: type,
    subject: subject,
    sentAt: now_().iso,
    bookingId: booking ? booking.id : undefined,
    equipmentId: eq ? eq.id : undefined,
    equipmentCode: eq ? eq.code : undefined,
    equipmentName: eq ? eq.name : undefined,
    room: eq && eq.room ? eq.room + (eq.building ? ' (' + eq.building + ')' : '') : undefined,
    date: booking ? booking.date : undefined,
    timeSlot: booking ? booking.startTime + ' - ' + booking.endTime : undefined,
    read: false,
    htmlPreview: preview,
  };
  upsert_('emails', mail);
  if (isEmail_(user.email)) {
    OUTBOX.push({
      to: user.email,
      subject: subject,
      html: htmlMail_(preview.headline, preview.contentParagraphs, preview.actionLabel, preview.securityNotes, preview.greeting),
      text: preview.greeting + '\n\n' + preview.headline + '\n\n' + preview.contentParagraphs.join('\n'),
    });
  }
  return mail;
}

function sendOutbox_() {
  if (!OUTBOX.length) return;
  var list = OUTBOX;
  OUTBOX = [];
  if (!emailEnabled_()) return;
  list.forEach(function (m) {
    try {
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Hết hạn mức gửi email trong ngày.');
      MailApp.sendEmail({ to: m.to, subject: m.subject, htmlBody: m.html, body: m.text, name: APP });
    } catch (e) {
      console.error('Gửi email tới ' + m.to + ' thất bại: ' + e);
    }
  });
}

function mailBookingConfirmed_(b, eq, user) {
  var now = new Date();
  return recordMail_(user, 'booking_confirmed',
    '✅ [' + APP + '] Xác nhận lịch [' + eq.code + '] ngày ' + b.date + ' (' + b.startTime + ' - ' + b.endTime + ')', b, eq, {
      greeting: 'Kính gửi ' + user.title + ' ' + user.name + ',',
      headline: 'Lịch đăng ký thiết bị của bạn đã được hệ thống phê duyệt tự động.',
      contentParagraphs: [
        'Yêu cầu đăng ký đã được kiểm tra và xác nhận lúc ' + fmt_(now, 'HH:mm') + ' ngày ' + fmt_(now, 'dd/MM/yyyy') + '.',
        'Thiết bị: [' + eq.code + '] ' + eq.name + '.',
        'Thời gian sử dụng: ' + b.startTime + ' đến ' + b.endTime + ' - Ngày ' + b.date + '.',
        'Vị trí: ' + eq.room + ' (' + eq.building + '). Cán bộ phụ trách: ' + (eq.responsibleStaff || '---') + '.',
        'Nội dung thí nghiệm: "' + b.purpose + '"' + (b.projectCode ? ' (Mã đề tài: ' + b.projectCode + ')' : '') + '.',
      ],
      actionLabel: 'Xem lịch & chuẩn bị nhận máy',
      securityNotes: 'Lưu ý an toàn: ' + (eq.safetyGuidelines || 'Tuân thủ quy định bảo hộ phòng thí nghiệm.'),
    });
}

function mailReminder_(b, eq, user, minutes) {
  return recordMail_(user, 'upcoming_reminder',
    '⏰ [' + APP + '] Ca đo [' + eq.code + '] của bạn sắp bắt đầu (' + b.startTime + ' - ' + b.endTime + ')', b, eq, {
      greeting: 'Kính gửi ' + user.title + ' ' + user.name + ',',
      headline: minutes > 0 ? 'Ca sử dụng thiết bị của bạn sẽ bắt đầu trong khoảng ' + minutes + ' phút nữa.' : 'Nhắc lịch sử dụng thiết bị của bạn.',
      contentParagraphs: [
        'Phòng: ' + eq.room + ' (' + eq.building + ').',
        'Khung giờ: ' + b.startTime + ' - ' + b.endTime + ' (Ngày ' + b.date + ').',
        'Thiết bị: [' + eq.code + '] ' + eq.name + '.',
        'Chuẩn bị: kiểm tra mẫu đã sẵn sàng, mang sổ tay phòng Lab và có mặt đúng giờ để nhận máy (Check-in).',
      ],
      actionLabel: 'Mở trang để nhận máy',
      securityNotes: 'Quy tắc vận hành: ' + (eq.safetyGuidelines || 'Tuân thủ quy định phòng thí nghiệm.'),
    });
}

function mailIncident_(log, eq, reporter, incident, cond) {
  var condLabel = { good: 'Tốt', minor_wear: 'Hao mòn nhẹ', needs_calibration: 'Cần hiệu chuẩn', damaged: 'Hư hỏng' }[cond] || cond;
  var sevLabel = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng' }[incident.severity] || '';
  admins_().forEach(function (a) {
    recordMail_(a, 'incident_alert', '🚨 [' + APP + '] Sự cố thiết bị [' + eq.code + '] — đã chuyển sang Bảo trì', null, eq, {
      greeting: 'Kính gửi ' + a.title + ' ' + a.name + ',',
      headline: 'Thiết bị [' + eq.code + '] ' + eq.name + ' vừa được báo sự cố khi trả máy và đã tự động chuyển sang trạng thái Bảo trì.',
      contentParagraphs: [
        'Người báo: ' + reporter.title + ' ' + reporter.name + ' (' + reporter.email + ').',
        'Tình trạng sau sử dụng: ' + condLabel + '.',
        incident.hasIncident ? 'Mức độ: ' + sevLabel + '. Mô tả: ' + incident.description : 'Không ghi mô tả sự cố.',
        'Phòng: ' + eq.room + ' (' + eq.building + '). Cán bộ phụ trách: ' + (eq.responsibleStaff || '---') + '.',
      ],
      actionLabel: 'Mở mục Thiết bị',
      securityNotes: 'Vui lòng kiểm tra và ghi nhận bảo trì để đưa máy về trạng thái Sẵn sàng.',
    });
  });
}

function sendReminder_(ctx) {
  var u = ctx.user;
  var b = find_('bookings', ctx.payload.bookingId);
  if (!b) throw fail_('Lịch đặt không tồn tại.');
  if (b.userId !== u.id && !isAdmin_(u)) throw fail_('Bạn chỉ gửi nhắc được cho lịch của mình.', 'FORBIDDEN');
  if (b.status !== 'confirmed') throw fail_('Chỉ gửi nhắc cho lịch đang chờ nhận máy.');
  var recent = all_('emails').some(function (m) {
    return m.bookingId === b.id && m.type === 'upcoming_reminder' && Date.now() - new Date(m.sentAt).getTime() < 10 * 60000;
  });
  if (recent) throw fail_('Đã gửi nhắc cho lịch này trong 10 phút qua.');
  var eq = find_('equipment', b.equipmentId);
  var owner = find_('users', b.userId);
  if (!eq || !owner) throw fail_('Thiếu dữ liệu thiết bị hoặc người dùng.');
  var now = now_();
  var minutes = b.date === now.date ? Math.max(0, toMin_(b.startTime) - now.min) : 0;
  var mail = mailReminder_(b, eq, owner, minutes);
  audit_(u, 'Gửi email nhắc lịch', '[' + eq.code + '] ' + b.date + ' ' + b.startTime + ' → ' + owner.email);
  return { email: mail, toEmail: owner.email };
}

function markEmailRead_(ctx) {
  var u = ctx.user;
  var m = find_('emails', ctx.payload.emailId);
  if (!m) return null;
  if (String(m.toEmail).toLowerCase() !== String(u.email).toLowerCase() && !isAdmin_(u)) throw fail_('Không có quyền.', 'FORBIDDEN');
  if (!m.read) { m.read = true; upsert_('emails', m); }
  return null;
}

function markAllEmailsRead_(ctx) {
  var u = ctx.user;
  var onlyMine = !isAdmin_(u) || ctx.payload.onlyMine !== false;
  var me = String(u.email).toLowerCase();
  var changed = [];
  all_('emails').forEach(function (m) {
    if (m.read) return;
    if (onlyMine && String(m.toEmail).toLowerCase() !== me) return;
    m.read = true;
    changed.push(m.id);
  });
  if (changed.length) rewriteAll_('emails', changed);
  return { count: changed.length };
}

/** Chạy theo lịch (mỗi 15 phút): gửi email nhắc cho ca bắt đầu trong 45 phút tới. */
function guiNhacLich() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  resetRequest_();
  FRESH = true;
  try {
    var now = now_();
    var reminded = {};
    all_('emails').forEach(function (m) { if (m.type === 'upcoming_reminder' && m.bookingId) reminded[m.bookingId] = true; });
    all_('bookings').forEach(function (b) {
      if (b.status !== 'confirmed' || b.date !== now.date || reminded[b.id]) return;
      var diff = toMin_(b.startTime) - now.min;
      if (diff < 0 || diff > 45) return;
      var eq = find_('equipment', b.equipmentId);
      var user = find_('users', b.userId);
      if (eq && user && user.status === 'active') mailReminder_(b, eq, user, diff);
    });
  } finally {
    try {
      commitWrites_();
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    sendOutbox_();
  }
}

/* ============================================================================
 * 11. GHI CHÚ NHANH
 * ========================================================================== */
function cleanParams_(list) {
  if (!Array.isArray(list)) return undefined;
  var out = list.slice(0, 40).map(function (p) { return { key: str_(p && p.key, 100), value: str_(p && p.value, 300) }; })
    .filter(function (p) { return p.key && p.value; });
  return out.length ? out : undefined;
}

function addQuickNote_(ctx) {
  var p = ctx.payload, u = ctx.user;
  if (!find_('equipment', p.equipmentId)) throw fail_('Thiết bị không tồn tại.');
  var title = str_(p.title, 200), content = str_(p.content, 5000);
  if (!title || !content) throw fail_('Vui lòng nhập tiêu đề và nội dung ghi chú.');
  var note = {
    id: str_(p.id, 80) && !find_('quickNotes', p.id) ? str_(p.id, 80) : newId_('qnote'),
    equipmentId: p.equipmentId,
    authorId: u.id,
    authorName: u.name,
    authorTitle: u.title,
    authorDepartment: u.department,
    title: title,
    content: content,
    category: NOTE_CATEGORIES.indexOf(p.category) >= 0 ? p.category : 'tip',
    parameters: cleanParams_(p.parameters),
    isPinned: !!p.isPinned,
    createdAt: now_().iso,
  };
  upsert_('quickNotes', note);
  audit_(u, 'Thêm ghi chú nhanh', note.title);
  return { note: note };
}

function updateQuickNote_(ctx) {
  var p = ctx.payload, u = ctx.user;
  var note = find_('quickNotes', p.id);
  if (!note) throw fail_('Ghi chú không tồn tại.');
  if (note.authorId !== u.id && !isAdmin_(u)) throw fail_('Chỉ tác giả hoặc Admin mới sửa được ghi chú này.', 'FORBIDDEN');
  if (p.title !== undefined) note.title = str_(p.title, 200) || note.title;
  if (p.content !== undefined) note.content = str_(p.content, 5000) || note.content;
  if (p.category !== undefined && NOTE_CATEGORIES.indexOf(p.category) >= 0) note.category = p.category;
  if (p.parameters !== undefined) note.parameters = cleanParams_(p.parameters);
  if (p.isPinned !== undefined) note.isPinned = !!p.isPinned;
  note.updatedAt = now_().iso;
  upsert_('quickNotes', note);
  return { note: note };
}

function deleteQuickNote_(ctx) {
  var u = ctx.user;
  var note = find_('quickNotes', ctx.payload.id);
  if (!note) return null;
  if (note.authorId !== u.id && !isAdmin_(u)) throw fail_('Chỉ tác giả hoặc Admin mới xóa được ghi chú này.', 'FORBIDDEN');
  remove_('quickNotes', note.id);
  audit_(u, 'Xóa ghi chú nhanh', note.title);
  return null;
}

/* ============================================================================
 * 12. BẢO TRÌ
 * ========================================================================== */
function addMaintenanceRecord_(ctx) {
  var p = ctx.payload, u = ctx.user;
  requireAdmin_(u);
  var eq = find_('equipment', p.equipmentId);
  if (!eq) throw fail_('Thiết bị không tồn tại.');
  var date = str_(p.performedDate, 10);
  if (!isDate_(date)) throw fail_('Ngày thực hiện không hợp lệ.');
  var rec = {
    id: str_(p.id, 80) && !find_('maintenance', p.id) ? str_(p.id, 80) : newId_('maint'),
    equipmentId: eq.id,
    maintenanceType: oneOf_(p.maintenanceType, MAINT_TYPES, 'Loại bảo trì'),
    performedDate: date,
    technicianName: str_(p.technicianName, 120) || u.name,
    agencyOrVendor: optStr_(p.agencyOrVendor, 200),
    certificateNumber: optStr_(p.certificateNumber, 100),
    operatingHoursAtService: num_(p.operatingHoursAtService, 0, 1e7) || 0,
    costVND: num_(p.costVND, 0, 1e13),
    notes: str_(p.notes, 3000),
    replacedParts: Array.isArray(p.replacedParts) ? p.replacedParts.slice(0, 30).map(function (s) { return str_(s, 150); }).filter(String) : undefined,
    nextRecommendedDueDate: isDate_(str_(p.nextRecommendedDueDate, 10)) ? str_(p.nextRecommendedDueDate, 10) : undefined,
    createdAt: now_().iso,
  };
  upsert_('maintenance', rec);
  if (!openLogFor_(eq.id)) eq.status = 'available';
  eq.lastMaintenanceDate = date;
  upsert_('equipment', eq);
  audit_(u, 'Ghi nhận bảo trì', '[' + eq.code + '] ' + rec.maintenanceType + ' ' + date);
  return { record: rec };
}

function deleteMaintenanceRecord_(ctx) {
  requireAdmin_(ctx.user);
  var rec = find_('maintenance', ctx.payload.id);
  if (!rec) return null;
  remove_('maintenance', rec.id);
  audit_(ctx.user, 'Xóa phiếu bảo trì', rec.id);
  return null;
}

/* ============================================================================
 * 13. QUẢN TRỊ: THIẾT BỊ, NGƯỜI DÙNG, ĐỀ TÀI, VẬT TƯ
 * ========================================================================== */
function pick_(src, cols) {
  var o = {};
  cols.forEach(function (c) { if (src[c] !== undefined && src[c] !== null && src[c] !== '') o[c] = src[c]; });
  return o;
}

function upsertEquipment_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var p = ctx.payload.equipment || {};
  var eq = pick_(p, SCHEMA.equipment.cols);
  eq.id = str_(p.id, 80) || newId_('eq');
  eq.code = str_(p.code, 60).toUpperCase();
  eq.name = str_(p.name, 200);
  if (!eq.code || !eq.name) throw fail_('Vui lòng nhập mã và tên thiết bị.');
  var dup = all_('equipment').filter(function (x) { return x.id !== eq.id && String(x.code).toUpperCase() === eq.code; })[0];
  if (dup) throw fail_('Mã thiết bị "' + eq.code + '" đã tồn tại.');
  eq.category = EQ_CATEGORIES.indexOf(p.category) >= 0 ? p.category : EQ_CATEGORIES[5];
  eq.status = EQ_STATUS.indexOf(p.status) >= 0 ? p.status : 'available';
  var prev = find_('equipment', eq.id);
  if (prev && prev.status === 'in_use' && openLogFor_(eq.id) && eq.status !== 'in_use' && eq.status !== 'maintenance') eq.status = 'in_use';
  eq.maxBookingHoursPerSession = num_(p.maxBookingHoursPerSession, 0.5, 24) || 4;
  ['room', 'building', 'manufacturer', 'model', 'responsibleStaff', 'maintenanceSchedule', 'sopTitle', 'sopDocCode', 'manualDocName', 'emergencyContact']
    .forEach(function (k) { if (eq[k] !== undefined) eq[k] = str_(eq[k], 300); });
  ['specs', 'safetyGuidelines'].forEach(function (k) { if (eq[k] !== undefined) eq[k] = str_(eq[k], 5000); });
  upsert_('equipment', eq);
  audit_(u, prev ? 'Sửa thiết bị' : 'Thêm thiết bị', '[' + eq.code + '] ' + eq.name + ' · ' + eq.status);
  return { equipment: eq };
}

function deleteEquipment_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var eq = find_('equipment', ctx.payload.id);
  if (!eq) return null;
  var busy = all_('bookings').some(function (b) { return b.equipmentId === eq.id && (b.status === 'confirmed' || b.status === 'active'); });
  if (busy || openLogFor_(eq.id)) throw fail_('Không thể xóa thiết bị đang có lịch đăng ký sắp tới hoặc đang hoạt động.');
  remove_('equipment', eq.id);
  audit_(u, 'Xóa thiết bị', '[' + eq.code + '] ' + eq.name);
  return null;
}

function upsertUser_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var p = ctx.payload.user || {};
  var existing = p.id ? find_('users', p.id) : null;
  var email = str_(p.email, 200).toLowerCase();
  if (!isEmail_(email)) throw fail_('Email không hợp lệ.');
  var dup = findUserByEmail_(email);
  if (dup && (!existing || dup.id !== existing.id)) throw fail_('Email này đã được dùng cho tài khoản khác.');
  var role = oneOf_(p.role, ROLES, 'Vai trò');
  var status = p.status === 'suspended' ? 'suspended' : 'active';
  if (existing && existing.id === u.id && (role !== 'admin' || status !== 'active')) {
    throw fail_('Bạn không thể tự hạ quyền hoặc tự khóa tài khoản của chính mình.');
  }
  var user = existing || { id: newId_('user'), createdAt: now_().iso, avatarBg: AVATARS[Math.floor(Math.random() * AVATARS.length)] };
  var wasActive = existing && existing.status === 'active';
  user.email = email;
  user.name = str_(p.name, 120) || user.name;
  if (!user.name) throw fail_('Vui lòng nhập họ tên.');
  user.role = role;
  user.title = str_(p.title, 80) || 'Cán bộ nghiên cứu';
  user.department = str_(p.department, 150) || 'Phòng Thí nghiệm';
  user.phone = str_(p.phone, 30) || '---';
  user.status = status;
  if (p.avatarBg && AVATARS.indexOf(p.avatarBg) >= 0) user.avatarBg = p.avatarBg;

  var newPw = str_(p.password, 128);
  var generated = false;
  if (!existing && !newPw) { newPw = randomPassword_(); generated = true; }
  if (newPw) setPassword_(user, newPw);
  upsert_('users', user);
  audit_(u, existing ? 'Sửa tài khoản' : 'Cấp tài khoản', user.email + ' · ' + role + ' · ' + status + (newPw ? ' · đặt mật khẩu' : ''));

  if (newPw) {
    queueMail_(user.email, '[' + APP + '] ' + (existing ? 'Mật khẩu mới' : 'Tài khoản truy cập') + ' hệ thống đặt lịch thiết bị',
      (existing ? 'Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn.' : 'Bạn đã được cấp tài khoản sử dụng hệ thống ' + APP + '.'),
      ['Email đăng nhập: ' + user.email, 'Mật khẩu: ' + newPw, 'Vui lòng đăng nhập và đổi mật khẩu ngay (menu tài khoản → Đổi mật khẩu).'],
      'Đăng nhập');
  } else if (existing && !wasActive && status === 'active') {
    queueMail_(user.email, '[' + APP + '] Tài khoản của bạn đã được kích hoạt',
      'Tài khoản của bạn đã được Quản trị viên kích hoạt.', ['Bạn có thể đăng nhập và đăng ký sử dụng thiết bị ngay bây giờ.'], 'Đăng nhập');
  }
  return { user: pubUser_(user), password: newPw && (generated || !existing) ? newPw : undefined };
}

function toggleUserStatus_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var target = find_('users', ctx.payload.userId);
  if (!target) throw fail_('Người dùng không tồn tại.');
  if (target.id === u.id) throw fail_('Bạn không thể tự khóa tài khoản của chính mình.');
  target.status = target.status === 'active' ? 'suspended' : 'active';
  upsert_('users', target);
  audit_(u, target.status === 'active' ? 'Mở khóa tài khoản' : 'Khóa tài khoản', target.email);
  if (target.status === 'active') {
    queueMail_(target.email, '[' + APP + '] Tài khoản của bạn đã được kích hoạt',
      'Tài khoản của bạn đã được Quản trị viên kích hoạt.', ['Bạn có thể đăng nhập và đăng ký sử dụng thiết bị ngay bây giờ.'], 'Đăng nhập');
  }
  return { user: pubUser_(target) };
}

function upsertProject_(ctx) {
  var u = ctx.user;
  var p = ctx.payload.project || {};
  var existing = p.id ? find_('projects', p.id) : null;
  if (existing && existing.createdBy !== u.id && !isAdmin_(u)) throw fail_('Chỉ người tạo đề tài hoặc Admin mới sửa được.', 'FORBIDDEN');
  var code = str_(p.code, 60).toUpperCase();
  var name = str_(p.name, 300);
  if (!code || !name) throw fail_('Vui lòng nhập mã và tên đề tài.');
  var dup = all_('projects').filter(function (x) { return String(x.code).toUpperCase() === code && (!existing || x.id !== existing.id); })[0];
  if (dup) throw fail_('Mã đề tài "' + code + '" đã tồn tại.');
  var proj = existing || { id: str_(p.id, 80) || newId_('proj'), createdAt: now_().iso, createdBy: u.id };
  proj.code = code;
  proj.name = name;
  proj.principalInvestigator = str_(p.principalInvestigator, 150);
  if (!proj.principalInvestigator) throw fail_('Vui lòng nhập chủ nhiệm đề tài.');
  proj.piEmail = optStr_(p.piEmail, 200);
  proj.department = str_(p.department, 200);
  proj.fundingAgency = optStr_(p.fundingAgency, 200);
  proj.startDate = isDate_(str_(p.startDate, 10)) ? str_(p.startDate, 10) : now_().date;
  proj.endDate = isDate_(str_(p.endDate, 10)) ? str_(p.endDate, 10) : proj.startDate;
  proj.budgetTotalVND = num_(p.budgetTotalVND, 0, 1e14) || 0;
  proj.materialBudgetVND = num_(p.materialBudgetVND, 0, 1e14) || 0;
  proj.status = ['active', 'completed', 'on_hold'].indexOf(p.status) >= 0 ? p.status : 'active';
  proj.colorTag = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'purple'].indexOf(p.colorTag) >= 0 ? p.colorTag : 'indigo';
  proj.description = str_(p.description, 3000);
  upsert_('projects', proj);
  audit_(u, existing ? 'Sửa đề tài' : 'Thêm đề tài', proj.code + ' · ' + proj.name);
  return { project: proj };
}

function deleteProject_(ctx) {
  var u = ctx.user;
  var proj = find_('projects', ctx.payload.id);
  if (!proj) return null;
  if (proj.createdBy !== u.id && !isAdmin_(u)) throw fail_('Chỉ người tạo đề tài hoặc Admin mới xóa được.', 'FORBIDDEN');
  var busy = all_('bookings').some(function (b) { return b.projectId === proj.id && (b.status === 'confirmed' || b.status === 'active'); });
  if (busy) throw fail_('Không thể xóa đề tài đang có lịch đăng ký sắp tới hoặc đang tiến hành thí nghiệm.');
  remove_('projects', proj.id);
  audit_(u, 'Xóa đề tài', proj.code);
  return null;
}

function upsertSupply_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var p = ctx.payload.supply || {};
  var s = {
    id: str_(p.id, 80) || newId_('sup'),
    code: str_(p.code, 60).toUpperCase(),
    name: str_(p.name, 200),
    category: str_(p.category, 100),
    unit: str_(p.unit, 30),
    unitCostVND: num_(p.unitCostVND, 0, 1e12) || 0,
    stockQuantity: num_(p.stockQuantity, -1e9, 1e9) || 0,
    compatibleCategory: optStr_(p.compatibleCategory, 100),
  };
  if (!s.code || !s.name) throw fail_('Vui lòng nhập mã và tên vật tư.');
  upsert_('supplies', s);
  audit_(u, 'Cập nhật vật tư', s.code + ' · tồn ' + s.stockQuantity);
  return { supply: s };
}

/** Admin nạp danh mục mẫu (thiết bị kèm SOP, vật tư, ghi chú, lịch sử bảo trì, đề tài). Không ghi đè dữ liệu đã có. */
function importSampleData_(ctx) {
  var u = ctx.user;
  requireAdmin_(u);
  var p = ctx.payload || {};
  var counts = {};
  ['equipment', 'supplies', 'quickNotes', 'maintenance', 'projects'].forEach(function (name) {
    var list = Array.isArray(p[name]) ? p[name].slice(0, 2000) : [];
    var cols = SCHEMA[name].cols;
    var objs = list.map(function (o) { return pick_(o || {}, cols); }).filter(function (o) { return o.id; });
    if (name === 'equipment') objs.forEach(function (o) { o.status = o.status === 'maintenance' ? 'maintenance' : 'available'; });
    if (name === 'projects') objs.forEach(function (o) { o.createdBy = u.id; });
    counts[name] = insertMany_(name, objs);
  });
  audit_(u, 'Nạp dữ liệu mẫu', JSON.stringify(counts));
  return { counts: counts };
}

/* ============================================================================
 * 14. CÀI ĐẶT — chạy hàm `caiDat` một lần từ trình soạn thảo Apps Script.
 * ========================================================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('LabLog Pro')
    .addItem('Cài đặt / kiểm tra cấu trúc sheet', 'caiDat')
    .addItem('Gửi email nhắc lịch ngay', 'guiNhacLich')
    .addItem('Xóa bộ nhớ đệm (sau khi sửa tay mà chưa thấy cập nhật)', 'xoaBoNhoDem')
    .addItem('Đặt lại mật khẩu Admin', 'datLaiMatKhauAdmin')
    .addItem('Tạo PROXY_KEY mới', 'taoProxyKeyMoi')
    .addToUi();
}

function caiDat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(SCHEMA).forEach(function (name) {
    var def = SCHEMA[name];
    var sh = ss.getSheetByName(def.sheet) || ss.insertSheet(def.sheet);
    prepareSheet_(sh, def.cols);
  });
  var audit = ss.getSheetByName(AUDIT_SHEET) || ss.insertSheet(AUDIT_SHEET);
  prepareSheet_(audit, AUDIT_COLS);
  var def1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def1 && def1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def1);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PROXY_KEY')) props.setProperty('PROXY_KEY', Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ''));
  if (!props.getProperty('REGISTRATION')) props.setProperty('REGISTRATION', 'approval');

  // Trigger nhắc lịch mỗi 15 phút
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'guiNhacLich'; });
  if (!has) ScriptApp.newTrigger('guiNhacLich').timeBased().everyMinutes(15).create();

  // Sửa tay trên Sheet → xóa bộ nhớ đệm để mọi người thấy ngay thay đổi
  var hasChange = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'khiSheetThayDoi'; });
  if (!hasChange) ScriptApp.newTrigger('khiSheetThayDoi').forSpreadsheet(ss).onChange().create();

  // Tài khoản Admin đầu tiên = chủ sở hữu script
  resetRequest_();
  FRESH = true;
  var lines = [];
  if (!admins_().length) {
    var email = (Session.getEffectiveUser().getEmail() || prop_('ADMIN_EMAIL', '')).toLowerCase();
    if (!email) throw new Error('Không lấy được email của bạn. Thêm thuộc tính ADMIN_EMAIL rồi chạy lại.');
    var pw = randomPassword_();
    var admin = findUserByEmail_(email) || {
      id: newId_('user'), email: email, name: 'Quản trị viên', title: 'Quản lý phòng Lab', department: prop_('LAB_NAME', 'Phòng Thí nghiệm'),
      phone: '---', avatarBg: 'bg-indigo-600', createdAt: now_().iso,
    };
    admin.role = 'admin';
    admin.status = 'active';
    setPassword_(admin, pw);
    upsert_('users', admin);
    lines.push('Tài khoản Admin: ' + email + '  ·  Mật khẩu: ' + pw + '  (đổi ngay sau khi đăng nhập)');
  }
  xoaBoNhoDem();
  SpreadsheetApp.flush();

  lines.unshift('PROXY_KEY = ' + props.getProperty('PROXY_KEY'));
  lines.push('Đăng ký tài khoản: ' + props.getProperty('REGISTRATION') + ' (đổi trong Thuộc tính tập lệnh: approval | open | closed)');
  lines.push('Bước tiếp theo: Triển khai → Tùy chọn triển khai mới → Ứng dụng web (Thực thi: Tôi · Truy cập: Bất kỳ ai).');
  lines.forEach(function (l) { Logger.log(l); });
  return lines.join('\n');
}

function prepareSheet_(sh, cols) {
  var lastCol = sh.getLastColumn();
  var head = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = cols.filter(function (c) { return head.indexOf(c) < 0; });
  if (missing.length) sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);
  var total = head.length + missing.length;
  sh.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#e2e8f0');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), total).setNumberFormat('@');
}

/**
 * Quên mật khẩu Admin / mất nhật ký lần cài đặt: chạy hàm này trong trình soạn thảo Apps Script.
 * Đặt mật khẩu mới cho email của chủ script (hoặc thuộc tính ADMIN_EMAIL), bảo đảm tài khoản là Admin
 * đang hoạt động, gỡ khóa đăng nhập sai. Mật khẩu mới hiện trong "Nhật ký thực thi".
 */
function datLaiMatKhauAdmin() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  resetRequest_();
  FRESH = true;
  try {
    var email = String(prop_('ADMIN_EMAIL', '') || Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    if (!email) throw new Error('Không lấy được email. Thêm thuộc tính ADMIN_EMAIL rồi chạy lại.');
    var u = findUserByEmail_(email) || {
      id: newId_('user'), email: email, name: 'Quản trị viên', title: 'Quản lý phòng Lab', department: prop_('LAB_NAME', 'Phòng Thí nghiệm'),
      phone: '---', avatarBg: 'bg-indigo-600', createdAt: now_().iso,
    };
    var pw = randomPassword_();
    u.role = 'admin';
    u.status = 'active';
    setPassword_(u, pw);
    upsert_('users', u);
    CacheService.getScriptCache().remove('lf:' + email);
    audit_({ email: email }, 'Đặt lại mật khẩu Admin từ Apps Script', '');
    commitWrites_();
    flushAudit_();
    SpreadsheetApp.flush();
    var msg = 'Tài khoản Admin: ' + email + '  ·  Mật khẩu mới: ' + pw + '  (đổi ngay sau khi đăng nhập)';
    Logger.log(msg);
    return msg;
  } finally {
    lock.releaseLock();
  }
}

function taoProxyKeyMoi() {
  var key = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('PROXY_KEY', key);
  Logger.log('PROXY_KEY mới = ' + key + '  → cập nhật Secret PROXY_KEY trên Cloudflare. Mọi người sẽ phải đăng nhập lại.');
  return key;
}
