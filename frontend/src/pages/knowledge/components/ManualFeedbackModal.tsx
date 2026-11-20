import React, { useState, useId } from 'react';
import {
    PenLine,
    XCircle,
    Loader2,
    Star,
    Plus,
    Trash2,
    AlertCircle,
} from 'lucide-react';
import { submitFeedback } from '../../../services/knowledgeService';
import { useAuth } from '../../../context/authContext';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useSuccessToast } from '../../../components/ui/toastContext';
import {
    FEEDBACK_SOURCE_LABELS,
    type FeedbackSourceType,
    type CreateFeedbackRequest,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

interface CustomCriteriaRow {
    id: string;
    label: string;
    value: string;
    isRating: boolean;
}

export const ManualFeedbackModal: React.FC<Props> = ({
    eventId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const sourceSelectId = useId();
    const platformSelectId = useId();
    const { user } = useAuth();
    const { currentEvent } = useActiveEvent();
    const showToast = useSuccessToast();

    const [sourceType, setSourceType] = useState<FeedbackSourceType>('ATTENDEE');
    const [platform, setPlatform] = useState<string>('Nhập thủ công');
    const [ratingScore, setRatingScore] = useState<number>(4);
    const [highlightContent, setHighlightContent] = useState<string>('');
    const [improvementContent, setImprovementContent] = useState<string>('');
    const [criteriaRows, setCriteriaRows] = useState<CustomCriteriaRow[]>([
        { id: 'crit-1', label: 'Chất lượng nội dung', value: '4', isRating: true },
        { id: 'crit-2', label: 'Sẽ quay lại mùa sau', value: 'Có', isRating: false },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddCriteria = () => {
        setCriteriaRows((prev) => [
            ...prev,
            {
                id: `crit-${Date.now()}-${prev.length}`,
                label: '',
                value: '',
                isRating: false,
            },
        ]);
    };

    const handleRemoveCriteria = (id: string) => {
        setCriteriaRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleUpdateCriteria = (
        id: string,
        field: 'label' | 'value' | 'isRating',
        val: string | boolean,
    ) => {
        setCriteriaRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!highlightContent.trim() && !improvementContent.trim()) {
            setErrorMessage('Vui lòng nhập ít nhất "Điểm làm tốt" hoặc "Cần khắc phục".');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const metadata: Record<string, string> = {};
            const ratings: { question: string; score: number; scaleMax: number }[] = [];

            for (const row of criteriaRows) {
                const k = row.label.trim();
                const v = row.value.trim();
                if (!k || !v) continue;

                const numVal = Number(v);
                if (row.isRating || (!Number.isNaN(numVal) && numVal >= 1 && numVal <= 5)) {
                    const clamped = Math.min(5, Math.max(1, Number.isNaN(numVal) ? ratingScore : numVal));
                    ratings.push({
                        question: k,
                        score: clamped,
                        scaleMax: 5,
                    });
                } else {
                    metadata[k] = v;
                }
            }

            const eventName = currentEvent?.name || 'Sự kiện';
            const req: CreateFeedbackRequest = {
                sourceType,
                fileUrl: `https://project-f-media-storage.s3.ap-southeast-1.amazonaws.com/feedbacks/nhap_thu_cong_${sourceType.toLowerCase()}.xlsx`,
                ratingScore,
                highlightContent: highlightContent.trim() || null,
                improvementContent: improvementContent.trim() || null,
                customResponses: {
                    _schemaVersion: 2,
                    _overallRawScore: ratingScore,
                    _overallScaleMax: 5,
                    _formTitle: `Phản hồi lẻ (${FEEDBACK_SOURCE_LABELS[sourceType]}) · ${eventName}`,
                    _formPlatform: platform,
                    _importedBy: user?.fullName || 'Người dùng hiện tại',
                    _skippedRows: 0,
                    metadata,
                    ratings,
                    suggestions: [],
                },
            };

            await submitFeedback(eventId, req);
            showToast('Đã thêm phản hồi thủ công thành công!');
            setHighlightContent('');
            setImprovementContent('');
            await onSuccess();
            onClose();
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Lỗi khi lưu phản hồi thủ công',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
                            <PenLine className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Nhập phản hồi khảo sát thủ công
                            </h3>
                            <p className="text-xs text-slate-500">
                                Dùng cho phản hồi lẻ nhận qua email, phỏng vấn trực tiếp hoặc tin nhắn
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                    {errorMessage && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label
                                htmlFor={sourceSelectId}
                                className="block font-semibold text-slate-700 mb-1"
                            >
                                Đối tượng phản hồi *
                            </label>
                            <select
                                id={sourceSelectId}
                                value={sourceType}
                                onChange={(e) => setSourceType(e.target.value as FeedbackSourceType)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                            >
                                {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor={platformSelectId}
                                className="block font-semibold text-slate-700 mb-1"
                            >
                                Nguồn thu nhận
                            </label>
                            <select
                                id={platformSelectId}
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                            >
                                <option value="Nhập thủ công">Nhập thủ công (Email / Trực tiếp)</option>
                                <option value="Google Forms">Google Forms</option>
                                <option value="Microsoft Forms">Microsoft Forms</option>
                            </select>
                        </div>
                    </div>

                    {/* Star Rating Selector */}
                    <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                            Điểm đánh giá chung (1 – 5 sao) *
                        </label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRatingScore(star)}
                                    className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                        ratingScore >= star
                                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                                            : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                                    }`}
                                >
                                    <Star
                                        className={`h-4 w-4 ${
                                            ratingScore >= star
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-slate-300'
                                        }`}
                                    />
                                    <span>{star}</span>
                                </button>
                            ))}
                            <span className="ml-2 text-xs font-semibold text-slate-600">
                                Đang chọn: {ratingScore}/5 sao
                            </span>
                        </div>
                    </div>

                    {/* Highlight Content */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider text-emerald-700 text-[11px] mb-1">
                            Điểm làm tốt
                        </label>
                        <textarea
                            rows={2}
                            value={highlightContent}
                            onChange={(e) => setHighlightContent(e.target.value)}
                            placeholder="VD: Nội dung workshop thực tế, mentor nhiệt tình..."
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>

                    {/* Improvement Content */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider text-amber-700 text-[11px] mb-1">
                            Cần khắc phục
                        </label>
                        <textarea
                            rows={2}
                            value={improvementContent}
                            onChange={(e) => setImprovementContent(e.target.value)}
                            placeholder="VD: Thời gian nghỉ hơi ngắn, phòng hơi nóng buổi chiều..."
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>

                    {/* Custom Criteria (JSONB) */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">
                                Tiêu chí riêng & câu hỏi mở rộng (JSONB)
                            </span>
                            <button
                                type="button"
                                onClick={handleAddCriteria}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Thêm tiêu chí</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {criteriaRows.map((row) => (
                                <div key={row.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={row.label}
                                        onChange={(e) =>
                                            handleUpdateCriteria(row.id, 'label', e.target.value)
                                        }
                                        placeholder="Tên tiêu chí (VD: Chất lượng nội dung)"
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    />
                                    <input
                                        type="text"
                                        value={row.value}
                                        onChange={(e) =>
                                            handleUpdateCriteria(row.id, 'value', e.target.value)
                                        }
                                        placeholder="Giá trị (VD: 4 hoặc Có)"
                                        className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCriteria(row.id)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        title="Xóa tiêu chí"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>Lưu phản hồi</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
