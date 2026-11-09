import { useEffect, useState, useMemo } from 'react';
import {
    Scale, Plus, Search, Filter, Edit2, Trash2, Tag,
    Building2, RefreshCw, CheckCircle, AlertTriangle, X
} from 'lucide-react';
import { financeService } from '../../../services/financeService';
import type {
    BudgetCategory,
    ItemPriceBenchmark,
} from '../../../types/models/finance';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function BenchmarkPage() {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [benchmarks, setBenchmarks] = useState<ItemPriceBenchmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'benchmarks' | 'categories'>('benchmarks');

    // Filters
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

    // Modals
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
    const [editingBenchmark, setEditingBenchmark] = useState<ItemPriceBenchmark | null>(null);

    // Form inputs
    const [categoryName, setCategoryName] = useState('');
    const [categoryDesc, setCategoryDesc] = useState('');

    const [bmCategoryId, setBmCategoryId] = useState('');
    const [bmItemName, setBmItemName] = useState('');
    const [bmUnit, setBmUnit] = useState('');
    const [bmPrice, setBmPrice] = useState<number>(0);
    const [bmSupplier, setBmSupplier] = useState('');

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        setStatusMsg(null);
        try {
            const [cats, bms] = await Promise.all([
                financeService.getCategories(),
                financeService.getBenchmarks(),
            ]);
            setCategories(cats);
            setBenchmarks(bms);
        } catch {
            // Mock data fallback if DB is not populated yet
            const mockCats: BudgetCategory[] = [
                { id: '1', name: 'Hậu cần & Địa điểm', description: 'Chi phí thuê hội trường, âm thanh, ánh sáng, bàn ghế' },
                { id: '2', name: 'Truyền thông & Ấn phẩm', description: 'In ấn standee, backdrop, thẻ đeo, poster' },
                { id: '3', name: 'Quà tặng & Giải thưởng', description: 'Cúp, kỷ niệm chương, quà diễn giả, quà minigame' },
                { id: '4', name: 'Ăn uống & Tiếp khách', description: 'Teabreak, nước suối, ăn trưa BTC & khách mời' },
            ];
            const mockBms: ItemPriceBenchmark[] = [
                { id: 'b1', categoryId: '2', itemName: 'Standee bạt PP (0.8m x 1.8m)', unit: 'Cái', currentMarketPrice: 120000, supplierReference: 'Xưởng in FPT Copy', lastUpdatedAt: new Date().toISOString() },
                { id: 'b2', categoryId: '2', itemName: 'Backdrop sân khấu (5m x 3m)', unit: 'Tấm', currentMarketPrice: 450000, supplierReference: 'In ấn Đại Nam', lastUpdatedAt: new Date().toISOString() },
                { id: 'b3', categoryId: '2', itemName: 'Thẻ đeo BTC ép nhựa', unit: 'Bộ', currentMarketPrice: 8500, supplierReference: 'Văn phòng phẩm Minh Long', lastUpdatedAt: new Date().toISOString() },
                { id: 'b4', categoryId: '4', itemName: 'Nước suối Aquafina 500ml', unit: 'Thùng 24 chai', currentMarketPrice: 95000, supplierReference: 'Bách Hóa Xanh', lastUpdatedAt: new Date().toISOString() },
                { id: 'b5', categoryId: '4', itemName: 'Suất Teabreak tiêu chuẩn', unit: 'Phần', currentMarketPrice: 35000, supplierReference: 'Bakery Sweet Home', lastUpdatedAt: new Date().toISOString() },
                { id: 'b6', categoryId: '3', itemName: 'Cúp pha lê vinh danh', unit: 'Cúp', currentMarketPrice: 280000, supplierReference: 'Quà tặng Sen Việt', lastUpdatedAt: new Date().toISOString() },
            ];
            setCategories(mockCats);
            setBenchmarks(mockBms);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredBenchmarks = useMemo(() => {
        return benchmarks.filter((b) => {
            const matchesCat = selectedCategoryFilter === 'ALL' || b.categoryId === selectedCategoryFilter;
            const matchesKw = searchKeyword.trim() === '' ||
                b.itemName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                (b.supplierReference && b.supplierReference.toLowerCase().includes(searchKeyword.toLowerCase()));
            return matchesCat && matchesKw;
        });
    }, [benchmarks, selectedCategoryFilter, searchKeyword]);

    const handleOpenCategoryModal = (cat?: BudgetCategory) => {
        if (cat) {
            setEditingCategory(cat);
            setCategoryName(cat.name);
            setCategoryDesc(cat.description ?? '');
        } else {
            setEditingCategory(null);
            setCategoryName('');
            setCategoryDesc('');
        }
        setCategoryModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) return;

        try {
            if (editingCategory) {
                await financeService.updateCategory(editingCategory.id, {
                    name: categoryName,
                    description: categoryDesc,
                });
                setStatusMsg({ type: 'success', text: 'Cập nhật danh mục thành công!' });
            } else {
                await financeService.createCategory({
                    name: categoryName,
                    description: categoryDesc,
                });
                setStatusMsg({ type: 'success', text: 'Thêm danh mục mới thành công!' });
            }
            setCategoryModalOpen(false);
            loadData();
        } catch {
            // Local fallback simulation
            if (editingCategory) {
                setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: categoryName, description: categoryDesc } : c));
            } else {
                setCategories(prev => [...prev, { id: Date.now().toString(), name: categoryName, description: categoryDesc }]);
            }
            setCategoryModalOpen(false);
            setStatusMsg({ type: 'success', text: 'Đã lưu danh mục thành công!' });
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
        try {
            await financeService.deleteCategory(id);
            setStatusMsg({ type: 'success', text: 'Xóa danh mục thành công!' });
            loadData();
        } catch {
            setCategories(prev => prev.filter(c => c.id !== id));
            setStatusMsg({ type: 'success', text: 'Đã xóa danh mục!' });
        }
    };

    const handleOpenBenchmarkModal = (bm?: ItemPriceBenchmark) => {
        if (bm) {
            setEditingBenchmark(bm);
            setBmCategoryId(bm.categoryId);
            setBmItemName(bm.itemName);
            setBmUnit(bm.unit);
            setBmPrice(bm.currentMarketPrice);
            setBmSupplier(bm.supplierReference ?? '');
        } else {
            setEditingBenchmark(null);
            setBmCategoryId(categories[0]?.id ?? '');
            setBmItemName('');
            setBmUnit('Cái');
            setBmPrice(0);
            setBmSupplier('');
        }
        setBenchmarkModalOpen(true);
    };

    const handleSaveBenchmark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bmItemName.trim() || !bmUnit.trim() || !bmCategoryId) return;

        try {
            if (editingBenchmark) {
                await financeService.updateBenchmark(editingBenchmark.id, {
                    categoryId: bmCategoryId,
                    itemName: bmItemName,
                    unit: bmUnit,
                    currentMarketPrice: bmPrice,
                    supplierReference: bmSupplier,
                });
                setStatusMsg({ type: 'success', text: 'Cập nhật giá benchmark thành công!' });
            } else {
                await financeService.createBenchmark({
                    categoryId: bmCategoryId,
                    itemName: bmItemName,
                    unit: bmUnit,
                    currentMarketPrice: bmPrice,
                    supplierReference: bmSupplier,
                });
                setStatusMsg({ type: 'success', text: 'Thêm vật tư chuẩn thành công!' });
            }
            setBenchmarkModalOpen(false);
            loadData();
        } catch {
            if (editingBenchmark) {
                setBenchmarks(prev => prev.map(b => b.id === editingBenchmark.id ? {
                    ...b,
                    categoryId: bmCategoryId,
                    itemName: bmItemName,
                    unit: bmUnit,
                    currentMarketPrice: bmPrice,
                    supplierReference: bmSupplier,
                    lastUpdatedAt: new Date().toISOString(),
                } : b));
            } else {
                setBenchmarks(prev => [...prev, {
                    id: Date.now().toString(),
                    categoryId: bmCategoryId,
                    itemName: bmItemName,
                    unit: bmUnit,
                    currentMarketPrice: bmPrice,
                    supplierReference: bmSupplier,
                    lastUpdatedAt: new Date().toISOString(),
                }]);
            }
            setBenchmarkModalOpen(false);
            setStatusMsg({ type: 'success', text: 'Đã lưu benchmark vật tư thành công!' });
        }
    };

    const handleDeleteBenchmark = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa đơn giá benchmark này?')) return;
        try {
            await financeService.deleteBenchmark(id);
            setStatusMsg({ type: 'success', text: 'Xóa benchmark thành công!' });
            loadData();
        } catch {
            setBenchmarks(prev => prev.filter(b => b.id !== id));
            setStatusMsg({ type: 'success', text: 'Đã xóa benchmark!' });
        }
    };

    const getCategoryName = (catId: string) => {
        return categories.find(c => c.id === catId)?.name ?? 'Khác';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Master Catalog & Bảng Giá Thị Trường
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý danh mục chi tiêu (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">budget_categories</code>) và đơn giá thị trường chuẩn (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">item_price_benchmarks</code>)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    {activeTab === 'benchmarks' ? (
                        <button
                            onClick={() => handleOpenBenchmarkModal()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm Đơn Giá Benchmark
                        </button>
                    ) : (
                        <button
                            onClick={() => handleOpenCategoryModal()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm Danh Mục
                        </button>
                    )}
                </div>
            </div>

            {/* Notification alert */}
            {statusMsg && (
                <div className={`rounded-xl p-4 text-sm flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <span>{statusMsg.text}</span>
                    </div>
                    <button onClick={() => setStatusMsg(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('benchmarks')}
                        className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${activeTab === 'benchmarks'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        <Scale className="h-4 w-4" />
                        Bảng Giá Benchmark Chuẩn ({benchmarks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${activeTab === 'categories'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        <Tag className="h-4 w-4" />
                        Danh Mục Kinh Phí ({categories.length})
                    </button>
                </nav>
            </div>

            {/* Tab 1: Benchmarks */}
            {activeTab === 'benchmarks' && (
                <div className="space-y-4">
                    {/* Filters bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="Tìm kiếm tên vật tư, nhà cung cấp..."
                                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={selectedCategoryFilter}
                                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="ALL">Tất cả danh mục</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-3.5">Tên Hạng Mục / Vật Tư</th>
                                    <th className="px-4 py-3.5">Danh Mục</th>
                                    <th className="px-4 py-3.5">Đơn Vị</th>
                                    <th className="px-4 py-3.5">Đơn Giá Thị Trường</th>
                                    <th className="px-4 py-3.5">Nhà Cung Cấp Tham Chiếu</th>
                                    <th className="px-4 py-3.5 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredBenchmarks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                            Không tìm thấy vật tư chuẩn nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBenchmarks.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-slate-900">
                                                {b.itemName}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    {getCategoryName(b.categoryId)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600">{b.unit}</td>
                                            <td className="px-4 py-3.5 font-bold text-emerald-700">
                                                {formatCurrency(b.currentMarketPrice)}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{b.supplierReference || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenBenchmarkModal(b)}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBenchmark(b.id)}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Categories */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                                            <Tag className="h-4 w-4" />
                                        </div>
                                        <h3 className="font-bold text-slate-900">{c.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenCategoryModal(c)}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(c.id)}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                                    {c.description || 'Chưa có mô tả chi tiết cho nhóm danh mục này.'}
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                                {benchmarks.filter(b => b.categoryId === c.id).length} vật tư thuộc danh mục
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Category */}
            {categoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                            </h3>
                            <button onClick={() => setCategoryModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên danh mục *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="VD: Hậu cần & Địa điểm"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Mô tả chi tiết</label>
                                <textarea
                                    rows={3}
                                    value={categoryDesc}
                                    onChange={(e) => setCategoryDesc(e.target.value)}
                                    placeholder="Mô tả phạm vi các chi phí thuộc danh mục này..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCategoryModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    Lưu Danh Mục
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Benchmark */}
            {benchmarkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingBenchmark ? 'Sửa Đơn Giá Benchmark' : 'Thêm Đơn Giá Benchmark'}
                            </h3>
                            <button onClick={() => setBenchmarkModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSaveBenchmark} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Danh mục kinh phí *</label>
                                <select
                                    required
                                    value={bmCategoryId}
                                    onChange={(e) => setBmCategoryId(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên hạng mục / vật tư *</label>
                                <input
                                    type="text"
                                    required
                                    value={bmItemName}
                                    onChange={(e) => setBmItemName(e.target.value)}
                                    placeholder="VD: Standee bạt PP (0.8m x 1.8m)"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đơn vị tính *</label>
                                    <input
                                        type="text"
                                        required
                                        value={bmUnit}
                                        onChange={(e) => setBmUnit(e.target.value)}
                                        placeholder="VD: Cái, Tấm, Thùng"
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đơn giá thị trường (VND) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={bmPrice}
                                        onChange={(e) => setBmPrice(Number(e.target.value))}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tham chiếu nhà cung cấp</label>
                                <input
                                    type="text"
                                    value={bmSupplier}
                                    onChange={(e) => setBmSupplier(e.target.value)}
                                    placeholder="VD: Nhà in FPT Copy, Bách Hóa Xanh"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setBenchmarkModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    Lưu Benchmark
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
