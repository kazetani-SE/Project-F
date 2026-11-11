import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { BudgetCategory } from '../../../../types/models/finance';

interface BenchmarkFilterPartProps {
    searchKeyword: string;
    onSearchChange: (keyword: string) => void;
    selectedCategory: string;
    onCategoryChange: (catId: string) => void;
    categories: BudgetCategory[];
}

export const BenchmarkFilterPart: React.FC<BenchmarkFilterPartProps> = ({
    searchKeyword,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories,
}) => {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm kiếm tên vật tư, nhà cung cấp..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
            </div>

            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                    value={selectedCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                    <option value="ALL">Tất cả danh mục</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

