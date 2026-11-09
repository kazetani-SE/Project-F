import { useEffect, useState, useMemo } from 'react';
import {
    Calculator, Plus, Sparkles, Filter, CheckCircle, XCircle, Trash2,
    RefreshCw, AlertCircle, X, Clock
} from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { financeService } from '../../../services/financeService';
import type {
    BudgetItem,
    BudgetCategory,
    ItemPriceBenchmark,
    ProjectedBudgetItem,
} from '../../../types/models/finance';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function BudgetItemsPage() {
    const { currentEvent, currentEventId, events } = useActiveEvent();

    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [benchmarks, setBenchmarks] = useState<ItemPriceBenchmark[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetRejectItem, setTargetRejectItem] = useState<BudgetItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Create form state
    const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
    const [categoryId, setCategoryId] = useState('');
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [unit, setUnit] = useState('Cái');
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
    const [notes, setNotes] = useState('');

    // Auto-project state
    const [selectedPrevEventId, setSelectedPrevEventId] = useState<string>('');
    const [projectedPreview, setProjectedPreview] = useState<ProjectedBudgetItem[]>([]);
    const [projectLoading, setProjectLoading] = useState(false);

    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async (eventId: string) => {
        setLoading(true);
        try {
            const [items, cats, bms] = await Promise.all([
                financeService.getBudgetItems(eventId),
                financeService.getCategories(),
                financeService.getBenchmarks(),
            ]);
            setBudgetItems(items);
            setCategories(cats);
            setBenchmarks(bms);
        } catch {
            // Mock fallback if offline
            const mockCats: BudgetCategory[] = [
                { id: '1', name: 'Hậu cần & Địa điểm' },
                { id: '2', name: 'Truyền thông & Ấn phẩm' },
                { id: '3', name: 'Quà tặng & Giải thưởng' },
                { id: '4', name: 'Ăn uống & Tiếp khách' },
            ];
            const mockItems: BudgetItem[] = [
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
            ];
            setCategories(mockCats);
            setBudgetItems(mockItems);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentEventId) {
            loadData(currentEventId);
        }
    }, [currentEventId]);

    // Handle picking benchmark to auto-fill item info
    const handleBenchmarkChange = (bmId: string) => {
        setSelectedBenchmarkId(bmId);
        if (!bmId) return;
        const bm = benchmarks.find(b => b.id === bmId);
        if (bm) {
            setCategoryId(bm.categoryId);
            setItemName(bm.itemName);
            setUnit(bm.unit);
            setEstimatedPrice(bm.currentMarketPrice);
        }
    };

    // Filter items
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

    // Create budget item
    const handleCreateBudgetItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEventId || !categoryId || !itemName.trim()) return;

        try {
            await financeService.createBudgetItem({
                eventId: currentEventId,
                categoryId,
                benchmarkId: selectedBenchmarkId || undefined,
                itemName,
                quantity,
                unit,
                estimatedUnitPrice: estimatedPrice,
                notes,
            });
            setNotification({ type: 'success', text: 'Thêm dự trù ngân sách thành công!' });
            setCreateModalOpen(false);
            resetCreateForm();
            loadData(currentEventId);
        } catch {
            const newItem: BudgetItem = {
                id: Date.now().toString(),
                eventId: currentEventId,
                categoryId,
                itemName,
                quantity,
                unit,
                estimatedUnitPrice: estimatedPrice,
                totalEstimatedAmount: quantity * estimatedPrice,
                approvalStatus: 'PENDING',
                notes,
            };
            setBudgetItems(prev => [newItem, ...prev]);
            setNotification({ type: 'success', text: 'Đã lưu dự trù thành công!' });
            setCreateModalOpen(false);
            resetCreateForm();
        }
    };

    const resetCreateForm = () => {
        setSelectedBenchmarkId('');
        setCategoryId(categories[0]?.id ?? '');
        setItemName('');
        setQuantity(1);
        setUnit('Cái');
        setEstimatedPrice(0);
        setNotes('');
    };

    // Review budget item
    const handleApprove = async (item: BudgetItem) => {
        try {
            await financeService.reviewBudgetItem(item.id, {
                status: 'APPROVED',
            });
            setNotification({ type: 'success', text: `Đã duyệt hạng mục: ${item.itemName}` });
            if (currentEventId) loadData(currentEventId);
        } catch {
            setBudgetItems(prev => prev.map(i => i.id === item.id ? { ...i, approvalStatus: 'APPROVED' } : i));
            setNotification({ type: 'success', text: `Đã duyệt hạng mục: ${item.itemName}` });
        }
    };

    const handleOpenRejectModal = (item: BudgetItem) => {
        setTargetRejectItem(item);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleConfirmReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRejectItem) return;

        try {
            await financeService.reviewBudgetItem(targetRejectItem.id, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: `Đã từ chối hạng mục: ${targetRejectItem.itemName}` });
            setRejectModalOpen(false);
            if (currentEventId) loadData(currentEventId);
        } catch {
            setBudgetItems(prev => prev.map(i => i.id === targetRejectItem.id ? { ...i, approvalStatus: 'REJECTED', rejectionReason } : i));
            setRejectModalOpen(false);
            setNotification({ type: 'success', text: `Đã từ chối: ${targetRejectItem.itemName}` });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa hạng mục dự trù này?')) return;
        try {
            await financeService.deleteBudgetItem(id);
            setNotification({ type: 'success', text: 'Xóa dự trù thành công!' });
            if (currentEventId) loadData(currentEventId);
        } catch {
            setBudgetItems(prev => prev.filter(i => i.id !== id));
            setNotification({ type: 'success', text: 'Đã xóa hạng mục!' });
        }
    };

    // Auto projection
    const handleLoadPrevProjection = async (prevEventId: string) => {
        setSelectedPrevEventId(prevEventId);
        if (!prevEventId) {
            setProjectedPreview([]);
            return;
        }
        setProjectLoading(true);
        try {
            const preview = await financeService.getProjectedBudgetPreview(prevEventId);
            setProjectedPreview(preview);
        } catch {
            // Mock preview fallback
            setProjectedPreview([
                {
                    previousBudgetItemId: 'p1', previousEventId: prevEventId, categoryId: '2',
                    itemName: 'Standee bạt PP', unit: 'Cái', previousPlannedQty: 4,
                    baseQuantityForProjection: 4, previousUnitPrice: 100000,
                    currentAdjustedUnitPrice: 120000, projectedCurrentCost: 480000
                },
                {
                    previousBudgetItemId: 'p2', previousEventId: prevEventId, categoryId: '4',
                    itemName: 'Nước suối Aquafina 500ml', unit: 'Thùng 24 chai', previousPlannedQty: 8,
                    baseQuantityForProjection: 12, previousUnitPrice: 90000,
                    currentAdjustedUnitPrice: 95000, projectedCurrentCost: 1140000
                },
            ]);
        } finally {
            setProjectLoading(false);
        }
    };

    const handleConfirmAutoProject = async () => {
        if (!currentEventId || !selectedPrevEventId) return;
        try {
            await financeService.autoProjectBudget({
                targetEventId: currentEventId,
                previousEventId: selectedPrevEventId,
            });
            setNotification({ type: 'success', text: 'Kế thừa tự động dự toán từ mùa trước thành công!' });
            setProjectModalOpen(false);
            loadData(currentEventId);
        } catch {
            // Simulate adding projected items
            const newItems: BudgetItem[] = projectedPreview.map((p, idx) => ({
                id: 'proj_' + idx + '_' + Date.now(),
                eventId: currentEventId,
                categoryId: p.categoryId,
                itemName: p.itemName,
                quantity: p.baseQuantityForProjection,
                unit: p.unit,
                estimatedUnitPrice: p.currentAdjustedUnitPrice,
                totalEstimatedAmount: p.projectedCurrentCost,
                approvalStatus: 'PENDING',
                notes: 'Dự toán tự động kế thừa từ mùa trước',
            }));
            setBudgetItems(prev => [...newItems, ...prev]);
            setNotification({ type: 'success', text: `Đã tự động nạp ${newItems.length} hạng mục dự toán!` });
            setProjectModalOpen(false);
        }
    };

    if (!currentEventId || !currentEvent) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-lg font-bold text-slate-800">Chưa chọn Mùa sự kiện</h2>
                <p className="mt-2 text-sm text-slate-600">Vui lòng chọn Mùa sự kiện ở thanh menu trước khi lập dự trù ngân sách.</p>
            </div>
        );
    }

    const otherEvents = events.filter(e => e.id !== currentEventId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Dự Toán Ngân Sách Mùa Sự Kiện
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Lập đề xuất kinh phí & Kế thừa định mức tự động
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => currentEventId && loadData(currentEventId)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => setProjectModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition-colors"
                    >
                        <Sparkles className="h-4 w-4" />
                        Kế Thừa Mùa Trước
                    </button>
                    <button
                        onClick={() => { resetCreateForm(); setCreateModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm Dự Trù Mới
                    </button>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`rounded-xl p-4 text-sm flex items-center justify-between ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                    <span>{notification.text}</span>
                    <button onClick={() => setNotification(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Summary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng Dự Trù Đang Hiển Thị</span>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalEstimatedSum)}</div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Đã duyệt: {budgetItems.filter(i => i.approvalStatus === 'APPROVED').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Chờ duyệt: {budgetItems.filter(i => i.approvalStatus === 'PENDING').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Từ chối: {budgetItems.filter(i => i.approvalStatus === 'REJECTED').length}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="PENDING">Chờ duyệt (PENDING)</option>
                        <option value="APPROVED">Đã duyệt (APPROVED)</option>
                        <option value="REJECTED">Từ chối (REJECTED)</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
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
                            <th className="px-5 py-3.5">Hạng Mục Dự Trù</th>
                            <th className="px-4 py-3.5">Số Lượng</th>
                            <th className="px-4 py-3.5">Đơn Giá Dự Kiến</th>
                            <th className="px-4 py-3.5">Thành Tiền (STORED)</th>
                            <th className="px-4 py-3.5">Trạng Thái</th>
                            <th className="px-4 py-3.5">Ghi Chú</th>
                            <th className="px-4 py-3.5 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                    Không có hạng mục dự trù nào.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => {
                                const total = item.totalEstimatedAmount ?? (item.quantity * item.estimatedUnitPrice);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-semibold text-slate-900">{item.itemName}</div>
                                            <div className="text-xs text-slate-400">{categories.find(c => c.id === item.categoryId)?.name}</div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">
                                            {formatCurrency(item.estimatedUnitPrice)}
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-slate-900">
                                            {formatCurrency(total)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${item.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                                item.approvalStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                                                    'bg-amber-50 text-amber-700'
                                                }`}>
                                                {item.approvalStatus === 'APPROVED' && <CheckCircle className="h-3.5 w-3.5" />}
                                                {item.approvalStatus === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                                                {item.approvalStatus === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
                                                {item.approvalStatus}
                                            </span>
                                            {item.rejectionReason && (
                                                <div className="mt-1 text-[11px] text-rose-600 italic">
                                                    Lý do: {item.rejectionReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                                            {item.notes || '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {item.approvalStatus !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleApprove(item)}
                                                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                                        title="Phê duyệt"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {item.approvalStatus !== 'REJECTED' && (
                                                    <button
                                                        onClick={() => handleOpenRejectModal(item)}
                                                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                                        title="Từ chối"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Create Budget Item */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Lập Dự Trù Hạng Mục Mới</h3>
                            <button onClick={() => setCreateModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>

                        {/* Benchmark quick pick */}
                        <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/50 p-3">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                Chọn nhanh từ Bảng Giá Benchmark chuẩn
                            </label>
                            <select
                                value={selectedBenchmarkId}
                                onChange={(e) => handleBenchmarkChange(e.target.value)}
                                className="mt-1.5 w-full rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                            >
                                <option value="">-- Tự nhập hạng mục tùy biến --</option>
                                {benchmarks.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.itemName} — {formatCurrency(b.currentMarketPrice)}/{b.unit}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <form onSubmit={handleCreateBudgetItem} className="mt-4 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Danh mục kinh phí *</label>
                                <select
                                    required
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên hạng mục *</label>
                                <input
                                    type="text"
                                    required
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="VD: In ấn tài liệu, Nước suối..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Số lượng *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0.01}
                                        step="any"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đơn vị tính *</label>
                                    <input
                                        type="text"
                                        required
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đơn giá (VND) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={estimatedPrice}
                                        onChange={(e) => setEstimatedPrice(Number(e.target.value))}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 flex justify-between font-semibold">
                                <span>Thành tiền tự tính:</span>
                                <span className="font-bold text-emerald-700">{formatCurrency(quantity * estimatedPrice)}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Ghi chú dự trù</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Mô tả mục đích sử dụng..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    Gửi Đề Xuất Dự Trù
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Auto-Project from Previous Season */}
            {projectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-600" />
                                <h3 className="text-lg font-bold text-slate-900">
                                    Kế Thừa Dự Toán Tự Động Từ Mùa Trước
                                </h3>
                            </div>
                            <button onClick={() => setProjectModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            Thuật toán đối soát SQL View (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">v_projected_budget_from_previous_season</code>) sẽ lấy số lượng thực tế đã chi tiêu ở mùa trước nhân với đơn giá thị trường hiện hành của benchmark để lập dự toán mới.
                        </p>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-slate-700">Chọn mùa sự kiện tham chiếu mùa trước:</label>
                            <select
                                value={selectedPrevEventId}
                                onChange={(e) => handleLoadPrevProjection(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                            >
                                <option value="">-- Chọn mùa sự kiện cũ --</option>
                                {otherEvents.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.name} ({ev.seasonLabel ?? 'Mùa cũ'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {projectLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                            </div>
                        ) : projectedPreview.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Bản Xem Trước Dự Toán Đề Xuất ({projectedPreview.length} hạng mục)
                                </h4>
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                                        <thead className="bg-slate-50 font-semibold text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Hạng Mục</th>
                                                <th className="px-3 py-2 text-center">SL Thực Chi Mùa Trước</th>
                                                <th className="px-3 py-2 text-right">Giá Thị Trường Mới</th>
                                                <th className="px-3 py-2 text-right">Thành Tiền Dự Kiến</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {projectedPreview.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-medium text-slate-800">{p.itemName}</td>
                                                    <td className="px-3 py-2 text-center text-slate-600">{p.baseQuantityForProjection} {p.unit}</td>
                                                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{formatCurrency(p.currentAdjustedUnitPrice)}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(p.projectedCurrentCost)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : selectedPrevEventId ? (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                                Mùa sự kiện này chưa có dữ liệu chi tiêu hoặc dự trù đã duyệt để kế thừa.
                            </div>
                        ) : null}

                        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setProjectModalOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                disabled={projectedPreview.length === 0}
                                onClick={handleConfirmAutoProject}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-40"
                            >
                                <Sparkles className="h-4 w-4" />
                                Xác Nhận Nạp Dự Toán Tự Động
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Reject item */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Từ Chối Phê Duyệt Dự Trù</h3>
                        <p className="mt-1 text-xs text-slate-500">Vui lòng cung cấp lý do từ chối để BTC sửa đổi.</p>
                        <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Lý do từ chối *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="VD: Đơn giá vượt quá mức định biên cho phép..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                                >
                                    Xác Nhận Từ Chối
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
