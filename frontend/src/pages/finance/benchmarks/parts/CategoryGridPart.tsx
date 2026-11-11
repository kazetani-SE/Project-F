import React from 'react';
import { CategoryCard } from '../components/CategoryCard';
import type { BudgetCategory, ItemPriceBenchmark } from '../../../../types/models/finance';

interface CategoryGridPartProps {
    categories: BudgetCategory[];
    benchmarks: ItemPriceBenchmark[];
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (id: string) => void;
}

export const CategoryGridPart: React.FC<CategoryGridPartProps> = ({
    categories,
    benchmarks,
    onEdit,
    onDelete,
}) => {
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

