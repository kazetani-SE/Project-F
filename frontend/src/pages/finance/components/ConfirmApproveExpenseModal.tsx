import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, X, Receipt, Calendar, DollarSign } from 'lucide-react';
import { formatVND } from './CurrencyText';
import type { Expense } from '../../../types/models/finance';

interface ConfirmApproveExpenseModalProps {
    isOpen: boolean;
    expense: Expense | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

export const ConfirmApproveExpenseModal: React.FC<ConfirmApproveExpenseModalProps> = ({
    isOpen,
    expense,
    isLoading = false,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !expense) return null;

    const totalAmount = expense.totalAmount ?? (expense.quantity * expense.actualUnitPrice);
    const receiptCount = expense.receipts?.length ?? 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Xác Nhận Duyệt Khoản Chi</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Kiểm tra thông tin chi tiêu thực tế</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Expense Details Card */}
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-slate-500">Tên khoản chi:</span>
                        <span className="text-xs font-bold text-slate-900 text-right max-w-[220px] truncate">
                            {expense.itemName}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-slate-400" />
                            Tổng số tiền:
                        </span>
                        <span className="text-sm font-extrabold text-emerald-700">
                            {formatVND(totalAmount)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Ngày thanh toán:
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                            {expense.paymentDate}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Receipt className="h-3 w-3 text-slate-400" />
                            Chứng từ hóa đơn:
                        </span>
                        <span className={`text-xs font-semibold ${receiptCount > 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                            {receiptCount > 0 ? `${receiptCount} tệp đính kèm` : 'Chưa có chứng từ!'}
                        </span>
                    </div>
                </div>

                {/* Warning if no receipts */}
                {receiptCount === 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>Khoản chi này chưa có hóa đơn chứng từ. Bạn nên kiểm tra kỹ trước khi quyết định duyệt.</span>
                    </div>
                )}

                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                    Bạn đã kiểm tra kỹ chứng từ hóa đơn và thông tin thanh toán của khoản chi này chưa? Sau khi phê duyệt, khoản tiền này sẽ chính thức ghi nhận vào thực chi ngân sách sự kiện.
                </p>

                <div className="mt-6 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {isLoading ? 'Đang duyệt...' : 'Xác Nhận Duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
};
