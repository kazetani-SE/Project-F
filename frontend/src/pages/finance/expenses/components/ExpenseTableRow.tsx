import React from 'react';
import { Paperclip, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import { StatusBadge } from '../../components/StatusBadge';
import type { Expense, BudgetItem } from '../../../../types/models/finance';

interface ExpenseTableRowProps {
    expense: Expense;
    budgetItems: BudgetItem[];
    onOpenReceipts: (exp: Expense) => void;
    onApprove: (exp: Expense) => void;
    onReject: (exp: Expense) => void;
    onDelete: (id: string) => void;
}

export const ExpenseTableRow: React.FC<ExpenseTableRowProps> = ({
    expense,
    budgetItems,
    onOpenReceipts,
    onApprove,
    onReject,
    onDelete,
}) => {
    const total = expense.totalAmount ?? (expense.quantity * expense.actualUnitPrice);
    const receiptCount = expense.receipts?.length ?? 0;
    const matchedBudgetItem = budgetItems.find(b => b.id === expense.budgetItemId);

    return (
        <tr className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-3.5">
                <div className="font-semibold text-slate-900">{expense.itemName}</div>
                {expense.budgetItemId && (
                    <div className="text-[11px] text-slate-400">
                        Khớp dự trù: {matchedBudgetItem?.itemName ?? expense.budgetItemId}
                    </div>
                )}
            </td>
            <td className="px-4 py-3.5 text-slate-700">
                {expense.quantity} &times; {formatVND(expense.actualUnitPrice)}
            </td>
            <td className="px-4 py-3.5 font-bold text-slate-900">
                {formatVND(total)}
            </td>
            <td className="px-4 py-3.5 text-slate-600">{expense.paymentDate}</td>
            <td className="px-4 py-3.5">
                <button
                    onClick={() => onOpenReceipts(expense)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        receiptCount > 0
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{receiptCount > 0 ? `${receiptCount} chứng từ` : 'Chưa có hóa đơn!'}</span>
                </button>
            </td>
            <td className="px-4 py-3.5">
                <StatusBadge status={expense.status} />
                {expense.rejectionReason && (
                    <div className="mt-1 text-[11px] text-rose-600 italic">
                        Lý do: {expense.rejectionReason}
                    </div>
                )}
            </td>
            <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    {expense.status !== 'APPROVED' && (
                        <button
                            onClick={() => onApprove(expense)}
                            className={`rounded-lg p-1.5 ${
                                receiptCount === 0
                                    ? 'text-slate-300 hover:text-slate-400 cursor-not-allowed'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={receiptCount === 0 ? 'Phải có ít nhất 1 chứng từ để duyệt' : 'Phê duyệt'}
                        >
                            <CheckCircle className="h-4 w-4" />
                        </button>
                    )}
                    {expense.status !== 'REJECTED' && (
                        <button
                            onClick={() => onReject(expense)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            title="Từ chối"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(expense.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Xóa"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

