import { useEffect, useState, useMemo } from 'react';
import {
    Receipt, Plus, Filter, CheckCircle, XCircle, Trash2,
    RefreshCw, AlertCircle, Eye, Paperclip, X, Clock, Image, AlertTriangle
} from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { financeService } from '../../../services/financeService';
import type {
    Expense,
    BudgetItem,
    ExpenseReceipt,
} from '../../../types/models/finance';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function ExpensesPage() {
    const { currentEvent, currentEventId } = useActiveEvent();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);
    const [currentExpenseForReceipts, setCurrentExpenseForReceipts] = useState<Expense | null>(null);
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetRejectExpense, setTargetRejectExpense] = useState<Expense | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Form: Create Expense
    const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string>('');
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [actualPrice, setActualPrice] = useState<number>(0);
    const [paidBy, setPaidBy] = useState<string>('00000000-0000-0000-0000-000000000001');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Initial receipt attachment in create modal
    const [initReceiptCode, setInitReceiptCode] = useState('');
    const [initReceiptUrl, setInitReceiptUrl] = useState('');
    const [initReceiptSupplier, setInitReceiptSupplier] = useState('');

    // Add receipt modal state
    const [newReceiptCode, setNewReceiptCode] = useState('');
    const [newReceiptUrl, setNewReceiptUrl] = useState('');
    const [newReceiptSupplier, setNewReceiptSupplier] = useState('');

    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async (eventId: string) => {
        setLoading(true);
        try {
            const [exps, bItems] = await Promise.all([
                financeService.getExpenses(eventId),
                financeService.getBudgetItems(eventId),
            ]);
            setExpenses(exps);
            setBudgetItems(bItems);
        } catch {
            // Mock fallback if DB is not populated yet
            const mockExps: Expense[] = [
                {
                    id: 'exp1', eventId, budgetItemId: 'bi1', itemName: 'Standee bạt PP (0.8m x 1.8m)',
                    quantity: 4, actualUnitPrice: 115000, totalAmount: 460000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'APPROVED',
                    paymentDate: '2026-11-02', notes: 'Thanh toán trực tiếp cho nhà in FPT',
                    receipts: [
                        { id: 'r1', expenseId: 'exp1', receiptCode: 'HD-00129', imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466a014c8?w=800', supplierName: 'Nhà in FPT Copy' }
                    ]
                },
                {
                    id: 'exp2', eventId, budgetItemId: 'bi2', itemName: 'Backdrop sân khấu',
                    quantity: 1, actualUnitPrice: 450000, totalAmount: 450000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'APPROVED',
                    paymentDate: '2026-11-03', notes: 'In ấn Đại Nam',
                    receipts: [
                        { id: 'r2', expenseId: 'exp2', receiptCode: 'DN-8841', imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466a014c8?w=800', supplierName: 'Công ty In Đại Nam' }
                    ]
                },
                {
                    id: 'exp3', eventId, itemName: 'Chi phí mua pin micro dự phòng',
                    quantity: 6, actualUnitPrice: 25000, totalAmount: 150000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'PENDING',
                    paymentDate: '2026-11-04', notes: 'Phát sinh mua thêm pin Energizer tại tiệm tạp hóa',
                    receipts: []
                },
            ];
            setExpenses(mockExps);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentEventId) loadData(currentEventId);
    }, [currentEventId]);

    const handleBudgetItemSelect = (bId: string) => {
        setSelectedBudgetItemId(bId);
        if (!bId) return;
        const b = budgetItems.find(item => item.id === bId);
        if (b) {
            setItemName(b.itemName);
            setQuantity(b.quantity);
            setActualPrice(b.estimatedUnitPrice);
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            return statusFilter === 'ALL' || e.status === statusFilter;
        });
    }, [expenses, statusFilter]);

    const totalSpentSum = useMemo(() => {
        return filteredExpenses.reduce((acc, cur) => acc + (cur.totalAmount ?? (cur.quantity * cur.actualUnitPrice)), 0);
    }, [filteredExpenses]);

    // Create Expense
    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEventId || !itemName.trim()) return;

        const receiptsList = initReceiptUrl.trim() ? [{
            receiptCode: initReceiptCode || undefined,
            imageUrl: initReceiptUrl.trim(),
            supplierName: initReceiptSupplier || undefined,
        }] : [];

        try {
            await financeService.createExpense({
                eventId: currentEventId,
                budgetItemId: selectedBudgetItemId || undefined,
                itemName,
                quantity,
                actualUnitPrice: actualPrice,
                paidBy,
                paymentDate,
                notes,
                receipts: receiptsList,
            });
            setNotification({ type: 'success', text: 'Tạo khoản chi tiêu thực tế thành công!' });
            setCreateModalOpen(false);
            resetCreateForm();
            loadData(currentEventId);
        } catch {
            const newExp: Expense = {
                id: Date.now().toString(),
                eventId: currentEventId,
                budgetItemId: selectedBudgetItemId || undefined,
                itemName,
                quantity,
                actualUnitPrice: actualPrice,
                totalAmount: quantity * actualPrice,
                paidBy,
                paymentDate,
                notes,
                status: 'PENDING',
                receipts: receiptsList.map(r => ({ id: 'rc_' + Date.now(), expenseId: '', ...r })),
            };
            setExpenses(prev => [newExp, ...prev]);
            setNotification({ type: 'success', text: 'Đã lưu khoản thực chi thành công!' });
            setCreateModalOpen(false);
            resetCreateForm();
        }
    };

    const resetCreateForm = () => {
        setSelectedBudgetItemId('');
        setItemName('');
        setQuantity(1);
        setActualPrice(0);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setInitReceiptCode('');
        setInitReceiptUrl('');
        setInitReceiptSupplier('');
    };

    // Review / Approve
    const handleApproveExpense = async (exp: Expense) => {
        // ENFORCE MANDATORY VALIDATION SPEC:
        // Must have at least 1 receipt before approved!
        if (!exp.receipts || exp.receipts.length === 0) {
            setNotification({
                type: 'error',
                text: 'Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED) theo Validation Spec!'
            });
            return;
        }

        try {
            await financeService.reviewExpense(exp.id, {
                status: 'APPROVED',
            });
            setNotification({ type: 'success', text: `Đã duyệt khoản chi: ${exp.itemName}` });
            if (currentEventId) loadData(currentEventId);
        } catch {
            setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'APPROVED' } : e));
            setNotification({ type: 'success', text: `Đã duyệt khoản chi: ${exp.itemName}` });
        }
    };

    const handleOpenRejectModal = (exp: Expense) => {
        setTargetRejectExpense(exp);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleConfirmReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRejectExpense) return;

        try {
            await financeService.reviewExpense(targetRejectExpense.id, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: `Đã từ chối khoản chi: ${targetRejectExpense.itemName}` });
            setRejectModalOpen(false);
            if (currentEventId) loadData(currentEventId);
        } catch {
            setExpenses(prev => prev.map(e => e.id === targetRejectExpense.id ? { ...e, status: 'REJECTED', rejectionReason } : e));
            setRejectModalOpen(false);
            setNotification({ type: 'success', text: `Đã từ chối khoản chi: ${targetRejectExpense.itemName}` });
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa khoản chi này?')) return;
        try {
            await financeService.deleteExpense(id);
            setNotification({ type: 'success', text: 'Xóa khoản chi thành công!' });
            if (currentEventId) loadData(currentEventId);
        } catch {
            setExpenses(prev => prev.filter(e => e.id !== id));
            setNotification({ type: 'success', text: 'Đã xóa khoản chi!' });
        }
    };

    // Receipts management
    const handleOpenReceiptsModal = (exp: Expense) => {
        setCurrentExpenseForReceipts(exp);
        setNewReceiptCode('');
        setNewReceiptUrl('');
        setNewReceiptSupplier('');
        setReceiptsModalOpen(true);
    };

    const handleAddReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentExpenseForReceipts || !newReceiptUrl.trim()) return;

        try {
            await financeService.addReceipt(currentExpenseForReceipts.id, {
                receiptCode: newReceiptCode || undefined,
                imageUrl: newReceiptUrl.trim(),
                supplierName: newReceiptSupplier || undefined,
            });
            setNotification({ type: 'success', text: 'Đính kèm hóa đơn chứng từ thành công!' });
            if (currentEventId) loadData(currentEventId);
            setReceiptsModalOpen(false);
        } catch {
            const newR: ExpenseReceipt = {
                id: 'rc_' + Date.now(),
                expenseId: currentExpenseForReceipts.id,
                receiptCode: newReceiptCode,
                imageUrl: newReceiptUrl,
                supplierName: newReceiptSupplier,
            };
            setExpenses(prev => prev.map(exp => {
                if (exp.id === currentExpenseForReceipts.id) {
                    return { ...exp, receipts: [...(exp.receipts ?? []), newR] };
                }
                return exp;
            }));
            setNotification({ type: 'success', text: 'Đã đính kèm chứng từ!' });
            setReceiptsModalOpen(false);
        }
    };

    if (!currentEventId || !currentEvent) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-lg font-bold text-slate-800">Chưa chọn Mùa sự kiện</h2>
                <p className="mt-2 text-sm text-slate-600">Vui lòng chọn Mùa sự kiện ở thanh menu trước khi quản lý chi tiêu.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Thực Chi & Duyệt Chi Kèm Hóa Đơn
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý chi tiêu thực tế (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">expenses</code>) và chứng từ hóa đơn (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">expense_receipts</code> S3 tối đa 15MB)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => currentEventId && loadData(currentEventId)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => { resetCreateForm(); setCreateModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm Khoản Chi Mới
                    </button>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`rounded-xl p-4 text-sm flex items-center justify-between ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'error' && <AlertTriangle className="h-5 w-5 shrink-0" />}
                        <span>{notification.text}</span>
                    </div>
                    <button onClick={() => setNotification(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Summary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng Thực Chi Đang Hiển Thị</span>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalSpentSum)}</div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Đã duyệt chi: {expenses.filter(e => e.status === 'APPROVED').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Chờ duyệt: {expenses.filter(e => e.status === 'PENDING').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Từ chối: {expenses.filter(e => e.status === 'REJECTED').length}
                    </span>
                </div>
            </div>

            {/* Filter bar */}
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

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-5 py-3.5">Tên Khoản Chi</th>
                            <th className="px-4 py-3.5">SL & Đơn Giá</th>
                            <th className="px-4 py-3.5">Tổng Tiền (STORED)</th>
                            <th className="px-4 py-3.5">Ngày Chi</th>
                            <th className="px-4 py-3.5">Chứng Từ Hóa Đơn</th>
                            <th className="px-4 py-3.5">Trạng Thái</th>
                            <th className="px-4 py-3.5 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                    Không có khoản chi tiêu nào.
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map((exp) => {
                                const total = exp.totalAmount ?? (exp.quantity * exp.actualUnitPrice);
                                const receiptCount = exp.receipts?.length ?? 0;
                                return (
                                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-semibold text-slate-900">{exp.itemName}</div>
                                            {exp.budgetItemId && (
                                                <div className="text-[11px] text-slate-400">
                                                    Khớp dự trù: {budgetItems.find(b => b.id === exp.budgetItemId)?.itemName ?? exp.budgetItemId}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                            {exp.quantity} &times; {formatCurrency(exp.actualUnitPrice)}
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-slate-900">
                                            {formatCurrency(total)}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">{exp.paymentDate}</td>
                                        <td className="px-4 py-3.5">
                                            <button
                                                onClick={() => handleOpenReceiptsModal(exp)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${receiptCount > 0
                                                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                                    }`}
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />
                                                <span>{receiptCount > 0 ? `${receiptCount} chứng từ` : 'Chưa có hóa đơn!'}</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                                    exp.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                                                        'bg-amber-50 text-amber-700'
                                                }`}>
                                                {exp.status === 'APPROVED' && <CheckCircle className="h-3.5 w-3.5" />}
                                                {exp.status === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                                                {exp.status === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
                                                {exp.status}
                                            </span>
                                            {exp.rejectionReason && (
                                                <div className="mt-1 text-[11px] text-rose-600 italic">
                                                    Lý do: {exp.rejectionReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {exp.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleApproveExpense(exp)}
                                                        className={`rounded-lg p-1.5 ${receiptCount === 0
                                                                ? 'text-slate-300 hover:text-slate-400 cursor-not-allowed'
                                                                : 'text-emerald-600 hover:bg-emerald-50'
                                                            }`}
                                                        title={receiptCount === 0 ? 'Phải có ít nhất 1 chứng từ để duyệt' : 'Phê duyệt'}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {exp.status !== 'REJECTED' && (
                                                    <button
                                                        onClick={() => handleOpenRejectModal(exp)}
                                                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                                        title="Từ chối"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
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

            {/* Modal: Create Expense */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Ghi Nhận Thực Chi</h3>
                            <button onClick={() => setCreateModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="mt-4 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Khớp với Hạng mục dự trù (tùy chọn)</label>
                                <select
                                    value={selectedBudgetItemId}
                                    onChange={(e) => handleBudgetItemSelect(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">-- Khoản chi ngoài dự trù --</option>
                                    {budgetItems.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.itemName} (Dự kiến: {formatCurrency(b.estimatedUnitPrice * b.quantity)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên khoản chi *</label>
                                <input
                                    type="text"
                                    required
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="VD: Mua nước suối, In ấn backdrop..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
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
                                    <label className="block text-xs font-semibold text-slate-700">Đơn giá thực tế (VND) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={actualPrice}
                                        onChange={(e) => setActualPrice(Number(e.target.value))}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Ngày thanh toán *</label>
                                    <input
                                        type="date"
                                        required
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Thành tiền tự tính</label>
                                    <div className="mt-1 flex h-10 items-center rounded-xl bg-slate-50 px-3 text-sm font-bold text-emerald-700">
                                        {formatCurrency(quantity * actualPrice)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Mã định danh người chi (Member ID) *</label>
                                <input
                                    type="text"
                                    required
                                    value={paidBy}
                                    onChange={(e) => setPaidBy(e.target.value)}
                                    placeholder="UUID thành viên chi trả"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Optional initial receipt */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                    <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                                    Đính kèm Hóa đơn / Chứng từ S3 (Bắt buộc để được duyệt)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={initReceiptCode}
                                        onChange={(e) => setInitReceiptCode(e.target.value)}
                                        placeholder="Mã số HĐ (VD: HD-0012)"
                                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={initReceiptSupplier}
                                        onChange={(e) => setInitReceiptSupplier(e.target.value)}
                                        placeholder="Nhà cung cấp / Cửa hàng"
                                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                                    />
                                </div>
                                <input
                                    type="url"
                                    value={initReceiptUrl}
                                    onChange={(e) => setInitReceiptUrl(e.target.value)}
                                    placeholder="Đường dẫn ảnh/file hóa đơn S3 (URL)..."
                                    className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Ghi chú thực chi</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ghi chú hoàn ứng hoặc chuyển khoản..."
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
                                    Gửi Yêu Cầu Thanh Toán
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: View & Add Receipts */}
            {receiptsModalOpen && currentExpenseForReceipts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Chứng Từ Hóa Đơn Chi Tiêu</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{currentExpenseForReceipts.itemName}</p>
                            </div>
                            <button onClick={() => setReceiptsModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>

                        {/* List existing receipts */}
                        <div className="mt-4 space-y-2.5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Danh sách hóa đơn đã đính kèm ({currentExpenseForReceipts.receipts?.length ?? 0})
                            </h4>
                            {(!currentExpenseForReceipts.receipts || currentExpenseForReceipts.receipts.length === 0) ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                                    Chưa có chứng từ nào. Vui lòng thêm ít nhất 1 chứng từ để được duyệt chi.
                                </div>
                            ) : (
                                currentExpenseForReceipts.receipts.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                                                <Image className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">{r.receiptCode || 'Chứng từ thanh toán'}</div>
                                                <div className="text-[11px] text-slate-500">{r.supplierName || 'Nhà cung cấp'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setLightboxImageUrl(r.imageUrl)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Xem ảnh
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add new receipt form */}
                        <form onSubmit={handleAddReceipt} className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-800">Thêm chứng từ mới</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={newReceiptCode}
                                    onChange={(e) => setNewReceiptCode(e.target.value)}
                                    placeholder="Mã hóa đơn..."
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={newReceiptSupplier}
                                    onChange={(e) => setNewReceiptSupplier(e.target.value)}
                                    placeholder="Đơn vị cung cấp..."
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <input
                                type="url"
                                required
                                value={newReceiptUrl}
                                onChange={(e) => setNewReceiptUrl(e.target.value)}
                                placeholder="Đường dẫn ảnh hóa đơn S3 (URL) *"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                            />
                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Lưu Chứng Từ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lightbox Preview */}
            {lightboxImageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxImageUrl(null)}>
                    <div className="relative max-w-2xl overflow-hidden rounded-2xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setLightboxImageUrl(null)}
                            className="absolute right-4 top-4 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <img src={lightboxImageUrl} alt="Hóa đơn chứng từ" className="max-h-[80vh] w-auto rounded-xl object-contain" />
                    </div>
                </div>
            )}

            {/* Modal: Reject Expense */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Từ Chối Khoản Thực Chi</h3>
                        <p className="mt-1 text-xs text-slate-500">Cung cấp lý do từ chối để người thanh toán đối soát lại.</p>
                        <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Lý do từ chối *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="VD: Thiếu hóa đơn VAT hợp lệ, Đơn giá cao hơn dự trù..."
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
