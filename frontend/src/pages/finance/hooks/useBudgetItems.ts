import { useEffect, useState, useMemo, useCallback } from 'react';
import { financeService } from '../../../services/financeService';
import type {
    BudgetItem,
    BudgetCategory,
    ItemPriceBenchmark,
    ProjectedBudgetItem,
    CreateBudgetItemRequest,
} from '../../../types/models/finance';

export function useBudgetItems(eventId?: string) {
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [benchmarks, setBenchmarks] = useState<ItemPriceBenchmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    // Auto-project state
    const [projectedPreview, setProjectedPreview] = useState<ProjectedBudgetItem[]>([]);
    const [projectLoading, setProjectLoading] = useState(false);

    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = useCallback(async () => {
        if (!eventId) {
            setBudgetItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [items, cats, bms] = await Promise.all([
                financeService.getBudgetItems(eventId),
                financeService.getCategories(eventId),
                financeService.getBenchmarks(undefined, undefined, eventId),
            ]);
            setBudgetItems(items ?? []);
            setCategories(cats ?? []);
            setBenchmarks(bms ?? []);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Không thể tải dự trù ngân sách từ máy chủ.';
            setErrorMessage(msg);
            setBudgetItems([]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredItems = useMemo(() => {
        return budgetItems.filter((i) => {
            const matchesStatus = statusFilter === 'ALL' || i.approvalStatus === statusFilter;
            const matchesCat = categoryFilter === 'ALL' || i.categoryId === categoryFilter;
            return matchesStatus && matchesCat;
        });
    }, [budgetItems, statusFilter, categoryFilter]);

    const totalEstimatedSum = useMemo(() => {
        return filteredItems.reduce((acc, cur) => {
            const unitPrice = cur.estUnitPrice ?? cur.estimatedUnitPrice ?? 0;
            const total = cur.totalEstAmount ?? cur.totalEstimatedAmount ?? (cur.quantity * unitPrice);
            return acc + total;
        }, 0);
    }, [filteredItems]);

    // Create item
    const createBudgetItem = async (data: CreateBudgetItemRequest) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.createBudgetItem(eventId, data);
            setNotification({ type: 'success', text: 'Thêm dự trù ngân sách thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Thêm dự trù ngân sách thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Review item
    const approveBudgetItem = async (item: BudgetItem) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.reviewBudgetItem(eventId, item.id, { status: 'APPROVED' });
            setNotification({ type: 'success', text: `Đã duyệt hạng mục: ${item.itemName}` });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Phê duyệt hạng mục dự trù thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const rejectBudgetItem = async (itemId: string, rejectionReason: string) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.reviewBudgetItem(eventId, itemId, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: 'Đã từ chối hạng mục dự trù' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Từ chối hạng mục dự trù thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteBudgetItem = async (id: string) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.deleteBudgetItem(eventId, id);
            setNotification({ type: 'success', text: 'Xóa dự trù thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Xóa hạng mục dự trù thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto projection
    const previewAutoProject = async (previousEventId: string) => {
        if (!eventId || !previousEventId) {
            setProjectedPreview([]);
            return;
        }
        setProjectLoading(true);
        try {
            const preview = await financeService.getProjectedBudgetPreview(eventId, previousEventId);
            setProjectedPreview(preview ?? []);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Không thể xem trước dữ liệu kế thừa mùa trước.';
            setErrorMessage(msg);
            setProjectedPreview([]);
        } finally {
            setProjectLoading(false);
        }
    };

    const confirmAutoProject = async (previousEventId: string) => {
        if (!eventId || !previousEventId) return;
        setIsSubmitting(true);
        try {
            await financeService.autoProjectBudget(eventId, {
                previousEventId,
            });
            setNotification({ type: 'success', text: 'Kế thừa ngân sách mùa trước thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Kế thừa ngân sách thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearError = () => setErrorMessage(null);

    return {
        budgetItems,
        categories,
        benchmarks,
        filteredItems,
        totalEstimatedSum,
        loading,
        isSubmitting,
        errorMessage,
        clearError,
        statusFilter,
        setStatusFilter,
        categoryFilter,
        setCategoryFilter,
        notification,
        setNotification,
        projectedPreview,
        projectLoading,
        reloadData: loadData,
        createBudgetItem,
        approveBudgetItem,
        rejectBudgetItem,
        deleteBudgetItem,
        previewAutoProject,
        confirmAutoProject,
    };
}
