import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import type { BudgetCategory, ItemPriceBenchmark, CreateBudgetItemRequest } from '../../../../types/models/finance';

interface CreateBudgetItemModalPartProps {
    isOpen: boolean;
    categories: BudgetCategory[];
    benchmarks: ItemPriceBenchmark[];
    onClose: () => void;
    onSubmit: (data: CreateBudgetItemRequest) => Promise<void>;
}

export const CreateBudgetItemModalPart: React.FC<CreateBudgetItemModalPartProps> = ({
    isOpen,
    categories,
    benchmarks,
    onClose,
    onSubmit,
}) => {
    const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
    const [categoryId, setCategoryId] = useState('');
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [unit, setUnit] = useState('Cái');
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedBenchmarkId('');
            setCategoryId(categories[0]?.id ?? '');
            setItemName('');
            setQuantity(1);
            setUnit('Cái');
            setEstimatedPrice(0);
            setNotes('');
        }
    }, [isOpen, categories]);

    if (!isOpen) return null;

    const handleBenchmarkChange = (bmId: string) => {
        setSelectedBenchmarkId(bmId);
        if (!bmId) return;
        const bm = benchmarks.find(b => b.id === bmId);
        if (bm) {
            setCategoryId(bm.categoryId);
            setItemName(bm.itemName);
            setUnit(bm.unit);
            setEstimatedPrice(bm.currentMarketPrice);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !itemName.trim()) return;

        await onSubmit({
            categoryId,
            benchmarkId: selectedBenchmarkId || undefined,
            itemName: itemName.trim(),
            quantity,
            unit: unit.trim(),
            estimatedUnitPrice: estimatedPrice,
            notes: notes.trim() || undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Thêm Hạng Mục Dự Trù Mới</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Auto-fill from benchmark */}
                    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            Chọn nhanh từ Bảng Giá Benchmark (Tự điền định mức)
                        </label>
                        <select
                            value={selectedBenchmarkId}
                            onChange={(e) => handleBenchmarkChange(e.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                        >
                            <option value="">-- Tùy chọn: Chọn vật tư chuẩn --</option>
                            {benchmarks.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.itemName} — {formatVND(b.currentMarketPrice)}/{b.unit}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Danh mục kinh phí *</label>
                        <select
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="">Chọn danh mục</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tên hạng mục *</label>
                        <input
                            type="text"
                            required
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Backdrop sân khấu, Thẻ đeo..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Số lượng *</label>
                            <input
                                type="number"
                                required
                                min={0.01}
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn vị tính *</label>
                            <input
                                type="text"
                                required
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="Cái, Mét, Thùng"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá dự kiến (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                value={estimatedPrice}
                                onChange={(e) => setEstimatedPrice(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tổng tiền dự kiến</label>
                        <div className="mt-1 flex h-10 items-center rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-900">
                            {formatVND(quantity * estimatedPrice)}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Ghi chú & Thuyết minh</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Mô tả mục đích sử dụng..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Thêm Dự Trù
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

