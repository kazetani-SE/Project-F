import { isClubAdmin, useAuth } from '../../../context/authContext';
import React, { useState, useEffect, useCallback } from 'react';
import {
    HelpCircle,
    Pin,
    Plus,
    Search,
    AlertCircle,
    Loader2,
    XCircle,
} from 'lucide-react';
import {
    getFaqsBySeries,
    createFaq,
    updateFaqPin,
} from '../../../services/knowledgeService';
import {
    type FaqResponse,
    type CreateFaqRequest,
} from '../../../types/models/knowledge';

interface Props {
    seriesId: string;
}

export const FaqSection: React.FC<Props> = ({ seriesId }) => {
    const canWrite = isClubAdmin(useAuth().user?.clubRole);
    const [faqs, setFaqs] = useState<FaqResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formQuestion, setFormQuestion] = useState('');
    const [formAnswer, setFormAnswer] = useState('');
    const [formCategory, setFormCategory] = useState('Thể lệ & Tham dự');
    const [formIsPinned, setFormIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFaqs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getFaqsBySeries(
                seriesId,
                selectedCategory === 'ALL' ? undefined : selectedCategory,
            );
            setFaqs(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải kho FAQ');
        } finally {
            setIsLoading(false);
        }
    }, [seriesId, selectedCategory]);

    useEffect(() => {
        fetchFaqs();
    }, [fetchFaqs]);

    const handleTogglePin = async (faq: FaqResponse) => {
        try {
            const nextPinned = !faq.isPinned;
            await updateFaqPin(faq.id, { isPinned: nextPinned }, seriesId);
            setFaqs((prev) =>
                prev.map((f) => (f.id === faq.id ? { ...f, isPinned: nextPinned } : f)),
            );
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi ghim câu hỏi');
        }
    };

    const handleCreateFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formQuestion.trim() || !formAnswer.trim()) return;

        setIsSubmitting(true);
        try {
            const req: CreateFaqRequest = {
                question: formQuestion.trim(),
                answer: formAnswer.trim(),
                category: formCategory.trim(),
                isPinned: formIsPinned,
            };
            await createFaq(seriesId, req);
            setIsCreateModalOpen(false);
            setFormQuestion('');
            setFormAnswer('');
            await fetchFaqs();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi tạo câu hỏi FAQ');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Categories list
    const categories = Array.from(new Set(faqs.map((f) => f.category)));

    // Sort: Pinned first
    const sortedFaqs = [...faqs].sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
    });

    const filteredFaqs = sortedFaqs.filter((f) => {
        const matchQuery =
            f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
        return matchQuery && matchCat;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative min-w-[260px] flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                selectedCategory === 'ALL'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Tất cả danh mục ({faqs.length})
                        </button>
                        {categories.map((c) => (
                            <button
                                key={c}
                                onClick={() => setSelectedCategory(c)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    selectedCategory === c
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {c} ({faqs.filter((f) => f.category === c).length})
                            </button>
                        ))}
                    </div>
                </div>

                {canWrite && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Thêm câu hỏi FAQ</span>
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Danh sách FAQ Accordion / Cards */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải kho FAQ đa mùa…</p>
                </div>
            ) : filteredFaqs.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <HelpCircle className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có câu hỏi nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Thêm các câu hỏi thường gặp để các thế hệ BTC mùa sau dễ dàng tra cứu.
                    </p>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {filteredFaqs.map((faq) => (
                        <div
                            key={faq.id}
                            className={`rounded-2xl border p-5 transition-all ${
                                faq.isPinned
                                    ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                            {faq.category}
                                        </span>
                                        {faq.isPinned && (
                                            <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                                <Pin className="h-3 w-3 fill-emerald-700" /> Được ghim ưu tiên
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900">{faq.question}</h4>
                                </div>

                                {canWrite && (
                                    <button
                                        onClick={() => handleTogglePin(faq)}
                                        className={`rounded-xl p-2 transition-colors ${
                                            faq.isPinned
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                        }`}
                                        title={faq.isPinned ? 'Bỏ ghim câu hỏi' : 'Ghim câu hỏi lên đầu'}
                                    >
                                        <Pin className={`h-4 w-4 ${faq.isPinned ? 'fill-current' : ''}`} />
                                    </button>
                                )}
                            </div>

                            <p className="mt-3 text-sm leading-relaxed text-slate-600 pl-3 border-l-2 border-emerald-500">
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Thêm câu hỏi FAQ */}
            {canWrite && isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Thêm câu hỏi thường gặp (FAQ)</h3>
                                <p className="text-xs text-slate-500">
                                    Tích lũy câu hỏi và giải đáp đa mùa cho toàn chuỗi sự kiện
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFaq} className="mt-5 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700">Câu hỏi *</label>
                                <input
                                    type="text"
                                    required
                                    value={formQuestion}
                                    onChange={(e) => setFormQuestion(e.target.value)}
                                    placeholder="Ví dụ: Sinh viên năm nhất chưa có kinh nghiệm có tham gia được không?"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Danh mục phân loại *</label>
                                <input
                                    type="text"
                                    required
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value)}
                                    placeholder="Thể lệ & Tham dự / Tài chính / Hậu cần..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Câu trả lời chi tiết *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formAnswer}
                                    onChange={(e) => setFormAnswer(e.target.value)}
                                    placeholder="Giải thích rõ ràng quy định hoặc giải pháp..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="isPinnedCheck"
                                    checked={formIsPinned}
                                    onChange={(e) => setFormIsPinned(e.target.checked)}
                                    className="h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="isPinnedCheck" className="font-semibold text-slate-700 cursor-pointer">
                                    Ghim câu hỏi lên đầu danh sách ưu tiên
                                </label>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Lưu câu hỏi FAQ</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
