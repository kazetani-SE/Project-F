import React from 'react';
import { Filter } from 'lucide-react';
import type { BudgetCategory } from '../../../../types/models/finance';

interface BudgetFilterPartProps {
    statusFilter: string;
    onStatusChange: (status: string) => void;
    categoryFilter: string;
    onCategoryChange: (catId: string) => void;
    categories: BudgetCategory[];
}

export const BudgetFilterPart: React.FC<BudgetFilterPartProps> = ({
    statusFilter,
    onStatusChange,
    categoryFilter,
    onCategoryChange,
    categories,
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ duyệt (PENDING)</option>
                    <option value="APPROVED">Đã duyệt (APPROVED)</option>
                    <option value="REJECTED">Từ chối (REJECTED)</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <select
                    value={categoryFilter}
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

