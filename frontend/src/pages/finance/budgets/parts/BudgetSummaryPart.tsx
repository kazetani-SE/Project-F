import React from 'react';
import { formatVND } from '../../components/CurrencyText';
import type { BudgetItem } from '../../../../types/models/finance';

interface BudgetSummaryPartProps {
    totalEstimatedSum: number;
    items: BudgetItem[];
}

export const BudgetSummaryPart: React.FC<BudgetSummaryPartProps> = ({
    totalEstimatedSum,
    items,
}) => {
    const approvedCount = items.filter(i => i.approvalStatus === 'APPROVED').length;
    const pendingCount = items.filter(i => i.approvalStatus === 'PENDING').length;
    const rejectedCount = items.filter(i => i.approvalStatus === 'REJECTED').length;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tổng Dự Trù Đang Hiển Thị
                </span>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                    {formatVND(totalEstimatedSum)}
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Đã duyệt: {approvedCount}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Chờ duyệt: {pendingCount}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Từ chối: {rejectedCount}
                </span>
            </div>
        </div>
    );
};

