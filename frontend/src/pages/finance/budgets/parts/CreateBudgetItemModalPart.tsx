import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import type { BudgetCategory, ItemPriceBenchmark, CreateBudgetItemRequest } from '../../../../types/models/finance';

interface CreateBudgetItemModalPartProps {
    isOpen: boolean;
    categories: BudgetCategory[];
    benchmarks: ItemPriceBenchmark[];
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: CreateBudgetItemRequest) => Promise<void>;
}

export const CreateBudgetItemModalPart: React.FC<CreateBudgetItemModalPartProps> = ({
    isOpen,
    categories,
    benchmarks,
    isSubmitting = false,
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
    const [supplierName, setSupplierName] = useState('');
    const [supplierLink, setSupplierLink] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedBenchmarkId('');
            setCategoryId(categories[0]?.id ?? '');
            setItemName('');
            setQuantity(1);
            setUnit('Cái');
            setEstimatedPrice(0);
            setNotes('');
            setSupplierName('');
            setSupplierLink('');
            setValidationError(null);
        }
    }, [isOpen, categories]);

    if (!isOpen) return null;

    const handleBenchmarkChange = (bmId: string) => {
        setSelectedBenchmarkId(bmId);
        setValidationError(null);
        if (!bmId) return;
        const bm = benchmarks.find(b => b.id === bmId);
        if (bm) {
            setCategoryId(bm.categoryId);
            setItemName(bm.itemName);
            setUnit(bm.unit);
            setEstimatedPrice(bm.curMarketPrice ?? bm.currentMarketPrice ?? 0);
            setSupplierName(bm.supplierName ?? bm.supplierReference ?? '');
            setSupplierLink(bm.supplierLink ?? '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        if (!categoryId || !itemName.trim()) return;
        if (!selectedBenchmarkId && !supplierName.trim()) {
            setValidationError('Bắt buộc nhập nhà cung cấp (nơi mua) khi không chọn đơn giá benchmark có sẵn.');
            return;
        }

        try {
            await onSubmit({
                categoryId,
                benchmarkId: selectedBenchmarkId || undefined,
                itemName: itemName.trim(),
                quantity,
                unit: unit.trim(),
                estUnitPrice: estimatedPrice,
                estimatedUnitPrice: estimatedPrice,
                notes: notes.trim() || undefined,
                supplierName: !selectedBenchmarkId ? supplierName.trim() : undefined,
                supplierLink: !selectedBenchmarkId && supplierLink.trim() ? supplierLink.trim() : undefined,
            });
            onClose();
        } catch {
            // Do not close on error, error dialog will be displayed
        }
    };

    const totalEstimate = quantity * estimatedPrice;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Thêm Hạng Mục Dự Trù Ngân Sách</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Tự động tính thành tiền qua cột tính toán STORED</p>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {validationError && (
                    <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                        {validationError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Select from Benchmark shortcut */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                            <Sparkles className="h-4 w-4" />
                            <span>Gợi ý giá từ Bảng Giá Benchmark</span>
                        </div>
                        <select
                            disabled={isSubmitting}
                            value={selectedBenchmarkId}
                            onChange={(e) => handleBenchmarkChange(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        >
                            <option value="">-- Chọn đơn giá mẫu (hoặc tự nhập mới) --</option>
                            {benchmarks.map((b) => {
                                const price = b.curMarketPrice ?? b.currentMarketPrice ?? 0;
                                return (
                                    <option key={b.id} value={b.id}>
                                        {b.itemName} ({formatVND(price)} / {b.unit})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Danh mục ngân sách *</label>
                        <select
                            required
                            disabled={isSubmitting}
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
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
                            disabled={isSubmitting}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Cúp pha lê vinh danh"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Số lượng *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                disabled={isSubmitting}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn vị *</label>
                            <input
                                type="text"
                                required
                                disabled={isSubmitting}
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="Cái, Bộ..."
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                disabled={isSubmitting}
                                value={estimatedPrice}
                                onChange={(e) => setEstimatedPrice(parseInt(e.target.value) || 0)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    {!selectedBenchmarkId && (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                            <div className="text-xs font-semibold text-amber-900">
                                Thông tin nơi mua / Nhà cung cấp (Bắt buộc để lưu benchmark)
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700">Tên nhà cung cấp *</label>
                                <input
                                    type="text"
                                    required
                                    disabled={isSubmitting}
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    placeholder="VD: Cửa hàng ABC, Shopee Mall..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700">Link nơi mua*</label>
                                <input
                                    type="url"
                                    required
                                    disabled={isSubmitting}
                                    value={supplierLink}
                                    onChange={(e) => setSupplierLink(e.target.value)}
                                    placeholder="https://..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Ghi chú mục đích sử dụng</label>
                        <textarea
                            rows={2}
                            disabled={isSubmitting}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Mục đích sử dụng, vị trí đặt, yêu cầu đặc biệt..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    {/* Calculated total preview */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Thành tiền tạm tính:</span>
                        <span className="text-base font-bold text-emerald-700">{formatVND(totalEstimate)}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Dự Trù'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
