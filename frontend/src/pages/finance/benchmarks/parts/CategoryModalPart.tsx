import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { BudgetCategory, CreateBudgetCategoryRequest, UpdateBudgetCategoryRequest } from '../../../../types/models/finance';

interface CategoryModalPartProps {
    isOpen: boolean;
    initialData: BudgetCategory | null;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: CreateBudgetCategoryRequest | UpdateBudgetCategoryRequest) => Promise<void>;
}

export const CategoryModalPart: React.FC<CategoryModalPartProps> = ({
    isOpen,
    initialData,
    isSubmitting = false,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description ?? '');
        } else {
            setName('');
            setDescription('');
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
            });
            onClose();
        } catch {
            // Do not close on error, error dialog will be displayed
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        {initialData ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                    </h3>
                    <button onClick={onClose} disabled={isSubmitting} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tên danh mục *</label>
                        <input
                            type="text"
                            required
                            disabled={isSubmitting}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="VD: Hậu cần & Địa điểm"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Mô tả chi tiết</label>
                        <textarea
                            rows={3}
                            disabled={isSubmitting}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả phạm vi các chi phí thuộc danh mục này..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
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
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Danh Mục'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
