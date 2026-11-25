import React, { useEffect, useState } from 'react';
import { X, RefreshCw, AlertCircle, Calendar, CheckCircle2, XCircle, Receipt, ArrowRight, DollarSign } from 'lucide-react';
import { financeService } from '../../../../services/financeService';
import { formatVND } from '../../components/CurrencyText';
import { StatusBadge } from '../../components/StatusBadge';
import { ReceiptThumbnailItem } from '../components/ReceiptThumbnailItem';
import type { Expense, ExpenseReceipt } from '../../../../types/models/finance';

interface ExpenseDetailModalPartProps {
    isOpen: boolean;
    expenseId: string | null;
    eventId: string;
    onClose: () => void;
    onApprove?: (expense: Expense) => void;
    onReject?: (expense: Expense) => void;
    onDeleteReceipt?: (expenseId: string, receipt: ExpenseReceipt) => void;
}

export const ExpenseDetailModalPart: React.FC<ExpenseDetailModalPartProps> = ({
    isOpen,
    expenseId,
    eventId,
    onClose,
    onApprove,
    onReject,
    onDeleteReceipt,
}) => {
    const [expense, setExpense] = useState<Expense | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !expenseId || !eventId) {
            setExpense(null);
            setError(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        financeService.getExpenseById(eventId, expenseId)
            .then((data) => {
                if (isMounted) {
                    setExpense(data);
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const errorObj = err as { message?: string };
                    setError(errorObj?.message || 'Không thể tải chi tiết khoản chi tiêu.');
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, expenseId, eventId]);

    if (!isOpen) return null;

    const actualTotal = expense
        ? (expense.totalAmount ?? (expense.quantity * expense.actualUnitPrice))
        : 0;

    const linkedBudget = expense?.budgetItem;
    const estTotal = linkedBudget ? (linkedBudget.estTotal ?? (linkedBudget.quantity * linkedBudget.estUnitPrice)) : null;
    const diff = (linkedBudget && estTotal !== null) ? (actualTotal - estTotal) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                <Receipt className="h-3.5 w-3.5" />
                                Chi Tiết Thực Chi & Chứng Từ
                            </span>
                            {expense && <StatusBadge status={expense.status} />}
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                            {expense?.itemName || 'Đang tải thông tin...'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
                        title="Đóng"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                        <p className="text-sm font-medium">Đang tải chi tiết khoản chi...</p>
                    </div>
                ) : error ? (
                    <div className="my-8 rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
                        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
                        <p className="text-sm font-semibold text-rose-800">{error}</p>
                    </div>
                ) : expense ? (
                    <div className="mt-5 space-y-6">
                        {/* Status alert if rejected */}
                        {expense.status === 'REJECTED' && expense.rejectionReason && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                                <span className="font-semibold">Lý do từ chối:</span> {expense.rejectionReason}
                            </div>
                        )}

                        {/* General stats cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Số lượng thực chi</span>
                                <p className="mt-1 text-base font-bold text-slate-800">{expense.quantity}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Đơn giá thực tế</span>
                                <p className="mt-1 text-base font-bold text-slate-800">{formatVND(expense.actualUnitPrice)}</p>
                            </div>
                            <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-100 col-span-2">
                                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Tổng tiền thực chi (STORED)
                                </span>
                                <p className="mt-1 text-lg font-extrabold text-blue-700">{formatVND(actualTotal)}</p>
                            </div>
                        </div>

                        {/* Transaction Attributes */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thông tin giao dịch</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400">Ngày thanh toán:</span>
                                    <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        {expense.paymentDate}
                                    </div>
                                </div>
                                {expense.createdAt && (
                                    <div>
                                        <span className="text-slate-400">Ngày lập phiếu chi:</span>
                                        <div className="mt-0.5 font-medium text-slate-700">
                                            {new Date(expense.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Linked BudgetItem Comparison */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Đối chiếu với Hạng mục dự trù ngân sách
                            </h4>
                            {linkedBudget ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {linkedBudget.itemName}
                                                </span>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    Định mức dự trù: {linkedBudget.quantity} {linkedBudget.unit} &times; {formatVND(linkedBudget.estUnitPrice)} = {formatVND(estTotal ?? 0)}
                                                </div>
                                            </div>
                                            <StatusBadge status={linkedBudget.approvalStatus} />
                                        </div>
                                    </div>

                                    {/* Variance indicator */}
                                    {diff !== null && (
                                        <div className={`rounded-xl p-3 text-xs flex items-center justify-between border ${
                                            diff > 0
                                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}>
                                            <span className="font-medium flex items-center gap-1.5">
                                                <ArrowRight className="h-3.5 w-3.5" />
                                                {diff > 0 ? 'Vượt dự trù ngân sách:' : 'Tiết kiệm so với dự trù:'}
                                            </span>
                                            <span className="font-bold">
                                                {diff > 0 ? `+${formatVND(diff)}` : formatVND(Math.abs(diff))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800">
                                    Khoản chi phát sinh thực tế này không gắn với hạng mục dự trù nào (Chi phí phát sinh ngoài kế hoạch).
                                </div>
                            )}
                        </div>

                        {/* Attached Receipts */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Hóa đơn & Chứng từ đính kèm ({expense.receipts?.length ?? 0})
                                </h4>
                            </div>

                            {(!expense.receipts || expense.receipts.length === 0) ? (
                                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                                    Chưa có chứng từ nào được đính kèm.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {expense.receipts.map((r) => (
                                        <ReceiptThumbnailItem
                                            key={r.id}
                                            receipt={r}
                                            onDelete={
                                                onDeleteReceipt
                                                    ? (rc) => {
                                                          onDeleteReceipt(expense.id, rc);
                                                          setExpense((prev) =>
                                                              prev
                                                                  ? {
                                                                        ...prev,
                                                                        receipts: (prev.receipts ?? []).filter((x) => x.id !== rc.id),
                                                                    }
                                                                  : null
                                                          );
                                                      }
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-1.5 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú chi tiêu</h4>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {expense.notes || 'Không có ghi chú thêm.'}
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Footer Buttons */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Đóng
                    </button>

                    {expense && expense.status !== 'APPROVED' && (
                        <div className="flex items-center gap-2">
                            {onReject && expense.status !== 'REJECTED' && (
                                <button
                                    onClick={() => {
                                        onReject(expense);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Từ chối
                                </button>
                            )}
                            {onApprove && (
                                <button
                                    onClick={() => {
                                        onApprove(expense);
                                    }}
                                    disabled={!expense.receipts || expense.receipts.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={(!expense.receipts || expense.receipts.length === 0) ? 'Cần ít nhất 1 chứng từ để duyệt' : undefined}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Phê duyệt
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
