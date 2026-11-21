import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { ItemPriceBenchmark, BudgetCategory, CreateBenchmarkRequest, UpdateBenchmarkRequest } from '../../../../types/models/finance';

interface BenchmarkModalPartProps {
    isOpen: boolean;
    initialData: ItemPriceBenchmark | null;
    categories: BudgetCategory[];
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: CreateBenchmarkRequest | UpdateBenchmarkRequest) => Promise<void>;
}

export const BenchmarkModalPart: React.FC<BenchmarkModalPartProps> = ({
    isOpen,
    initialData,
    categories,
    isSubmitting = false,
    onClose,
    onSubmit,
}) => {
    const [categoryId, setCategoryId] = useState('');
    const [itemName, setItemName] = useState('');
    const [unit, setUnit] = useState('Cái');
    const [price, setPrice] = useState<number>(0);
    const [supplierName, setSupplierName] = useState('');
    const [supplierLink, setSupplierLink] = useState('');

    useEffect(() => {
        if (initialData) {
            setCategoryId(initialData.categoryId);
            setItemName(initialData.itemName);
            setUnit(initialData.unit);
            setPrice(initialData.curMarketPrice ?? initialData.currentMarketPrice ?? 0);
            setSupplierName(initialData.supplierName ?? initialData.supplierReference ?? '');
            setSupplierLink(initialData.supplierLink ?? '');
        } else {
            setCategoryId(categories[0]?.id ?? '');
            setItemName('');
            setUnit('Cái');
            setPrice(0);
            setSupplierName('');
            setSupplierLink('');
        }
    }, [initialData, categories, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim() || !unit.trim() || !categoryId) return;
        try {
            await onSubmit({
                categoryId,
                itemName: itemName.trim(),
                unit: unit.trim(),
                curMarketPrice: price,
                currentMarketPrice: price,
                supplierName: supplierName.trim() || undefined,
                supplierReference: supplierName.trim() || undefined,
                supplierLink: supplierLink.trim() || undefined,
            });
            onClose();
        } catch {
            // Do not close on error, error dialog will be displayed
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {initialData ? 'Sửa Đơn Giá Benchmark' : 'Thêm Đơn Giá Benchmark'}
                    </h3>
                    <button onClick={onClose} disabled={isSubmitting} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Danh mục kinh phí *</label>
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
                        <label className="block text-xs font-semibold text-slate-700">Tên hạng mục / vật tư *</label>
                        <input
                            type="text"
                            required
                            disabled={isSubmitting}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Standee bạt PP (0.8m x 1.8m)"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn vị tính *</label>
                            <input
                                type="text"
                                required
                                disabled={isSubmitting}
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="VD: Cái, Tấm, Thùng"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá thị trường (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                disabled={isSubmitting}
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Tên nhà cung cấp</label>
                            <input
                                type="text"
                                disabled={isSubmitting}
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                placeholder="VD: Nhà in FPT Copy"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Link tham khảo (URL)</label>
                            <input
                                type="url"
                                disabled={isSubmitting}
                                value={supplierLink}
                                onChange={(e) => setSupplierLink(e.target.value)}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
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
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Benchmark'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
