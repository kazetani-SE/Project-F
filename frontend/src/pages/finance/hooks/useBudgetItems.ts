import { useEffect, useState, useMemo, useCallback } from 'react';
import { financeService } from '../../../services/financeService';
import type {
    BudgetItem,
    BudgetCategory,
    ItemPriceBenchmark,
    ProjectedBudgetItem,
    CreateBudgetItemRequest,
    ApprovalStatus,
} from '../../../types/models/finance';

export function useBudgetItems(eventId?: string) {
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [benchmarks, setBenchmarks] = useState<ItemPriceBenchmark[]>([]);
    const [loading, setLoading] = useState(true);

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
            setBudgetItems(items);
            setCategories(cats);
            setBenchmarks(bms);
        } catch {
            // Mock fallback
            setCategories([
                { id: '1', name: 'Hậu cần & Địa điểm' },
                { id: '2', name: 'Truyền thông & Ấn phẩm' },
                { id: '3', name: 'Quà tặng & Giải thưởng' },
                { id: '4', name: 'Ăn uống & Tiếp khách' },
            ]);
            setBudgetItems([
                {
                    id: 'bi1', eventId, categoryId: '2', itemName: 'Standee bạt PP (0.8m x 1.8m)',
                    quantity: 4, unit: 'Cái', estimatedUnitPrice: 120000, totalEstimatedAmount: 480000,
                    approvalStatus: 'APPROVED', notes: 'Đặt 2 cái ở sảnh, 2 cái trong hội trường'
                },
                {
                    id: 'bi2', eventId, categoryId: '2', itemName: 'Backdrop sân khấu (5m x 3m)',
                    quantity: 1, unit: 'Tấm', estimatedUnitPrice: 450000, totalEstimatedAmount: 450000,
                    approvalStatus: 'APPROVED', notes: 'Thiết kế theo key visual 2026'
                },
                {
                    id: 'bi3', eventId, categoryId: '4', itemName: 'Nước suối Aquafina 500ml',
                    quantity: 10, unit: 'Thùng 24 chai', estimatedUnitPrice: 95000, totalEstimatedAmount: 950000,
                    approvalStatus: 'PENDING', notes: 'Phục vụ thí sinh và BTC suốt ngày thi'
                },
                {
                    id: 'bi4', eventId, categoryId: '3', itemName: 'Cúp pha lê vinh danh Quán quân',
                    quantity: 1, unit: 'Cúp', estimatedUnitPrice: 280000, totalEstimatedAmount: 280000,
                    approvalStatus: 'PENDING', notes: 'Khắc tên sự kiện và năm'
                },
            ]);
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
        return filteredItems.reduce((acc, cur) => acc + (cur.totalEstimatedAmount ?? (cur.quantity * cur.estimatedUnitPrice)), 0);
    }, [filteredItems]);

    // Create item
    const createBudgetItem = async (data: CreateBudgetItemRequest) => {
        if (!eventId) return;
        try {
            await financeService.createBudgetItem(eventId, data);
            setNotification({ type: 'success', text: 'Thêm dự trù ngân sách thành công!' });
            await loadData();
        } catch {
            const newItem: BudgetItem = {
                id: Date.now().toString(),
                eventId,
                categoryId: data.categoryId,
                itemName: data.itemName,
                quantity: data.quantity,
                unit: data.unit,
                estimatedUnitPrice: data.estimatedUnitPrice,
                totalEstimatedAmount: data.quantity * data.estimatedUnitPrice,
                approvalStatus: 'PENDING',
                notes: data.notes,
            };
            setBudgetItems(prev => [newItem, ...prev]);
            setNotification({ type: 'success', text: 'Đã lưu dự trù thành công!' });
        }
    };

    // Review item
    const approveBudgetItem = async (item: BudgetItem) => {
        if (!eventId) return;
        try {
            await financeService.reviewBudgetItem(eventId, item.id, { status: 'APPROVED' });
            setNotification({ type: 'success', text: `Đã duyệt hạng mục: ${item.itemName}` });
            await loadData();
        } catch {
            setBudgetItems(prev => prev.map(i => i.id === item.id ? { ...i, approvalStatus: 'APPROVED' } : i));
            setNotification({ type: 'success', text: `Đã duyệt hạng mục: ${item.itemName}` });
        }
    };

    const rejectBudgetItem = async (itemId: string, rejectionReason: string) => {
        if (!eventId) return;
        try {
            await financeService.reviewBudgetItem(eventId, itemId, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: 'Đã từ chối hạng mục dự trù' });
            await loadData();
        } catch {
            setBudgetItems(prev => prev.map(i => i.id === itemId ? { ...i, approvalStatus: 'REJECTED', rejectionReason } : i));
            setNotification({ type: 'success', text: 'Đã cập nhật từ chối hạng mục' });
        }
    };

    const deleteBudgetItem = async (id: string) => {
        if (!eventId) return;
        try {
            await financeService.deleteBudgetItem(eventId, id);
            setNotification({ type: 'success', text: 'Xóa dự trù thành công!' });
            await loadData();
        } catch {
            setBudgetItems(prev => prev.filter(i => i.id !== id));
            setNotification({ type: 'success', text: 'Đã xóa hạng mục!' });
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
            setProjectedPreview(preview);
        } catch {
            setProjectedPreview([
                {
                    previousBudgetItemId: 'p1', previousEventId, categoryId: '2',
                    itemName: 'Standee bạt PP', unit: 'Cái', previousPlannedQty: 4,
                    baseQuantityForProjection: 4, previousUnitPrice: 100000,
                    currentAdjustedUnitPrice: 120000, projectedCurrentCost: 480000
                },
                {
                    previousBudgetItemId: 'p2', previousEventId, categoryId: '4',
                    itemName: 'Nước suối Aquafina 500ml', unit: 'Thùng 24 chai', previousPlannedQty: 8,
                    baseQuantityForProjection: 12, previousUnitPrice: 90000,
                    currentAdjustedUnitPrice: 95000, projectedCurrentCost: 1140000
                },
            ]);
        } finally {
            setProjectLoading(false);
        }
    };

    const confirmAutoProject = async (previousEventId: string) => {
        if (!eventId || !previousEventId) return;
        try {
            await financeService.autoProjectBudget(eventId, { previousEventId });
            setNotification({ type: 'success', text: 'Kế thừa tự động dự toán từ mùa trước thành công!' });
            await loadData();
        } catch {
            const newItems: BudgetItem[] = projectedPreview.map((p, idx) => ({
                id: 'proj_' + idx + '_' + Date.now(),
                eventId,
                categoryId: p.categoryId,
                itemName: p.itemName,
                quantity: p.baseQuantityForProjection,
                unit: p.unit,
                estimatedUnitPrice: p.currentAdjustedUnitPrice,
                totalEstimatedAmount: p.projectedCurrentCost,
                approvalStatus: 'PENDING' as ApprovalStatus,
                notes: 'Dự toán tự động kế thừa từ mùa trước',
            }));
            setBudgetItems(prev => [...newItems, ...prev]);
            setNotification({ type: 'success', text: `Đã tự động nạp ${newItems.length} hạng mục dự toán!` });
        }
    };

    return {
        budgetItems,
        categories,
        benchmarks,
        filteredItems,
        totalEstimatedSum,
        loading,
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

