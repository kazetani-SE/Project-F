import React, { useState, useRef, useEffect } from 'react';
import {
    Bot,
    Send,
    X,
    Sparkles,
    Cpu,
    BookOpen,
    AlertTriangle,
    MessageSquare,
    Loader2,
    Trash2,
} from 'lucide-react';
import { chatWithKnowledgeAi } from '../../../services/knowledgeService';
import type {
    KnowledgeChatCitation,
    KnowledgeChatTurnItem,
    AiModelTier,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
    seriesId: string;
    eventName?: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ChatMessageUI {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    modelUsed?: string;
    modelTier?: AiModelTier;
    routingReason?: string;
    citations?: KnowledgeChatCitation[];
    followUpQuestions?: string[];
}

const SAMPLE_PROMPTS = [
    {
        tierLabel: '⚡ Fast Tier (Haiku)',
        prompt: 'Quy định tham dự cho sinh viên năm nhất và thủ tục hoàn ứng BTC là gì?',
    },
    {
        tierLabel: '🧠 Deep Tier (Sonnet)',
        prompt: 'Phân tích nguyên nhân các sự cố và tổng hợp chiến lược khắc phục từ Feedback mùa này?',
    },
];

export const KnowledgeAiChatDrawer: React.FC<Props> = ({
    eventId,
    seriesId,
    eventName,
    isOpen,
    onClose,
}) => {
    const [messages, setMessages] = useState<ChatMessageUI[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content:
                'Xin chào! Tôi là **Trợ lý AI Kho Tri Thức Đa Mùa** (RAG). Tôi có thể tra cứu trực tiếp trên **Kho FAQ**, **Nhật ký Sự cố Post-Mortem** và **Dữ liệu Khảo sát Feedback** của sự kiện. Hệ thống `AiModelRouter` sẽ tự động chọn **Fast Model (Haiku/Nova Lite)** cho câu hỏi tra cứu nhanh và **Deep Model (Sonnet/Opus)** cho câu hỏi phân tích chuyên sâu.',
            followUpQuestions: [
                'Các câu hỏi FAQ nào đang được ghim ưu tiên?',
                'Tại sao xảy ra các sự cố nghiêm trọng và bài học kế thừa cho mùa sau là gì?',
            ],
        },
    ]);
    const [input, setInput] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    if (!isOpen) return null;

    const handleSendMessage = async (textOverride?: string) => {
        const question = (textOverride !== undefined ? textOverride : input).trim();
        if (!question || isSending) return;

        const userMsg: ChatMessageUI = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: question,
        };

        const historyPayload: KnowledgeChatTurnItem[] = messages
            .filter((m) => m.id !== 'welcome')
            .slice(-6)
            .map((m) => ({
                role: m.role,
                content: m.content,
            }));

        setMessages((prev) => [...prev, userMsg]);
        if (textOverride === undefined) {
            setInput('');
        }
        setIsSending(true);

        try {
            const res = await chatWithKnowledgeAi(eventId, {
                seriesId,
                message: question,
                history: historyPayload,
            });

            const botMsg: ChatMessageUI = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: res.answer,
                modelUsed: res.modelUsed,
                modelTier: res.modelTier,
                routingReason: res.routingReason,
                citations: res.citations,
                followUpQuestions: res.followUpQuestions,
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err: unknown) {
            const errMsg: ChatMessageUI = {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content:
                    err instanceof Error
                        ? `⚠️ Không thể kết nối Trợ lý AI: ${err.message}`
                        : '⚠️ Đã xảy ra lỗi khi truy vấn Kho Tri Thức.',
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setIsSending(false);
        }
    };

    const handleResetChat = () => {
        setMessages((prev) => [prev[0]]);
    };

    const renderSourceIcon = (sourceType: string) => {
        if (sourceType === 'INCIDENT') {
            return <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />;
        }
        if (sourceType === 'FEEDBACK') {
            return <MessageSquare className="h-3 w-3 text-amber-500 shrink-0" />;
        }
        return <BookOpen className="h-3 w-3 text-emerald-600 shrink-0" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
            <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold">
                                    Chatbot Trợ Lý Kho Tri Thức (RAG)
                                </h3>
                                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                                    AWS Bedrock
                                </span>
                            </div>
                            <p className="text-[11px] text-emerald-100 truncate max-w-xs">
                                {eventName || 'Đang kết nối FAQ, Sự cố Post-Mortem & Feedback'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleResetChat}
                            className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors"
                            title="Làm mới cuộc trò chuyện"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Tier Demo Banner */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Thử nghiệm Tự động Định tuyến Model (Smart Model Routing):
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {SAMPLE_PROMPTS.map((sp, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={isSending}
                                onClick={() => handleSendMessage(sp.prompt)}
                                className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                            >
                                <span className="text-[10px] font-bold text-emerald-700">
                                    {sp.tierLabel}
                                </span>
                                <span className="text-[11px] text-slate-600 line-clamp-1">
                                    {sp.prompt}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${
                                msg.role === 'user' ? 'items-end' : 'items-start'
                            }`}
                        >
                            <div
                                className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-br-xs'
                                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
                                }`}
                            >
                                {/* Model Tier Badge on Assistant messages */}
                                {msg.role === 'assistant' && msg.modelTier && (
                                    <div className="mb-2 flex flex-wrap items-center gap-1.5 pb-1.5 border-b border-slate-200/80">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                                msg.modelTier === 'DEEP'
                                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                                    : 'bg-sky-50 text-sky-800 border-sky-200'
                                            }`}
                                        >
                                            <Cpu className="h-3 w-3" />
                                            {msg.modelTier === 'DEEP'
                                                ? '🧠 Deep Tier (Sonnet/Opus)'
                                                : '⚡ Fast Tier (Haiku/Nova)'}
                                        </span>
                                        {msg.routingReason && (
                                            <span className="text-[10px] text-slate-500">
                                                {msg.routingReason}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="whitespace-pre-line">{msg.content}</div>

                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                            Nguồn trích dẫn thực tế (RAG Citations):
                                        </span>
                                        {msg.citations.map((cit, cIdx) => (
                                            <div
                                                key={cIdx}
                                                className="rounded-lg bg-white p-2 border border-slate-200 text-[11px]"
                                            >
                                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                                    {renderSourceIcon(cit.sourceType)}
                                                    <span>
                                                        [{cit.sourceType}] {cit.title}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-slate-500 line-clamp-2">
                                                    {cit.snippet}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Follow-up suggestions */}
                            {msg.role === 'assistant' &&
                                msg.followUpQuestions &&
                                msg.followUpQuestions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                                        {msg.followUpQuestions.map((fq, fIdx) => (
                                            <button
                                                key={fIdx}
                                                type="button"
                                                disabled={isSending}
                                                onClick={() => handleSendMessage(fq)}
                                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 transition-colors text-left"
                                            >
                                                <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
                                                <span>{fq}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>
                    ))}

                    {isSending && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            <span>
                                AiModelRouter đang chọn Model & truy xuất dữ liệu Kho Tri Thức…
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Box */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="border-t border-slate-200 bg-white p-3.5"
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Đặt câu hỏi về FAQ, sự cố mùa trước hoặc đánh giá sự kiện..."
                            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isSending}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
