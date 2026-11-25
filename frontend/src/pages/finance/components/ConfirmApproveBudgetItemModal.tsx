import React from 'react';
import { CheckCircle2, RefreshCw, X, Layers, DollarSign, ExternalLink } from 'lucide-react';
import { formatVND } from './CurrencyText';
import type { BudgetItem, BudgetCategory } from '../../../types/models/finance';

interface ConfirmApproveBudgetItemModalProps {
    isOpen: boolean;
    item: BudgetItem | null;
    categories: BudgetCategory[];
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

export const ConfirmApproveBudgetItemModal: React.FC<ConfirmApproveBudgetItemModalProps> = ({
    isOpen,
    item,
    categories,
    isLoading = false,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !item) return null;

    const unitPrice = item.estUnitPrice ?? item.estimatedUnitPrice ?? 0;
    const totalAmount = item.totalEstAmount ?? item.totalEstimatedAmount ?? (item.quantity * unitPrice);
    const categoryName = categories.find((c) => c.id === item.categoryId)?.name ?? 'Khác';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Xác Nhận Duyệt Dự Trù</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Kiểm tra thông tin kinh phí dự kiến</p>
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

                {/* Details Card */}
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-slate-500">Tên hạng mục:</span>
                        <span className="text-xs font-bold text-slate-900 text-right max-w-[220px] truncate">
                            {item.itemName}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Layers className="h-3 w-3 text-slate-400" />
                            Danh mục:
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                            {categoryName}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Số lượng & Đơn giá:</span>
                        <span className="text-xs font-semibold text-slate-800">
                            {item.quantity} {item.unit} &times; {formatVND(unitPrice)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-slate-400" />
                            Thành tiền dự kiến:
                        </span>
                        <span className="text-sm font-extrabold text-emerald-700">
                            {formatVND(totalAmount)}
                        </span>
                    </div>

                    {item.benchmark?.supplierName && (
                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                            <span className="text-slate-500">Nơi mua (Benchmark):</span>
                            {item.benchmark.supplierLink ? (
                                <a
                                    href={item.benchmark.supplierLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-emerald-600 hover:underline inline-flex items-center gap-1 max-w-[180px] truncate"
                                >
                                    {item.benchmark.supplierName}
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                            ) : (
                                <span className="font-medium text-slate-700">{item.benchmark.supplierName}</span>
                            )}
                        </div>
                    )}
                </div>

                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                    Bạn đã kiểm tra kỹ số lượng và đơn giá của hạng mục này chưa? Sau khi phê duyệt, hạng mục sẽ chính thức nằm trong ngân sách dự toán được duyệt của mùa sự kiện.
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
