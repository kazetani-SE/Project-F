import React, { useEffect, useState } from 'react';
import { X, RefreshCw, AlertCircle, ExternalLink, Calendar, CheckCircle2, XCircle, Tag, Layers, DollarSign } from 'lucide-react';
import { financeService } from '../../../../services/financeService';
import { formatVND } from '../../components/CurrencyText';
import { StatusBadge } from '../../components/StatusBadge';
import type { BudgetItem, BudgetCategory } from '../../../../types/models/finance';

interface BudgetItemDetailModalPartProps {
    isOpen: boolean;
    itemId: string | null;
    eventId: string;
    categories: BudgetCategory[];
    onClose: () => void;
    onApprove?: (item: BudgetItem) => void;
    onReject?: (item: BudgetItem) => void;
}

export const BudgetItemDetailModalPart: React.FC<BudgetItemDetailModalPartProps> = ({
    isOpen,
    itemId,
    eventId,
    categories,
    onClose,
    onApprove,
    onReject,
}) => {
    const [item, setItem] = useState<BudgetItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !itemId || !eventId) {
            setItem(null);
            setError(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        financeService.getBudgetItemById(eventId, itemId)
            .then((data) => {
                if (isMounted) {
                    setItem(data);
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const errorObj = err as { message?: string };
                    setError(errorObj?.message || 'Không thể tải chi tiết hạng mục dự trù.');
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
    }, [isOpen, itemId, eventId]);

    if (!isOpen) return null;

    const categoryName = categories.find((c) => c.id === item?.categoryId)?.name ?? 'Chưa phân loại';
    const unitPrice = item ? (item.estUnitPrice ?? item.estimatedUnitPrice ?? 0) : 0;
    const totalAmount = item ? (item.totalEstAmount ?? item.totalEstimatedAmount ?? (item.quantity * unitPrice)) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <Layers className="h-3.5 w-3.5" />
                                Chi Tiết Dự Trù Ngân Sách
                            </span>
                            {item && <StatusBadge status={item.approvalStatus} />}
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                            {item?.itemName || 'Đang tải thông tin...'}
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
                        <p className="text-sm font-medium">Đang tải chi tiết hạng mục...</p>
                    </div>
                ) : error ? (
                    <div className="my-8 rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
                        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
                        <p className="text-sm font-semibold text-rose-800">{error}</p>
                    </div>
                ) : item ? (
                    <div className="mt-5 space-y-6">
                        {/* Status alert if rejected */}
                        {item.approvalStatus === 'REJECTED' && item.rejectionReason && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                                <span className="font-semibold">Lý do từ chối:</span> {item.rejectionReason}
                            </div>
                        )}

                        {/* General stats cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Số lượng</span>
                                <p className="mt-1 text-base font-bold text-slate-800">
                                    {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Đơn giá dự kiến</span>
                                <p className="mt-1 text-base font-bold text-slate-800">{formatVND(unitPrice)}</p>
                            </div>
                            <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100 col-span-2">
                                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Thành tiền (STORED)
                                </span>
                                <p className="mt-1 text-lg font-extrabold text-emerald-700">{formatVND(totalAmount)}</p>
                            </div>
                        </div>

                        {/* Category & Attributes */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thông tin phân loại & sự kiện</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400">Danh mục kinh phí:</span>
                                    <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800">
                                        <Tag className="h-3.5 w-3.5 text-slate-400" />
                                        {categoryName}
                                    </div>
                                </div>
                                {item.createdAt && (
                                    <div>
                                        <span className="text-slate-400">Ngày tạo đề xuất:</span>
                                        <div className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-700">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Benchmark & Supplier Information */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Nơi mua & Định mức giá thị trường (Benchmark)
                            </h4>
                            {item.benchmark?.supplierName ? (
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Nhà cung cấp / Nơi bán:</span>
                                        {item.benchmark.supplierLink ? (
                                            <a
                                                href={item.benchmark.supplierLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 underline"
                                            >
                                                {item.benchmark.supplierName}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-slate-800">{item.benchmark.supplierName}</span>
                                        )}
                                    </div>
                                    {item.benchmark.supplierLink && (
                                        <div className="flex items-start justify-between">
                                            <span className="text-slate-400">Đường dẫn tham khảo:</span>
                                            <a
                                                href={item.benchmark.supplierLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="max-w-xs truncate text-blue-600 hover:underline"
                                            >
                                                {item.benchmark.supplierLink}
                                            </a>
                                        </div>
                                    )}
                                    {item.benchmark.lastUpdatedAt && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Cập nhật giá lần cuối:</span>
                                            <span className="text-slate-600">
                                                {new Date(item.benchmark.lastUpdatedAt).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    Hạng mục này được nhập trực tiếp, không liên kết với bảng định mức thị trường.
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="rounded-xl border border-slate-100 p-4 space-y-1.5 bg-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú dự trù</h4>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {item.notes || 'Không có ghi chú thêm.'}
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

                    {item && item.approvalStatus !== 'APPROVED' && (
                        <div className="flex items-center gap-2">
                            {onReject && item.approvalStatus !== 'REJECTED' && (
                                <button
                                    onClick={() => {
                                        onReject(item);
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
                                        onApprove(item);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
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
