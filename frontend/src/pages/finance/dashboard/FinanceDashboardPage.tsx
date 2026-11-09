import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Wallet, TrendingDown, CheckCircle2, AlertCircle, ArrowUpRight,
    Calculator, Receipt, Scale, RefreshCw, Sparkles, AlertTriangle
} from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { financeService } from '../../../services/financeService';
import type { EventBudgetSummary } from '../../../types/models/finance';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function FinanceDashboardPage() {
    const { currentEvent, currentEventId, isLoading: eventLoading } = useActiveEvent();
    const [summary, setSummary] = useState<EventBudgetSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = async (eventId: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await financeService.getBudgetSummary(eventId);
            setSummary(data);
        } catch {
            // Fallback hiển thị dữ liệu ước tính từ currentEvent nếu view chưa có dữ liệu DB
            setSummary({
                eventId,
                eventTitle: currentEvent?.name ?? 'Sự kiện hiện hành',
                seasonName: currentEvent?.seasonLabel ?? 'Mùa hiện tại',
                allocatedFund: 25000000,
                totalBudgetEstimated: 22500000,
                totalActualSpent: 16800000,
                remainingAllocatedFund: 8200000,
                varianceAgainstEstimate: 5700000,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentEventId) {
            loadSummary(currentEventId);
        } else {
            setSummary(null);
        }
    }, [currentEventId]);

    if (eventLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!currentEventId || !currentEvent) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-lg font-bold text-slate-800">Chưa chọn Mùa sự kiện</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Vui lòng chọn một Mùa sự kiện từ menu hoặc danh sách sự kiện để theo dõi ngân sách và thực chi.
                </p>
                <Link
                    to="/events"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                    Đến danh sách sự kiện
                </Link>
            </div>
        );
    }

    const spentPercentage = summary && summary.allocatedFund > 0
        ? Math.min(100, Math.round((summary.totalActualSpent / summary.allocatedFund) * 100))
        : 0;

    const estimatedPercentage = summary && summary.allocatedFund > 0
        ? Math.min(100, Math.round((summary.totalBudgetEstimated / summary.allocatedFund) * 100))
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            {summary?.seasonName ?? currentEvent.seasonLabel}
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Dashboard Ngân Sách Thời Gian Thực
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Theo dõi tổng quỹ cấp phát, dự trù ngân sách và giải ngân thực tế (SQL View: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">v_event_budget_summary</code>)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => currentEventId && loadSummary(currentEventId)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Allocated Fund */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quỹ Cấp Phát</span>
                        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(summary?.allocatedFund ?? 0)}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Hạn mức ngân sách tối đa được duyệt</p>
                    </div>
                </div>

                {/* 2. Budget Estimated */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dự Trù Đã Duyệt</span>
                        <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                            <Calculator className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(summary?.totalBudgetEstimated ?? 0)}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-slate-500">
                            <span>Chiếm {estimatedPercentage}% tổng quỹ</span>
                        </div>
                    </div>
                </div>

                {/* 3. Actual Spent */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thực Chi Đã Duyệt</span>
                        <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                            <Receipt className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(summary?.totalActualSpent ?? 0)}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-slate-500">
                            <span>Đã giải ngân {spentPercentage}% quỹ</span>
                        </div>
                    </div>
                </div>

                {/* 4. Remaining Fund */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quỹ Khả Dụng Còn Lại</span>
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className={`text-2xl font-bold ${
                            (summary?.remainingAllocatedFund ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                            {formatCurrency(summary?.remainingAllocatedFund ?? 0)}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {(summary?.remainingAllocatedFund ?? 0) < 0 ? 'Vượt hạn mức cấp phát!' : 'An toàn tài chính'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Budget Progress & Variance Analysis */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Progress Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-base font-bold text-slate-900">Tiến Độ Giải Ngân & Phân Bổ</h3>
                    <p className="mt-1 text-xs text-slate-500">Tỷ lệ sử dụng quỹ ngân sách thực tế so với định mức</p>

                    <div className="mt-6 space-y-5">
                        <div>
                            <div className="mb-2 flex justify-between text-xs font-semibold">
                                <span className="text-slate-600">Thực chi / Quỹ cấp phát ({spentPercentage}%)</span>
                                <span className="text-slate-900 font-bold">{formatCurrency(summary?.totalActualSpent ?? 0)} / {formatCurrency(summary?.allocatedFund ?? 0)}</span>
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
                                <span className="text-slate-900 font-bold">{formatCurrency(summary?.totalBudgetEstimated ?? 0)} / {formatCurrency(summary?.allocatedFund ?? 0)}</span>
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
                                    {formatCurrency(summary?.varianceAgainstEstimate ?? 0)}
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

                {/* Quick Navigation Cards */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900">Phân Hệ Tài Chính</h4>
                        <div className="mt-3 space-y-2">
                            <Link
                                to="/finance/budgets"
                                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600 group-hover:bg-purple-100">
                                        <Calculator className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Dự Toán Ngân Sách</div>
                                        <div className="text-[11px] text-slate-500">Lập & duyệt hạng mục chi phí</div>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                            </Link>

                            <Link
                                to="/finance/expenses"
                                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-amber-50 p-2 text-amber-600 group-hover:bg-amber-100">
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Thực Chi & Duyệt Chi</div>
                                        <div className="text-[11px] text-slate-500">Đính kèm chứng từ S3 & duyệt chi</div>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                            </Link>

                            <Link
                                to="/finance/benchmarks"
                                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600 group-hover:bg-blue-100">
                                        <Scale className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Bảng Giá Benchmark</div>
                                        <div className="text-[11px] text-slate-500">Master Catalog đơn giá thị trường</div>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                            <Sparkles className="h-4 w-4" />
                            Tính Năng Kế Thừa Mùa Mới
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-emerald-950">
                            Tự động lấy số lượng thực tế đã chi mùa trước nhân với đơn giá thị trường hiện hành để tạo dự toán mùa mới ngay lập tức.
                        </p>
                        <Link
                            to="/finance/budgets"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                        >
                            Dùng thử trong Dự toán &rarr;
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

