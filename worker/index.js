/**
 * LabLog Pro — Cloudflare Worker
 *
 *   POST /api        → chuyển tiếp tới Google Apps Script (gắn PROXY_KEY bí mật + IP người dùng)
 *   POST /api/chat   → Trợ lý AI Gemini (khóa GEMINI_API_KEY chỉ nằm ở Worker)
 *   GET  /api/health → kiểm tra Worker có nối được Apps Script không
 *   còn lại          → giao diện React đã build (thư mục dist/)
 *
 * Biến môi trường (Cloudflare → Worker → Settings → Variables and Secrets):
 *   APPS_SCRIPT_URL  (Secret) URL Web app Apps Script, kết thúc bằng /exec
 *   PROXY_KEY        (Secret) trùng với thuộc tính PROXY_KEY trong Apps Script
 *   GEMINI_API_KEY   (Secret, tùy chọn) bật Trợ lý AI
 *   GEMINI_MODEL     (Text, tùy chọn) mặc định gemini-3.8-flash
 */

const MAX_BODY = 512 * 1024;          // 512 KB cho thao tác thường
const MAX_IMPORT_BODY = 4 * 1024 * 1024; // 4 MB cho "Nạp dữ liệu mẫu"
const CHAT_LIMIT = 30;                 // số câu hỏi AI / người / 10 phút

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api' || url.pathname === '/api/') return await handleApi(request, env);
      if (url.pathname === '/api/chat') return await handleChat(request, env);
      if (url.pathname === '/api/health') return await handleHealth(env);
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Không tìm thấy.' }, 404);
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ ok: false, error: 'Lỗi Worker: ' + (err && err.message ? err.message : String(err)) }, 500);
    }
  },

  /**
   * Lịch chạy (tùy chọn, bật trong wrangler.toml): "đánh thức" Apps Script định kỳ trong giờ làm việc,
   * để người đăng nhập không phải chờ Google khởi động lại script (1–3 giây).
   */
  async scheduled(event, env, ctx) {
    if (!env.APPS_SCRIPT_URL) return;
    ctx.waitUntil(fetch(env.APPS_SCRIPT_URL, { method: 'GET', redirect: 'follow' }).catch(() => {}));
  },
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

/** Chỉ nhận yêu cầu gửi từ chính tên miền của ứng dụng. */
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readBody(request, limit) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > limit) return { error: json({ ok: false, error: 'Dữ liệu gửi lên quá lớn.' }, 413) };
  const text = await request.text();
  if (text.length > limit) return { error: json({ ok: false, error: 'Dữ liệu gửi lên quá lớn.' }, 413) };
  try {
    return { data: JSON.parse(text || '{}') };
  } catch {
    return { error: json({ ok: false, error: 'Dữ liệu không đúng định dạng JSON.' }, 400) };
  }
}

async function callAppsScript(env, body) {
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'follow', // Apps Script trả 302 sang script.googleusercontent.com
  });
  const text = await res.text();
  if (!res.ok || !text.trim().startsWith('{')) {
    const hint = text.includes('accounts.google.com') || res.status === 401 || res.status === 403
      ? ' Kiểm tra Web app đã triển khai với quyền truy cập "Bất kỳ ai".'
      : '';
    return { ok: false, error: `Apps Script phản hồi không hợp lệ (HTTP ${res.status}).${hint}`, code: 'UPSTREAM' };
  }
  return JSON.parse(text);
}

function notConfigured(env) {
  if (!env.APPS_SCRIPT_URL || !env.PROXY_KEY) {
    return json({ ok: false, error: 'Máy chủ chưa cấu hình APPS_SCRIPT_URL hoặc PROXY_KEY trên Cloudflare.', code: 'CONFIG' }, 500);
  }
  return null;
}

async function handleApi(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Chỉ chấp nhận POST.' }, 405);
  if (!sameOrigin(request)) return json({ ok: false, error: 'Yêu cầu không hợp lệ (khác tên miền).' }, 403);
  const nc = notConfigured(env);
  if (nc) return nc;

  const isImport = new URL(request.url).searchParams.get('a') === 'importSampleData';
  const { data, error } = await readBody(request, isImport ? MAX_IMPORT_BODY : MAX_BODY);
  if (error) return error;
  if (!data || typeof data.action !== 'string') return json({ ok: false, error: 'Thiếu tên thao tác.' }, 400);

  const result = await callAppsScript(env, {
    action: data.action,
    token: typeof data.token === 'string' ? data.token : undefined,
    payload: data.payload ?? {},
    key: env.PROXY_KEY,
    ip: request.headers.get('CF-Connecting-IP') || '',
  });
  return json(result, result.ok === false && result.code === 'UPSTREAM' ? 502 : 200);
}

async function handleHealth(env) {
  if (!env.APPS_SCRIPT_URL || !env.PROXY_KEY) {
    return json({ ok: false, worker: true, appsScript: false, error: 'Chưa cấu hình APPS_SCRIPT_URL / PROXY_KEY.' }, 500);
  }
  const started = Date.now();
  try {
    const r = await callAppsScript(env, { action: 'publicConfig', key: env.PROXY_KEY, payload: {} });
    return json({
      ok: r.ok === true,
      worker: true,
      appsScript: r.ok === true,
      keyMatches: r.code !== 'BAD_KEY',
      gemini: Boolean(env.GEMINI_API_KEY),
      ms: Date.now() - started,
      error: r.ok ? undefined : r.error,
    }, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, worker: true, appsScript: false, error: String(e) }, 502);
  }
}

