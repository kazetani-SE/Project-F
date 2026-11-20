import React from 'react';
import { RefreshCw } from 'lucide-react';
import { CategoryCard } from '../components/CategoryCard';
import type { BudgetCategory, ItemPriceBenchmark } from '../../../../types/models/finance';

interface CategoryGridPartProps {
    categories: BudgetCategory[];
    benchmarks: ItemPriceBenchmark[];
    loading?: boolean;
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (cat: BudgetCategory) => void;
}

export const CategoryGridPart: React.FC<CategoryGridPartProps> = ({
    categories,
    benchmarks,
    loading = false,
    onEdit,
    onDelete,
}) => {
    if (loading) {
        return (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-sm font-medium">Đang tải danh mục kinh phí...</span>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                Không có danh mục kinh phí nào.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
                <CategoryCard
                    key={c.id}
                    category={c}
                    benchmarks={benchmarks}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};
