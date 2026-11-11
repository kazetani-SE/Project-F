import React from 'react';
import { Tag, Edit2, Trash2 } from 'lucide-react';
import type { BudgetCategory, ItemPriceBenchmark } from '../../../../types/models/finance';

interface CategoryCardProps {
    category: BudgetCategory;
    benchmarks: ItemPriceBenchmark[];
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (id: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    benchmarks,
    onEdit,
    onDelete,
}) => {
    const count = benchmarks.filter(b => b.categoryId === category.id).length;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                            <Tag className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold text-slate-900">{category.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onEdit(category)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Sửa danh mục"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(category.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa danh mục"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                    {category.description || 'Chưa có mô tả chi tiết cho nhóm danh mục này.'}
                </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                {count} vật tư thuộc danh mục
            </div>
        </div>
    );
};

