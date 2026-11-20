import { useState } from 'react';
import { Scale, Plus, RefreshCw, CheckCircle, AlertTriangle, X, Tag } from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useBenchmarkCatalog } from '../hooks/useBenchmarkCatalog';
import { BenchmarkFilterPart } from './parts/BenchmarkFilterPart';
import { BenchmarkTablePart } from './parts/BenchmarkTablePart';
import { CategoryGridPart } from './parts/CategoryGridPart';
import { BenchmarkModalPart } from './parts/BenchmarkModalPart';
import { CategoryModalPart } from './parts/CategoryModalPart';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ErrorModal } from '../components/ErrorModal';
import type { ItemPriceBenchmark, BudgetCategory } from '../../../types/models/finance';

export default function BenchmarkPage() {
    const { currentEventId } = useActiveEvent();
    const [activeTab, setActiveTab] = useState<'benchmarks' | 'categories'>('benchmarks');

    const {
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
        reloadData,
        createCategory,
        updateCategory,
        deleteCategory,
        createBenchmark,
        updateBenchmark,
        deleteBenchmark,
    } = useBenchmarkCatalog(currentEventId ?? undefined);

    // Form Modals
    const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
    const [editingBenchmark, setEditingBenchmark] = useState<ItemPriceBenchmark | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

    // Delete Confirmation Modals
    const [deleteBenchmarkTarget, setDeleteBenchmarkTarget] = useState<ItemPriceBenchmark | null>(null);
    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<BudgetCategory | null>(null);

    const handleOpenBenchmarkModal = (bm?: ItemPriceBenchmark) => {
        setEditingBenchmark(bm ?? null);
        setBenchmarkModalOpen(true);
    };

    const handleOpenCategoryModal = (cat?: BudgetCategory) => {
        setEditingCategory(cat ?? null);
        setCategoryModalOpen(true);
    };

    const handleConfirmDeleteBenchmark = async () => {
        if (!deleteBenchmarkTarget) return;
        try {
            await deleteBenchmark(deleteBenchmarkTarget.id);
            setDeleteBenchmarkTarget(null);
        } catch {
            // ErrorModal will display the backend error
        }
    };

    const handleConfirmDeleteCategory = async () => {
        if (!deleteCategoryTarget) return;
        try {
            await deleteCategory(deleteCategoryTarget.id);
            setDeleteCategoryTarget(null);
        } catch {
            // ErrorModal will display the backend error
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Layout */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Master Catalog & Bảng Giá Thị Trường
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý danh mục chi tiêu (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">budget_categories</code>) và đơn giá thị trường chuẩn (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">item_price_benchmarks</code>)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={reloadData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
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

            {/* Content Parts */}
            {activeTab === 'benchmarks' ? (
                <div className="space-y-4">
                    <BenchmarkFilterPart
                        searchKeyword={searchKeyword}
                        onSearchChange={setSearchKeyword}
                        selectedCategory={selectedCategoryFilter}
                        onCategoryChange={setSelectedCategoryFilter}
                        categories={categories}
                    />
                    <BenchmarkTablePart
                        benchmarks={filteredBenchmarks}
                        categories={categories}
                        loading={loading}
                        onEdit={handleOpenBenchmarkModal}
                        onDelete={(bm) => setDeleteBenchmarkTarget(bm)}
                    />
                </div>
            ) : (
                <CategoryGridPart
                    categories={categories}
                    benchmarks={benchmarks}
                    loading={loading}
                    onEdit={handleOpenCategoryModal}
                    onDelete={(cat) => setDeleteCategoryTarget(cat)}
                />
            )}

            {/* Form Modals */}
            <BenchmarkModalPart
                isOpen={benchmarkModalOpen}
                initialData={editingBenchmark}
                categories={categories}
                isSubmitting={isSubmitting}
                onClose={() => setBenchmarkModalOpen(false)}
                onSubmit={async (data) => {
                    if (editingBenchmark) {
                        await updateBenchmark(editingBenchmark.id, data);
                    } else {
                        await createBenchmark(data);
                    }
                }}
            />

            <CategoryModalPart
                isOpen={categoryModalOpen}
                initialData={editingCategory}
                isSubmitting={isSubmitting}
                onClose={() => setCategoryModalOpen(false)}
                onSubmit={async (data) => {
                    if (editingCategory) {
                        await updateCategory(editingCategory.id, data);
                    } else {
                        await createCategory(data);
                    }
                }}
            />

            {/* Delete Confirmation Modals */}
            <ConfirmDeleteModal
                isOpen={!!deleteBenchmarkTarget}
                title="Xóa vật tư benchmark"
                itemName={deleteBenchmarkTarget?.itemName}
                message={`Bạn có chắc chắn muốn xóa đơn giá benchmark "${deleteBenchmarkTarget?.itemName}"? Thao tác này sẽ xóa vĩnh viễn khỏi danh mục tham chiếu.`}
                isLoading={isSubmitting}
                onClose={() => setDeleteBenchmarkTarget(null)}
                onConfirm={handleConfirmDeleteBenchmark}
            />

            <ConfirmDeleteModal
                isOpen={!!deleteCategoryTarget}
                title="Xóa danh mục kinh phí"
                itemName={deleteCategoryTarget?.name}
                message={`Bạn có chắc chắn muốn xóa danh mục "${deleteCategoryTarget?.name}"? Các vật tư liên quan có thể bị ảnh hưởng.`}
                isLoading={isSubmitting}
                onClose={() => setDeleteCategoryTarget(null)}
                onConfirm={handleConfirmDeleteCategory}
            />

            {/* Error Modal */}
            <ErrorModal
                isOpen={!!errorMessage}
                message={errorMessage ?? ''}
                onClose={clearError}
            />
        </div>
    );
}
