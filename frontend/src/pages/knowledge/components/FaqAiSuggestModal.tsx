import React, { useState } from 'react';
import {
    Sparkles,
    XCircle,
    Loader2,
    CheckCircle2,
    Pin,
    Save,
    Lightbulb,
} from 'lucide-react';
import { suggestFaqsByAi, createFaq } from '../../../services/knowledgeService';
import type { FaqSuggestionsResultResponse } from '../../../types/models/knowledge';

interface Props {
    seriesId: string;
    eventId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSavedSuccess: () => Promise<void>;
}

interface EditableSuggestion {
    question: string;
    category: string;
    rationale: string;
    answerHint: string;
    adminAnswer: string;
    isPinned: boolean;
    isSaved: boolean;
    isSaving: boolean;
}

const QUICK_TOPICS = [
    'Thể lệ & Đăng ký',
    'Hậu cần & Check-in',
    'Tài chính & Hoàn ứng BTC',
    'Quyền lợi & Chứng nhận',
];

export const FaqAiSuggestModal: React.FC<Props> = ({
    seriesId,
    eventId,
    isOpen,
    onClose,
    onSavedSuccess,
}) => {
    const [focusTopic, setFocusTopic] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [items, setItems] = useState<EditableSuggestion[]>([]);
    const [isSavingAll, setIsSavingAll] = useState<boolean>(false);

    if (!isOpen) return null;

    const handleGenerate = async (topicOverride?: string) => {
        const chosenTopic = topicOverride !== undefined ? topicOverride : focusTopic;
        setIsGenerating(true);
        try {
            const res: FaqSuggestionsResultResponse = await suggestFaqsByAi(seriesId, {
                eventId,
                focusTopic: chosenTopic.trim() || undefined,
                count: 5,
            });
            setItems(
                res.suggestions.map((s) => ({
                    ...s,
                    adminAnswer: '',
                    isPinned: false,
                    isSaved: false,
                    isSaving: false,
                })),
            );
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi gọi AI gợi ý câu hỏi FAQ');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswerChange = (index: number, value: string) => {
        setItems((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, adminAnswer: value } : item)),
        );
    };

    const handleQuestionChange = (index: number, value: string) => {
        setItems((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, question: value } : item)),
        );
    };

    const handleCategoryChange = (index: number, value: string) => {
        setItems((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, category: value } : item)),
        );
    };

    const handleApplyHint = (index: number) => {
        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                const cleanHint = item.answerHint.replace(/^Gợi ý:\s*/i, '');
                return { ...item, adminAnswer: cleanHint };
            }),
        );
    };

    const handleSaveSingle = async (index: number) => {
        const target = items[index];
        if (!target || target.isSaved || !target.adminAnswer.trim()) return;

        setItems((prev) =>
            prev.map((it, idx) => (idx === index ? { ...it, isSaving: true } : it)),
        );
        try {
            await createFaq(seriesId, {
                question: target.question.trim(),
                answer: target.adminAnswer.trim(),
                category: target.category.trim() || 'Thể lệ & Tham dự',
                isPinned: target.isPinned,
            });
            setItems((prev) =>
                prev.map((it, idx) =>
                    idx === index ? { ...it, isSaving: false, isSaved: true } : it,
                ),
            );
            await onSavedSuccess();
        } catch (err: unknown) {
            setItems((prev) =>
                prev.map((it, idx) => (idx === index ? { ...it, isSaving: false } : it)),
            );
            alert(err instanceof Error ? err.message : 'Không thể lưu câu hỏi FAQ');
        }
    };

    const handleSaveAllAnswered = async () => {
        const pendingIndexes = items
            .map((item, idx) => (!item.isSaved && item.adminAnswer.trim() ? idx : -1))
            .filter((idx) => idx >= 0);

        if (pendingIndexes.length === 0) return;

        setIsSavingAll(true);
        try {
            for (const idx of pendingIndexes) {
                const target = items[idx];
                await createFaq(seriesId, {
                    question: target.question.trim(),
                    answer: target.adminAnswer.trim(),
                    category: target.category.trim() || 'Thể lệ & Tham dự',
                    isPinned: target.isPinned,
                });
            }
            setItems((prev) =>
                prev.map((item, idx) =>
                    pendingIndexes.includes(idx) ? { ...item, isSaved: true } : item,
                ),
            );
            await onSavedSuccess();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi lưu hàng loạt câu hỏi FAQ');
        } finally {
            setIsSavingAll(false);
        }
    };

    const readyToSaveCount = items.filter((i) => !i.isSaved && i.adminAnswer.trim().length > 0)
        .length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                                Gợi ý câu hỏi FAQ bằng AI
                            </h3>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                AI Assistant
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Dự đoán các thắc mắc thường gặp dựa trên sự cố và phản hồi của sự kiện
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Controls */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                            <input
                                type="text"
                                value={focusTopic}
                                onChange={(e) => setFocusTopic(e.target.value)}
                                placeholder="Nhập chủ đề muốn AI gợi ý (hoặc để trống để AI tự tổng hợp đa mục)..."
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                            />
                            <button
                                type="button"
                                onClick={() => handleGenerate()}
                                disabled={isGenerating}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Đang phân tích...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Gợi ý câu hỏi</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-slate-500 mr-1">Chủ đề nhanh:</span>
                            {QUICK_TOPICS.map((topic) => (
                                <button
                                    key={topic}
                                    type="button"
                                    onClick={() => {
                                        setFocusTopic(topic);
                                        handleGenerate(topic);
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Empty or Generated List */}
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center">
                            <Sparkles className="h-8 w-8 text-slate-400" />
                            <h4 className="mt-3 text-sm font-semibold text-slate-700">
                                Bấm &ldquo;Gợi ý câu hỏi&rdquo; để bắt đầu
                            </h4>
                            <p className="mt-1 max-w-md text-xs text-slate-400">
                                Hệ thống sẽ đối chiếu kho FAQ hiện tại để không tạo câu hỏi trùng lặp, sau đó gợi ý bộ câu hỏi để bạn hoàn thiện câu trả lời.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                                <span>Gợi ý {items.length} câu hỏi dự kiến</span>
                                <span className="font-semibold text-emerald-700">
                                    Điền câu trả lời vào các câu bạn muốn xuất bản
                                </span>
                            </div>

                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`rounded-2xl border p-4 space-y-3 transition-all ${
                                        item.isSaved
                                            ? 'border-emerald-300 bg-emerald-50/30'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                                Câu #{idx + 1}
                                            </span>
                                            <input
                                                type="text"
                                                value={item.category}
                                                disabled={item.isSaved}
                                                onChange={(e) =>
                                                    handleCategoryChange(idx, e.target.value)
                                                }
                                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={item.isPinned}
                                                disabled={item.isSaved}
                                                onChange={(e) =>
                                                    setItems((prev) =>
                                                        prev.map((it, i) =>
                                                            i === idx
                                                                ? {
                                                                      ...it,
                                                                      isPinned: e.target.checked,
                                                                  }
                                                                : it,
                                                        ),
                                                    )
                                                }
                                                className="rounded-sm border-slate-300 text-emerald-600"
                                            />
                                            <Pin className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>Ghim ưu tiên</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            Câu hỏi do AI đề xuất (có thể chỉnh sửa):
                                        </label>
                                        <input
                                            type="text"
                                            value={item.question}
                                            disabled={item.isSaved}
                                            onChange={(e) =>
                                                handleQuestionChange(idx, e.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                                        />
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            <strong>Lý do gợi ý:</strong> {item.rationale}
                                        </p>
                                    </div>

                                    {/* Gợi ý khung trả lời */}
                                    <div className="flex items-start justify-between gap-2 rounded-xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-900">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                            <span>{item.answerHint}</span>
                                        </div>
                                        {!item.isSaved && (
                                            <button
                                                type="button"
                                                onClick={() => handleApplyHint(idx)}
                                                className="shrink-0 rounded-lg bg-white border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                                            >
                                                Dùng gợi ý
                                            </button>
                                        )}
                                    </div>

                                    {/* Quản trị viên điền câu trả lời */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Câu trả lời chính thức *:
                                        </label>
                                        <textarea
                                            rows={2}
                                            disabled={item.isSaved}
                                            value={item.adminAnswer}
                                            onChange={(e) =>
                                                handleAnswerChange(idx, e.target.value)
                                            }
                                            placeholder="Nhập câu trả lời chính thức cho câu hỏi này..."
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        {item.isSaved ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Đã lưu vào Kho FAQ</span>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={
                                                    !item.adminAnswer.trim() || item.isSaving
                                                }
                                                onClick={() => handleSaveSingle(idx)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                                            >
                                                {item.isSaving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Save className="h-3.5 w-3.5" />
                                                )}
                                                <span>Lưu câu hỏi</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5 shrink-0">
                    <span className="text-xs text-slate-500">
                        Đã điền câu trả lời cho <strong>{readyToSaveCount}</strong> câu hỏi chưa lưu
                    </span>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Đóng
                        </button>
                        {readyToSaveCount > 0 && (
                            <button
                                type="button"
                                disabled={isSavingAll}
                                onClick={handleSaveAllAnswered}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isSavingAll ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                <span>Lưu tất cả ({readyToSaveCount})</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
