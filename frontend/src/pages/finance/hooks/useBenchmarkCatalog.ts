import { useEffect, useState, useMemo, useCallback } from 'react';
import type {
    BudgetCategory,
    ItemPriceBenchmark,
    CreateBudgetCategoryRequest,
    UpdateBudgetCategoryRequest,
    CreateBenchmarkRequest,
    UpdateBenchmarkRequest,
} from '../../../types/models/finance';
import { financeService } from '../../../services/financeService';

export function useBenchmarkCatalog(eventId?: string) {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [benchmarks, setBenchmarks] = useState<ItemPriceBenchmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filters
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

    const loadData = useCallback(async () => {
        setLoading(true);
        setStatusMsg(null);
        try {
            const [cats, bms] = await Promise.all([
                financeService.getCategories(eventId),
                financeService.getBenchmarks(undefined, undefined, eventId),
            ]);
            setCategories(cats ?? []);
            setBenchmarks(bms ?? []);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Không thể tải danh mục và bảng giá thị trường từ hệ thống.';
            setErrorMessage(msg);
            setCategories([]);
            setBenchmarks([]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredBenchmarks = useMemo(() => {
        return benchmarks.filter((b) => {
            const matchesCat = selectedCategoryFilter === 'ALL' || b.categoryId === selectedCategoryFilter;
            const kw = searchKeyword.trim().toLowerCase();
            const matchesKw = kw === '' ||
                b.itemName.toLowerCase().includes(kw) ||
                (b.supplierName && b.supplierName.toLowerCase().includes(kw)) ||
                (b.supplierReference && b.supplierReference.toLowerCase().includes(kw));
            return matchesCat && matchesKw;
        });
    }, [benchmarks, selectedCategoryFilter, searchKeyword]);

    // Category CRUD
    const createCategory = async (data: CreateBudgetCategoryRequest) => {
        setIsSubmitting(true);
        try {
            await financeService.createCategory(data, eventId);
            setStatusMsg({ type: 'success', text: 'Thêm danh mục mới thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Thêm danh mục thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateCategory = async (id: string, data: UpdateBudgetCategoryRequest) => {
        setIsSubmitting(true);
        try {
            await financeService.updateCategory(id, data, eventId);
            setStatusMsg({ type: 'success', text: 'Cập nhật danh mục thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Cập nhật danh mục thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteCategory = async (id: string) => {
        setIsSubmitting(true);
        try {
            await financeService.deleteCategory(id, eventId);
            setStatusMsg({ type: 'success', text: 'Xóa danh mục thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Xóa danh mục thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Benchmark CRUD
    const createBenchmark = async (data: CreateBenchmarkRequest) => {
        setIsSubmitting(true);
        try {
            await financeService.createBenchmark(data, eventId);
            setStatusMsg({ type: 'success', text: 'Thêm vật tư chuẩn thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Thêm vật tư chuẩn thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateBenchmark = async (id: string, data: UpdateBenchmarkRequest) => {
        setIsSubmitting(true);
        try {
            await financeService.updateBenchmark(id, data, eventId);
            setStatusMsg({ type: 'success', text: 'Cập nhật giá benchmark thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Cập nhật benchmark thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteBenchmark = async (id: string) => {
        setIsSubmitting(true);
        try {
            await financeService.deleteBenchmark(id, eventId);
            setStatusMsg({ type: 'success', text: 'Xóa benchmark thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Xóa benchmark thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearError = () => setErrorMessage(null);

    return {
        categories,
        benchmarks,
        filteredBenchmarks,
        loading,
        isSubmitting,
        errorMessage,
        clearError,
        statusMsg,
        setStatusMsg,
        searchKeyword,
        setSearchKeyword,
        selectedCategoryFilter,
        setSelectedCategoryFilter,
        reloadData: loadData,
        createCategory,
        updateCategory,
        deleteCategory,
        createBenchmark,
        updateBenchmark,
        deleteBenchmark,
    };
}
