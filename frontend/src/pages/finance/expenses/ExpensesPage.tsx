import { useState } from 'react';
import { Plus, RefreshCw, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useExpenses } from '../hooks/useExpenses';
import { ExpenseSummaryPart } from './parts/ExpenseSummaryPart';
import { ExpenseFilterPart } from './parts/ExpenseFilterPart';
import { ExpenseTablePart } from './parts/ExpenseTablePart';
import { CreateExpenseModalPart } from './parts/CreateExpenseModalPart';
import { ReceiptsModalPart } from './parts/ReceiptsModalPart';
import { ReceiptLightboxPart } from './parts/ReceiptLightboxPart';
import { RejectReasonModal } from '../components/RejectReasonModal';
import type { Expense } from '../../../types/models/finance';

export default function ExpensesPage() {
    const { currentEvent, currentEventId } = useActiveEvent();

    const {
        expenses,
        budgetItems,
        filteredExpenses,
        totalSpentSum,
        loading,
        statusFilter,
        setStatusFilter,
        notification,
        setNotification,
        reloadData,
        createExpense,
        approveExpense,
        rejectExpense,
        deleteExpense,
        addReceipt,
    } = useExpenses(currentEventId ?? undefined);

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);
    const [currentExpenseForReceipts, setCurrentExpenseForReceipts] = useState<Expense | null>(null);
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetRejectExpense, setTargetRejectExpense] = useState<Expense | null>(null);

    const handleOpenReceiptsModal = (exp: Expense) => {
        setCurrentExpenseForReceipts(exp);
        setReceiptsModalOpen(true);
    };

    const handleOpenRejectModal = (exp: Expense) => {
        setTargetRejectExpense(exp);
        setRejectModalOpen(true);
    };

    if (!currentEventId || !currentEvent) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-lg font-bold text-slate-800">Chưa chọn Mùa sự kiện</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Vui lòng chọn Mùa sự kiện ở thanh menu trước khi quản lý chi tiêu.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Layout */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Thực Chi & Duyệt Chi Kèm Hóa Đơn
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý chi tiêu thực tế (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">expenses</code>) và chứng từ hóa đơn (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">expense_receipts</code> S3 tối đa 15MB)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={reloadData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm Khoản Chi Mới
                    </button>
                </div>
            </div>

            {/* Notification alert */}
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

            {/* Summary Part */}
            <ExpenseSummaryPart
                totalSpentSum={totalSpentSum}
                expenses={expenses}
            />

            {/* Filter Part */}
            <ExpenseFilterPart
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
            />

            {/* Table Part */}
            <ExpenseTablePart
                expenses={filteredExpenses}
                budgetItems={budgetItems}
                onOpenReceipts={handleOpenReceiptsModal}
                onApprove={approveExpense}
                onReject={handleOpenRejectModal}
                onDelete={deleteExpense}
            />

            {/* Modals */}
            <CreateExpenseModalPart
                isOpen={createModalOpen}
                budgetItems={budgetItems}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={createExpense}
            />

            <ReceiptsModalPart
                isOpen={receiptsModalOpen}
                expense={currentExpenseForReceipts}
                onClose={() => setReceiptsModalOpen(false)}
                onAddReceipt={async (expId, data) => {
                    await addReceipt(expId, data);
                    // update local state for current expense in modal
                    setCurrentExpenseForReceipts(prev => prev ? {
                        ...prev,
                        receipts: [...(prev.receipts ?? []), { id: 'rc_' + Date.now(), expenseId: expId, ...data }]
                    } : null);
                }}
                onViewImage={(url) => setLightboxImageUrl(url)}
            />

            <ReceiptLightboxPart
                imageUrl={lightboxImageUrl}
                onClose={() => setLightboxImageUrl(null)}
            />

            <RejectReasonModal
                isOpen={rejectModalOpen}
                title="Từ Chối Khoản Thực Chi"
                itemDescription={targetRejectExpense?.itemName ? `Khoản chi: ${targetRejectExpense.itemName}` : undefined}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={async (reason) => {
                    if (targetRejectExpense) {
                        await rejectExpense(targetRejectExpense.id, reason);
                        setRejectModalOpen(false);
                    }
                }}
            />
        </div>
    );
}
