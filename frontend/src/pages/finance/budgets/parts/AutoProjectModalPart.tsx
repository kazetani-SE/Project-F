import React, { useState } from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import { ProjectedPreviewRow } from '../components/ProjectedPreviewRow';
import type { ProjectedBudgetItem } from '../../../../types/models/finance';

interface AutoProjectModalPartProps {
    isOpen: boolean;
    availableEvents: Array<{ id: string; name: string; seasonLabel?: string | null }>;
    projectedPreview: ProjectedBudgetItem[];
    loading: boolean;
    onClose: () => void;
    onSelectPreviousEvent: (prevEventId: string) => void;
    onConfirm: (prevEventId: string) => Promise<void>;
}

export const AutoProjectModalPart: React.FC<AutoProjectModalPartProps> = ({
    isOpen,
    availableEvents,
    projectedPreview,
    loading,
    onClose,
    onSelectPreviousEvent,
    onConfirm,
}) => {
    const [selectedPrevEventId, setSelectedPrevEventId] = useState('');

    if (!isOpen) return null;

    const handleEventChange = (eventId: string) => {
        setSelectedPrevEventId(eventId);
        onSelectPreviousEvent(eventId);
    };

    const handleConfirm = async () => {
        if (!selectedPrevEventId) return;
        await onConfirm(selectedPrevEventId);
        onClose();
    };

    const totalProjectedAmount = projectedPreview.reduce((sum, item) => sum + item.projectedCurrentCost, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Dự Toán Tự Động Từ Mùa Trước</h3>
                            <p className="text-xs text-slate-500">
                                Công thức: <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-semibold">Thực tế đã chi mùa trước &times; Đơn giá benchmark hiện hành</code>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Chọn sự kiện tham chiếu mùa trước *</label>
                        <select
                            value={selectedPrevEventId}
                            onChange={(e) => handleEventChange(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                        >
                            <option value="">-- Chọn mùa sự kiện để kế thừa --</option>
                            {availableEvents.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.name} ({e.seasonLabel || 'Mùa trước'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex h-36 items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                        </div>
                    ) : projectedPreview.length > 0 ? (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600">
                                    Xem trước bảng dự toán ({projectedPreview.length} hạng mục)
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                    Tổng tạm tính: {formatVND(totalProjectedAmount)}
                                </span>
                            </div>
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200 text-xs">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left">Hạng Mục</th>
                                            <th className="px-3 py-2.5 text-center">SL Thực Chi Cũ</th>
                                            <th className="px-3 py-2.5 text-right">Đơn Giá Cũ</th>
                                            <th className="px-3 py-2.5 text-right">Đơn Giá Mới</th>
                                            <th className="px-4 py-2.5 text-right">Thành Tiền Mới</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {projectedPreview.map((p, idx) => (
                                            <ProjectedPreviewRow key={p.previousBudgetItemId || idx} item={p} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : selectedPrevEventId ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                            Mùa sự kiện được chọn không có dữ liệu thực chi đã duyệt để tạo dự toán.
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            disabled={projectedPreview.length === 0}
                            onClick={handleConfirm}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
                        >
                            <Sparkles className="h-4 w-4" />
                            Xác Nhận Kế Thừa Vào Dự Toán
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
