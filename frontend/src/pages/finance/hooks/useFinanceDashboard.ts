import { useEffect, useState, useCallback, useMemo } from 'react';
import { financeService } from '../../../services/financeService';
import type { EventBudgetSummary } from '../../../types/models/finance';

interface UseFinanceDashboardOptions {
    eventId?: string;
    fallbackEventTitle?: string;
    fallbackSeasonLabel?: string;
}

export function useFinanceDashboard({
    eventId,
}: UseFinanceDashboardOptions) {
    const [summary, setSummary] = useState<EventBudgetSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = useCallback(async () => {
        if (!eventId) {
            setSummary(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await financeService.getBudgetSummary(eventId);
            setSummary(data ?? null);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Không thể tải dữ liệu tổng hợp tài chính từ hệ thống.';
            setError(msg);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const spentPercentage = useMemo(() => {
        if (!summary || summary.allocatedFund <= 0) return 0;
        return Math.min(100, Math.round((summary.totalActualSpent / summary.allocatedFund) * 100));
    }, [summary]);

    const estimatedPercentage = useMemo(() => {
        if (!summary || summary.allocatedFund <= 0) return 0;
        const est = summary.totalBudgetEst ?? summary.totalBudgetEstimated ?? 0;
        return Math.min(100, Math.round((est / summary.allocatedFund) * 100));
    }, [summary]);

    return {
        summary,
        loading,
        error,
        spentPercentage,
        estimatedPercentage,
        reloadSummary: loadSummary,
    };
}
