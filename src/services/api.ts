/**
 * Gọi máy chủ: trình duyệt → Cloudflare Worker (/api) → Google Apps Script → Google Sheets.
 */

const TOKEN_KEY = 'lablog_session_v2';

let memoryToken: string | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng được trong phiên hiện tại
  }
}

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'ERROR') {
    super(message);
    this.code = code;
  }
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  patch?: Record<string, any[]>;
  removed?: Record<string, string[]>;
  token?: string;
  error?: string;
  code?: string;
}

let onAuthLost: (() => void) | null = null;

export function setAuthLostHandler(fn: () => void) {
  onAuthLost = fn;
}

export async function callApi<T = any>(action: string, payload?: unknown): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    // Thao tác gửi dữ liệu lớn (nạp mẫu, tài liệu AI) được Worker cho phép gói tin lớn hơn
    const big = action === 'importSampleData' || action === 'saveAiDoc';
    res = await fetch(big ? `/api?a=${action}` : '/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: getToken(), payload: payload ?? {} }),
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.', 'NETWORK');
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`Máy chủ phản hồi không hợp lệ (HTTP ${res.status}).`, 'NETWORK');
  }

  if (json.token) setToken(json.token);
  if (!json.ok) {
    if (json.code === 'AUTH') {
      setToken(null);
      onAuthLost?.();
    }
    throw new ApiError(json.error || 'Đã xảy ra lỗi.', json.code);
  }
  return json;
}