/* ------------------------------------------------------------------------ */
/* Xác minh token phiên đăng nhập do Apps Script cấp (HMAC-SHA256, khóa = PROXY_KEY) */
/* ------------------------------------------------------------------------ */
function b64urlFromBytes(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeToString(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function verifyToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = b64urlFromBytes(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  if (expected !== sig) return null;
  try {
    const p = JSON.parse(b64urlDecodeToString(body));
    if (!p.u || !p.e || p.e < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

async function rateLimited(userId) {
  // Đếm số câu hỏi theo cửa sổ 10 phút bằng Cache API của Cloudflare (gần đúng, đủ chống lạm dụng)
  const cache = caches.default;
  const bucket = Math.floor(Date.now() / 600000);
  const key = new Request(`https://rate.lablog.internal/chat/${encodeURIComponent(userId)}/${bucket}`);
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) : 0;
  if (count >= CHAT_LIMIT) return true;
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=660' } }));
  return false;
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của hệ thống quản trị và nhật ký thiết bị phòng thí nghiệm LabLog Pro.

Nhiệm vụ:
1. Hỗ trợ khoa học & vận hành: quy trình thao tác chuẩn (SOP), an toàn hóa chất/thiết bị, xử lý sự cố, chuẩn bị mẫu cho các thiết bị như FE-SEM, GC-MS/MS, TGA/DSC, UV-Vis, HPLC...
2. Khi có công cụ Google Search, dùng nó cho câu hỏi về tiêu chuẩn ISO/ASTM/TCVN, thông số kỹ thuật, tài liệu mới và nêu rõ nguồn.
3. Tham chiếu dữ liệu phòng thí nghiệm trong ngữ cảnh (danh mục thiết bị, trạng thái) để trả lời sát thực tế. Không bịa thông tin không có trong ngữ cảnh.
4. Trả lời bằng tiếng Việt, văn phong khoa học, súc tích, định dạng Markdown rõ ràng; có cảnh báo an toàn khi phù hợp.`;

async function handleChat(request, env) {
  if (request.method !== 'POST') return json({ error: 'Chỉ chấp nhận POST.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ (khác tên miền).' }, 403);
  if (!env.PROXY_KEY) return json({ error: 'Máy chủ chưa cấu hình PROXY_KEY.', code: 'CONFIG' }, 500);

  const { data, error } = await readBody(request, MAX_BODY);
  if (error) return error;
  const session = await verifyToken(data.token, env.PROXY_KEY);
  if (!session) return json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', code: 'AUTH' }, 401);
  if (!env.GEMINI_API_KEY) {
    return json({ error: 'Trợ lý AI chưa được bật: Quản trị viên cần thêm GEMINI_API_KEY trong cài đặt Cloudflare Worker.', code: 'API_KEY_MISSING' }, 503);
  }
  if (await rateLimited(session.u)) return json({ error: 'Bạn đã hỏi quá nhiều trong 10 phút. Vui lòng thử lại sau.', code: 'RATE_LIMIT' }, 429);

  const message = typeof data.message === 'string' ? data.message.trim().slice(0, 4000) : '';
  if (!message) return json({ error: 'Nội dung câu hỏi không được để trống.' }, 400);

  const contents = [];
  if (Array.isArray(data.history)) {
    for (const item of data.history.slice(-10)) {
      const text = typeof item?.text === 'string' ? item.text : typeof item?.content === 'string' ? item.content : '';
      if (text) contents.push({ role: item.role === 'user' ? 'user' : 'model', parts: [{ text: text.slice(0, 8000) }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  let system = SYSTEM_PROMPT;
  if (data.labContext) system += `\n\n[DỮ LIỆU NGỮ CẢNH PHÒNG THÍ NGHIỆM]:\n${JSON.stringify(data.labContext).slice(0, 60000)}`;

  const body = { contents, systemInstruction: { parts: [{ text: system }] } };
  if (data.enableSearch !== false) body.tools = [{ google_search: {} }];

  const model = env.GEMINI_MODEL || 'gemini-3.8-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = out?.error?.message || `Gemini trả lỗi HTTP ${res.status}`;
    const quota = res.status === 429 || out?.error?.status === 'RESOURCE_EXHAUSTED';
    return json({
      error: quota ? 'Hạn mức Gemini API tạm thời đã hết. Vui lòng thử lại sau ít phút.' : msg,
      code: out?.error?.status || 'GEMINI_API_ERROR',
    }, quota ? 429 : 502);
  }

  const cand = out.candidates?.[0];
  const reply = (cand?.content?.parts || []).map((p) => p.text || '').join('').trim() || 'Không có phản hồi từ mô hình.';
  const gm = cand?.groundingMetadata || {};
  const sources = (gm.groundingChunks || []).map((c) => c.web).filter((w) => w && w.uri).map((w) => ({ uri: w.uri, title: w.title || w.uri }));
  return json({ reply, grounding: { searchQueries: gm.webSearchQueries || [], sources } });
}
