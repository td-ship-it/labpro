import { ChatMessage, GroundingSource, Equipment, Booking, User, AiDocSource } from '../types';
import { getToken } from './api';

export interface SendMessageOptions {
  message: string;
  history: ChatMessage[];
  enableSearch: boolean;
  equipmentList?: Equipment[];
  bookings?: Booking[];
  currentUser?: User | null;
  /** Thiết bị đang được hỏi (khi mở Trợ lý từ thẻ thiết bị) */
  equipmentId?: string;
}

export interface ChatApiResponse {
  reply: string;
  grounding?: {
    searchQueries?: string[];
    sources?: GroundingSource[];
  };
  docSources?: AiDocSource[];
  note?: string;
  error?: string;
  code?: string;
}

export const GeminiChatService = {
  /**
   * Sends a user query to the server-side Gemini API endpoint (/api/chat)
   * with real-time Google Search grounding enabled.
   */
  async sendMessage(options: SendMessageOptions): Promise<ChatApiResponse> {
    const { message, history, enableSearch, equipmentList, bookings, currentUser, equipmentId } = options;

    // Filter and sanitize past messages for API payload
    const formattedHistory = history
      .filter((m) => !m.isError)
      .slice(-10) // Keep recent turns to manage context window
      .map((m) => ({
        role: m.role,
        text: m.content,
      }));

    // Create compact lab context for grounding
    const labContext = {
      currentUser: currentUser ? { name: currentUser.name, role: currentUser.role, department: currentUser.department } : null,
      equipments: equipmentList?.map((eq) => ({
        id: eq.id,
        name: eq.name,
        code: eq.code,
        category: eq.category,
        room: eq.room,
        building: eq.building,
        status: eq.status,
        responsibleStaff: eq.responsibleStaff,
        maintenanceConfig: eq.maintenanceConfig,
      })),
      todayDate: new Date().toLocaleDateString('sv-SE'),
      totalBookingsCount: bookings?.length || 0,
    };

    let response: Response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: getToken(),
          message,
          history: formattedHistory,
          enableSearch,
          equipmentId,
          labContext,
        }),
      });
    } catch {
      throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    }

    const data = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      throw new Error(data.error || `Lỗi máy chủ (HTTP ${response.status}).`);
    }

    return {
      reply: data.reply,
      grounding: data.grounding,
      docSources: Array.isArray(data.docSources) ? data.docSources : undefined,
      note: data.note,
    };
  },
};
