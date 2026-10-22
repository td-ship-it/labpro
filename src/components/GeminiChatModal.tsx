import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Globe, 
  ExternalLink, 
  X, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  ShieldAlert, 
  RefreshCw, 
  AlertCircle,
  FlaskConical,
  Lightbulb,
  CornerDownLeft
} from 'lucide-react';
import { ChatMessage, Equipment, Booking, User } from '../types';
import { GeminiChatService } from '../services/geminiChatService';

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  equipmentList: Equipment[];
  bookings: Booking[];
  initialEquipmentContext?: Equipment | null;
}

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  equipmentList,
  bookings,
  initialEquipmentContext,
}) => {
  // Trợ lý đang dùng (Workers AI miễn phí hoặc Gemini) — do Worker cho biết
  const [aiInfo, setAiInfo] = useState<{ label: string; search: boolean; enabled: boolean }>({
    label: 'Trợ lý AI',
    search: false,
    enabled: true,
  });
  useEffect(() => {
    fetch('/api/chat-info')
      .then((r) => r.json())
      .then((j) => {
        setAiInfo({ label: j.label || 'Trợ lý AI', search: Boolean(j.search), enabled: j.enabled !== false });
        if (!j.search) setEnableSearch(false);
      })
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initial friendly greeting from Gemini
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        content: `👋 Xin chào ${currentUser ? currentUser.name : 'bạn'}! Tôi là **Trợ lý AI Phòng Thí Nghiệm LabLog** nắm danh mục thiết bị và lịch của phòng Lab.

Tôi có thể giúp bạn:
- 🔬 **Tra cứu SOP & Hướng dẫn kỹ thuật:** Vận hành thiết bị FE-SEM, GC-MS/MS, TGA/DSC, chuẩn bị mẫu đo.
- 🧪 **An toàn & tiêu chuẩn:** Giải thích nguyên tắc an toàn hóa chất, tiêu chuẩn đo lường (ISO, ASTM, TCVN) — hãy đối chiếu văn bản gốc trước khi áp dụng.
- 🛠️ **Dự báo bảo trì & kiểm định:** Đánh giá giờ chạy thực tế từ sổ nhật ký giao nhận và đưa ra khuyến nghị bảo dưỡng.
- 📅 **Hỗ trợ đặt ca & tuân thủ nội quy:** Kiểm tra lịch trống, cảnh báo an toàn phòng lab.

*Hãy đặt câu hỏi hoặc chọn một gợi ý bên dưới để bắt đầu!*`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        enableSearch: true,
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [enableSearch, setEnableSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Auto-focus input when opened
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, messages.length]);

  // If opened with specific equipment context, append a starter prompt
  useEffect(() => {
    if (initialEquipmentContext && isOpen) {
      setInputPrompt(`Quy trình thao tác chuẩn (SOP), an toàn và lưu ý bảo trì cho máy ${initialEquipmentContext.name} (${initialEquipmentContext.code}) là gì?`);
    }
  }, [initialEquipmentContext, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      enableSearch,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await GeminiChatService.sendMessage({
        message: text,
        history: [...messages, userMessage],
        enableSearch,
        equipmentList,
        bookings,
        currentUser,
      });

      const modelMessage: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        enableSearch,
        grounding: response.grounding,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'model',
        content: `⚠️ Rất tiếc, đã xảy ra lỗi: ${err?.message || 'Không thể kết nối đến máy chủ.'}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này?')) {
      setMessages([
        {
          id: `msg-${Date.now()}-reset`,
          role: 'model',
          content: 'Cuộc trò chuyện đã được làm mới. Bạn muốn tra cứu hoặc hỏi điều gì tiếp theo?',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          enableSearch,
        },
      ]);
    }
  };

  const suggestedPrompts = [
    { label: '🔬 Hướng dẫn an toàn chạy máy FE-SEM', prompt: 'Hãy hướng dẫn chi tiết quy trình an toàn và chuẩn bị mẫu đo kính hiển vi điện tử quét FE-SEM' },
    { label: '🌐 Tiêu chuẩn ISO/ASTM kiểm định GC-MS', prompt: 'Tìm kiếm dữ liệu Google về tiêu chuẩn ISO 17025 và ASTM mới nhất cho hiệu chuẩn máy GC-MS/MS' },
    { label: '🛠️ Thiết bị nào trong lab đang cần bảo trì?', prompt: 'Dựa trên nhật ký giao nhận và tổng giờ chạy thực tế, thiết bị nào trong phòng lab đang cần kiểm định bảo trì gấp?' },
    { label: '⚠️ Quy trình xử lý sự cố tràn hóa chất', prompt: 'Quy trình chuẩn xử lý sự cố tràn dung môi hữu cơ dễ bay hơi trong phòng thí nghiệm' },
    { label: '📊 TGA/DSC: Phân tích mẫu polymer', prompt: 'Lưu ý khi phân tích nhiệt vi sai TGA/DSC với mẫu composite polymer để không làm hỏng sensor' },
  ];

  // Helper to format basic markdown text with headers, bullet points, and bold text
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headings
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-bold text-slate-900 mt-3 mb-1.5">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-slate-900 mt-3 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold text-slate-900 mt-4 mb-2">{line.replace('# ', '')}</h1>;
      }

      // Blockquotes or Safety Alert
      if (line.startsWith('> ')) {
        return (
          <div key={idx} className="bg-amber-50 border-l-4 border-amber-500 p-2.5 my-2 rounded-r text-amber-900 text-xs italic">
            {line.replace('> ', '')}
          </div>
        );
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemContent = line.replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-700 my-0.5 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(itemContent) }} />
          </li>
        );
      }

      // Numbered items
      if (/^\d+\.\s/.test(line)) {
        const itemContent = line.replace(/^\d+\.\s+/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-sm text-slate-700 my-0.5 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(itemContent) }} />
          </li>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-sm text-slate-800 leading-relaxed my-1">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
        </p>
      );
    });
  };

  const formatInlineMarkdown = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 text-blue-700 rounded text-xs font-mono font-medium">$1</code>');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className={`bg-white shadow-2xl flex flex-col transition-all duration-300 w-full overflow-hidden ${
          isExpanded 
            ? 'h-full sm:h-[94vh] sm:max-w-5xl sm:rounded-2xl' 
            : 'h-[92vh] sm:h-[82vh] sm:max-w-2xl sm:rounded-2xl'
        }`}
      >
        {/* Chatbot Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Bot className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight">LabLog AI Assistant</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-full border border-white/20 text-cyan-200">
                  <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                  {aiInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Trợ lý chuyên gia phòng lab & quy trình SOP</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Google Search Grounding toggle button (chỉ khi dùng Gemini) */}
            {aiInfo.search && (
            <button
              onClick={() => setEnableSearch(!enableSearch)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                enableSearch
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/20'
              }`}
              title={enableSearch ? 'Google Search Grounding đang BẬT: Trợ lý sẽ tìm kiếm web theo thời gian thực' : 'Bấm để bật tìm kiếm dữ liệu Google thời gian thực'}
            >
              <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-emerald-300 animate-spin-slow' : 'text-slate-300'}`} />
              <span className="hidden md:inline">Google Search</span>
              <span className={`text-[10px] px-1 rounded font-bold ${enableSearch ? 'bg-emerald-400 text-slate-900' : 'bg-white/20 text-white'}`}>
                {enableSearch ? 'ON' : 'OFF'}
              </span>
            </button>
            )}

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Xóa làm mới cuộc trò chuyện"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Expand / Minimize */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              title={isExpanded ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Đóng cửa sổ chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Sub-bar: Grounding Status & Context Info */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
              Ngữ cảnh:
            </span>
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
              {equipmentList.length} thiết bị lab
            </span>
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
              {bookings.length} ca đăng ký
            </span>
            {initialEquipmentContext && (
              <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold truncate max-w-[180px]">
                🎯 {initialEquipmentContext.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className={enableSearch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
              {aiInfo.search && enableSearch ? 'Đang kích hoạt Google Search Data' : 'Không tra cứu Internet'}
            </span>
          </div>
        </div>

        {/* Message History Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar for Assistant */}
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`flex flex-col max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : msg.isError
                    ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {/* Header for bubble */}
                <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-black/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
                    {msg.role === 'user' ? (
                      <span>{currentUser ? currentUser.name : 'Bạn'}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-700 font-bold">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Trợ lý LabLog Pro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'model' && !msg.isError && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-blue-600 transition-colors p-0.5 rounded"
                        title="Sao chép câu trả lời"
                      >
                        {copiedId === msg.id ? (
                          <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                            <Check className="w-3 h-3" /> Đã chép
                          </span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  {msg.role === 'user' ? (
                    <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>{renderFormattedMarkdown(msg.content)}</div>
                  )}
                </div>

                {/* Google Search Grounding Section (Display verified web queries and source links) */}
                {msg.grounding && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>Dữ Liệu Google Search Đã Tra Cứu (Real-time Grounding)</span>
                        </div>
                        <span className="text-[10px] bg-blue-200/60 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                          Google Verified
                        </span>
                      </div>

                      {/* Search Queries Used */}
                      {msg.grounding.searchQueries && msg.grounding.searchQueries.length > 0 && (
                        <div className="mb-2.5">
                          <span className="text-[11px] text-slate-500 font-medium block mb-1">
                            Truy vấn tìm kiếm:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.grounding.searchQueries.map((q, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 text-[11px] font-medium"
                              >
                                <Search className="w-2.5 h-2.5 text-blue-500" />
                                {q}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source Citations */}
                      {msg.grounding.sources && msg.grounding.sources.length > 0 && (
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block mb-1">
                            Nguồn tham chiếu ({msg.grounding.sources.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {msg.grounding.sources.map((src, idx) => {
                              let domain = '';
                              try {
                                domain = new URL(src.uri).hostname.replace('www.', '');
                              } catch {
                                domain = 'google.com';
                              }
                              return (
                                <a
                                  key={idx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white hover:bg-blue-100/50 border border-blue-200 text-slate-800 transition-colors group text-left"
                                  title={src.title || src.uri}
                                >
                                  <div className="truncate">
                                    <div className="text-xs font-semibold text-blue-700 group-hover:underline truncate">
                                      {src.title || domain}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {domain}
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar for User */}
              {msg.role === 'user' && (
                <div className={`w-8 h-8 rounded-lg ${currentUser?.avatarBg || 'bg-slate-700'} flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs mt-0.5`}>
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
              )}
            </div>
          ))}

          {/* Loading Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bot className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3.5 shadow-xs flex items-center gap-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  {enableSearch && <Globe className="w-3 h-3 text-emerald-600 animate-spin" />}
                  <span>{enableSearch ? 'Đang tìm kiếm Google & tổng hợp câu trả lời...' : 'Đang phân tích dữ liệu phòng lab...'}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/70 border-t border-slate-200 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap pb-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              Gợi ý:
            </span>
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(p.prompt)}
                className="text-xs px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 transition-colors shrink-0 font-medium disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về quy trình SOP, an toàn hóa chất, tìm kiếm Google hoặc kiểm định thiết bị..."
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-slate-300 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 max-h-32"
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-slate-400 hidden sm:block">
                Shift + Enter để xuống dòng
              </div>
            </div>

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputPrompt.trim()}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Gửi</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Vận hành bởi <strong>{aiInfo.label}</strong></span>
              {aiInfo.search && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Globe className="w-3 h-3 text-blue-500" />
                    Google Search Grounding tích hợp
                  </span>
                </>
              )}
            </div>
            <span className="text-slate-400 hidden sm:inline">LabLog Pro AI Assistant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
