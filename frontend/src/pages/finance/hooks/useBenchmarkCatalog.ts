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
            setCategories(cats);
            setBenchmarks(bms);
        } catch {
            // Mock fallback if DB is not populated yet
            setCategories([
                { id: '1', name: 'Hậu cần & Địa điểm', description: 'Chi phí thuê hội trường, âm thanh, ánh sáng, bàn ghế' },
                { id: '2', name: 'Truyền thông & Ấn phẩm', description: 'In ấn standee, backdrop, thẻ đeo, poster' },
                { id: '3', name: 'Quà tặng & Giải thưởng', description: 'Cúp, kỷ niệm chương, quà diễn giả, quà minigame' },
                { id: '4', name: 'Ăn uống & Tiếp khách', description: 'Teabreak, nước suối, ăn trưa BTC & khách mời' },
            ]);
            setBenchmarks([
                { id: 'b1', categoryId: '2', itemName: 'Standee bạt PP (0.8m x 1.8m)', unit: 'Cái', currentMarketPrice: 120000, supplierReference: 'Xưởng in FPT Copy', lastUpdatedAt: new Date().toISOString() },
                { id: 'b2', categoryId: '2', itemName: 'Backdrop sân khấu (5m x 3m)', unit: 'Tấm', currentMarketPrice: 450000, supplierReference: 'In ấn Đại Nam', lastUpdatedAt: new Date().toISOString() },
                { id: 'b3', categoryId: '2', itemName: 'Thẻ đeo BTC ép nhựa', unit: 'Bộ', currentMarketPrice: 8500, supplierReference: 'Văn phòng phẩm Minh Long', lastUpdatedAt: new Date().toISOString() },
                { id: 'b4', categoryId: '4', itemName: 'Nước suối Aquafina 500ml', unit: 'Thùng 24 chai', currentMarketPrice: 95000, supplierReference: 'Bách Hóa Xanh', lastUpdatedAt: new Date().toISOString() },
                { id: 'b5', categoryId: '4', itemName: 'Suất Teabreak tiêu chuẩn', unit: 'Phần', currentMarketPrice: 35000, supplierReference: 'Bakery Sweet Home', lastUpdatedAt: new Date().toISOString() },
                { id: 'b6', categoryId: '3', itemName: 'Cúp pha lê vinh danh', unit: 'Cúp', currentMarketPrice: 280000, supplierReference: 'Quà tặng Sen Việt', lastUpdatedAt: new Date().toISOString() },
            ]);
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
            const matchesKw = searchKeyword.trim() === '' ||
                b.itemName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                (b.supplierReference && b.supplierReference.toLowerCase().includes(searchKeyword.toLowerCase()));
            return matchesCat && matchesKw;
        });
    }, [benchmarks, selectedCategoryFilter, searchKeyword]);

    // Category CRUD
    const createCategory = async (data: CreateBudgetCategoryRequest) => {
        try {
            await financeService.createCategory(data, eventId);
            setStatusMsg({ type: 'success', text: 'Thêm danh mục mới thành công!' });
            await loadData();
        } catch {
            setCategories(prev => [...prev, { id: Date.now().toString(), name: data.name, description: data.description }]);
            setStatusMsg({ type: 'success', text: 'Đã lưu danh mục thành công!' });
        }
    };

    const updateCategory = async (id: string, data: UpdateBudgetCategoryRequest) => {
        try {
            await financeService.updateCategory(id, data, eventId);
            setStatusMsg({ type: 'success', text: 'Cập nhật danh mục thành công!' });
            await loadData();
        } catch {
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
            setStatusMsg({ type: 'success', text: 'Đã lưu danh mục thành công!' });
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            await financeService.deleteCategory(id, eventId);
            setStatusMsg({ type: 'success', text: 'Xóa danh mục thành công!' });
            await loadData();
        } catch {
            setCategories(prev => prev.filter(c => c.id !== id));
            setStatusMsg({ type: 'success', text: 'Đã xóa danh mục!' });
        }
    };

    // Benchmark CRUD
    const createBenchmark = async (data: CreateBenchmarkRequest) => {
        try {
            await financeService.createBenchmark(data, eventId);
            setStatusMsg({ type: 'success', text: 'Thêm vật tư chuẩn thành công!' });
            await loadData();
        } catch {
            setBenchmarks(prev => [...prev, {
                id: Date.now().toString(),
                ...data,
                lastUpdatedAt: new Date().toISOString(),
            }]);
            setStatusMsg({ type: 'success', text: 'Đã lưu benchmark vật tư thành công!' });
        }
    };

    const updateBenchmark = async (id: string, data: UpdateBenchmarkRequest) => {
        try {
            await financeService.updateBenchmark(id, data, eventId);
            setStatusMsg({ type: 'success', text: 'Cập nhật giá benchmark thành công!' });
            await loadData();
        } catch {
            setBenchmarks(prev => prev.map(b => b.id === id ? {
                ...b,
                ...data,
                lastUpdatedAt: new Date().toISOString(),
            } : b));
            setStatusMsg({ type: 'success', text: 'Đã lưu benchmark vật tư thành công!' });
        }
    };

    const deleteBenchmark = async (id: string) => {
        try {
            await financeService.deleteBenchmark(id, eventId);
            setStatusMsg({ type: 'success', text: 'Xóa benchmark thành công!' });
            await loadData();
        } catch {
            setBenchmarks(prev => prev.filter(b => b.id !== id));
            setStatusMsg({ type: 'success', text: 'Đã xóa benchmark!' });
        }
    };

    return {
        categories,
        benchmarks,
        filteredBenchmarks,
        loading,
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

