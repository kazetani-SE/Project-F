import React from 'react';
import { Wallet, Calculator, Receipt, CheckCircle2, RefreshCw } from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import type { EventBudgetSummary } from '../../../../types/models/finance';

interface DashboardKpiPartProps {
    summary: EventBudgetSummary | null;
    loading?: boolean;
    spentPercentage: number;
    estimatedPercentage: number;
}

export const DashboardKpiPart: React.FC<DashboardKpiPartProps> = ({
    summary,
    loading = false,
    spentPercentage,
    estimatedPercentage,
}) => {
    if (loading && !summary) {
        return (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
                    <span className="text-sm font-medium">Đang cập nhật số liệu thời gian thực...</span>
                </div>
            </div>
        );
    }

    const estimatedBudget = summary?.totalBudgetEst ?? summary?.totalBudgetEstimated ?? 0;
    const remainingFund = summary?.remainingFund ?? summary?.remainingAllocatedFund ?? 0;
    const isOverBudget = remainingFund < 0;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
                title="Quỹ Cấp Phát"
                amount={summary?.allocatedFund ?? 0}
                icon={<Wallet className="h-5 w-5" />}
                iconBgClass="bg-blue-50"
                iconTextClass="text-blue-600"
                subtext="Hạn mức ngân sách tối đa được duyệt"
            />

            <KpiCard
                title="Dự Trù Đã Duyệt"
                amount={estimatedBudget}
                icon={<Calculator className="h-5 w-5" />}
                iconBgClass="bg-purple-50"
                iconTextClass="text-purple-600"
                subtext={`Chiếm ${estimatedPercentage}% tổng quỹ`}
            />

            <KpiCard
                title="Thực Chi Đã Duyệt"
                amount={summary?.totalActualSpent ?? 0}
                icon={<Receipt className="h-5 w-5" />}
                iconBgClass="bg-amber-50"
                iconTextClass="text-amber-600"
                subtext={`Đã giải ngân ${spentPercentage}% quỹ`}
            />

            <KpiCard
                title="Quỹ Khả Dụng Còn Lại"
                amount={remainingFund}
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconBgClass="bg-emerald-50"
                iconTextClass="text-emerald-600"
                subtext={isOverBudget ? 'Vượt hạn mức cấp phát!' : 'An toàn tài chính'}
                amountClassName={isOverBudget ? 'text-rose-600' : 'text-emerald-700'}
            />
        </div>
    );
};
