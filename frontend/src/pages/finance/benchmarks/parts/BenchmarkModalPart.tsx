import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ItemPriceBenchmark, BudgetCategory, CreateBenchmarkRequest, UpdateBenchmarkRequest } from '../../../../types/models/finance';

interface BenchmarkModalPartProps {
    isOpen: boolean;
    initialData: ItemPriceBenchmark | null;
    categories: BudgetCategory[];
    onClose: () => void;
    onSubmit: (data: CreateBenchmarkRequest | UpdateBenchmarkRequest) => Promise<void>;
}

export const BenchmarkModalPart: React.FC<BenchmarkModalPartProps> = ({
    isOpen,
    initialData,
    categories,
    onClose,
    onSubmit,
}) => {
    const [categoryId, setCategoryId] = useState('');
    const [itemName, setItemName] = useState('');
    const [unit, setUnit] = useState('Cái');
    const [price, setPrice] = useState<number>(0);
    const [supplier, setSupplier] = useState('');

    useEffect(() => {
        if (initialData) {
            setCategoryId(initialData.categoryId);
            setItemName(initialData.itemName);
            setUnit(initialData.unit);
            setPrice(initialData.currentMarketPrice);
            setSupplier(initialData.supplierReference ?? '');
        } else {
            setCategoryId(categories[0]?.id ?? '');
            setItemName('');
            setUnit('Cái');
            setPrice(0);
            setSupplier('');
        }
    }, [initialData, categories, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim() || !unit.trim() || !categoryId) return;
        await onSubmit({
            categoryId,
            itemName: itemName.trim(),
            unit: unit.trim(),
            currentMarketPrice: price,
            supplierReference: supplier.trim() || undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {initialData ? 'Sửa Đơn Giá Benchmark' : 'Thêm Đơn Giá Benchmark'}
                    </h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                        <label className="block text-xs font-semibold text-slate-700">Tên hạng mục / vật tư *</label>
                        <input
                            type="text"
                            required
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Standee bạt PP (0.8m x 1.8m)"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn vị tính *</label>
                            <input
                                type="text"
                                required
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="VD: Cái, Tấm, Thùng"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá thị trường (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tham chiếu nhà cung cấp</label>
                        <input
                            type="text"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            placeholder="VD: Nhà in FPT Copy, Bách Hóa Xanh"
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
                            Lưu Benchmark
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

