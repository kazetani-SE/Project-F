import React, { useState, useRef, useEffect } from 'react';
import {
    Bot,
    Send,
    X,
    Sparkles,
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
    citations?: KnowledgeChatCitation[];
    followUpQuestions?: string[];
}

const SAMPLE_PROMPTS = [
    'Quy định tham gia sự kiện và thủ tục hoàn ứng chi phí?',
    'Tổng hợp các bài học sự cố và giải pháp khắc phục từ phản hồi khảo sát?',
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
                'Xin chào! Tôi là Trợ lý AI Kho tri thức. Tôi có thể giúp bạn tra cứu quy định FAQ, bài học sự cố (Post-Mortem) và phân tích ý kiến phản hồi khảo sát của sự kiện.',
            followUpQuestions: [
                'Các câu hỏi FAQ nào đang được ghim ưu tiên?',
                'Tổng hợp bài học kinh nghiệm từ các sự cố mùa trước?',
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
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                            <Bot className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">
                                Trợ lý AI Kho tri thức
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                {eventName || 'Hỏi đáp FAQ, sự cố Post-Mortem & phản hồi sự kiện'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleResetChat}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                            title="Làm mới cuộc trò chuyện"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Suggested Questions */}
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">
                        Gợi ý câu hỏi:
                    </span>
                    <div className="flex flex-col gap-1.5">
                        {SAMPLE_PROMPTS.map((prompt, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={isSending}
                                onClick={() => handleSendMessage(prompt)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                            >
                                {prompt}
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
                                <div className="whitespace-pre-line">{msg.content}</div>

                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                                        <span className="text-[10px] font-semibold text-slate-500 block">
                                            Nguồn tham chiếu:
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
                            <span>Trợ lý AI đang tra cứu và trả lời…</span>
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
