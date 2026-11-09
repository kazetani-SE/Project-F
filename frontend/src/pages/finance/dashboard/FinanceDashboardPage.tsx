import { RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import { DashboardKpiPart } from './parts/DashboardKpiPart';
import { BudgetProgressPart } from './parts/BudgetProgressPart';
import { QuickNavPart } from './parts/QuickNavPart';

export default function FinanceDashboardPage() {
    const { currentEvent, currentEventId, isLoading: eventLoading } = useActiveEvent();

    const {
        summary,
        loading,
        error,
        spentPercentage,
        estimatedPercentage,
        reloadSummary,
    } = useFinanceDashboard({
        eventId: currentEventId ?? undefined,
        fallbackEventTitle: currentEvent?.name,
        fallbackSeasonLabel: currentEvent?.seasonLabel ?? undefined,
    });

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

    return (
        <div className="space-y-6">
            {/* Header Layout */}
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
                        Theo dõi tổng quỹ cấp phát, dự trù ngân sách và giải ngân thực tế (SQL View:{' '}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">v_event_budget_summary</code>)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={reloadSummary}
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

            {/* Layout Parts */}
            <DashboardKpiPart
                summary={summary}
                spentPercentage={spentPercentage}
                estimatedPercentage={estimatedPercentage}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <BudgetProgressPart
                    summary={summary}
                    spentPercentage={spentPercentage}
                    estimatedPercentage={estimatedPercentage}
                />
                <QuickNavPart />
            </div>
        </div>
    );
}
