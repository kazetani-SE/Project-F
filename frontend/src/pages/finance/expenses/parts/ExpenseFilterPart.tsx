import React from 'react';
import { Filter } from 'lucide-react';

interface ExpenseFilterPartProps {
    statusFilter: string;
    onStatusChange: (status: string) => void;
}

export const ExpenseFilterPart: React.FC<ExpenseFilterPartProps> = ({
    statusFilter,
    onStatusChange,
}) => {
    return (
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
    );
};

