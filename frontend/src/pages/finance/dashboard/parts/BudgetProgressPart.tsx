import React from 'react';
import { TrendingDown, Sparkles } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import type { EventBudgetSummary } from '../../../../types/models/finance';

interface BudgetProgressPartProps {
    summary: EventBudgetSummary | null;
    spentPercentage: number;
    estimatedPercentage: number;
}

export const BudgetProgressPart: React.FC<BudgetProgressPartProps> = ({
    summary,
    spentPercentage,
    estimatedPercentage,
}) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="text-base font-bold text-slate-900">Tiến Độ Giải Ngân & Phân Bổ</h3>
            <p className="mt-1 text-xs text-slate-500">Tỷ lệ sử dụng quỹ ngân sách thực tế so với định mức</p>

            <div className="mt-6 space-y-5">
                <div>
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Thực chi / Quỹ cấp phát ({spentPercentage}%)</span>
                        <span className="text-slate-900 font-bold">
                            {formatVND(summary?.totalActualSpent ?? 0)} / {formatVND(summary?.allocatedFund ?? 0)}
                        </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                spentPercentage > 90 ? 'bg-rose-500' : spentPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${spentPercentage}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Dự trù đã duyệt / Quỹ cấp phát ({estimatedPercentage}%)</span>
                        <span className="text-slate-900 font-bold">
                            {formatVND(summary?.totalBudgetEstimated ?? 0)} / {formatVND(summary?.allocatedFund ?? 0)}
                        </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${estimatedPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                        <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500">Chênh lệch Dự trù vs Thực chi</span>
                        <div className="text-lg font-bold text-slate-900">
                            {formatVND(summary?.varianceAgainstEstimate ?? 0)}
                        </div>
                        <p className="text-xs text-slate-500">
                            {(summary?.varianceAgainstEstimate ?? 0) >= 0 ? 'Tiết kiệm so với dự toán' : 'Chi vượt dự toán ban đầu'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500">Định mức an toàn</span>
                        <div className="text-lg font-bold text-slate-900">
                            {100 - spentPercentage}% quỹ còn trống
                        </div>
                        <p className="text-xs text-slate-500">Sẵn sàng phân bổ cho các phát sinh</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

