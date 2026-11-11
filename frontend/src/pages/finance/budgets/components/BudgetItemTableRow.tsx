import React from 'react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import { StatusBadge } from '../../components/StatusBadge';
import type { BudgetItem, BudgetCategory } from '../../../../types/models/finance';

interface BudgetItemTableRowProps {
    item: BudgetItem;
    categories: BudgetCategory[];
    onApprove: (item: BudgetItem) => void;
    onReject: (item: BudgetItem) => void;
    onDelete: (id: string) => void;
}

export const BudgetItemTableRow: React.FC<BudgetItemTableRowProps> = ({
    item,
    categories,
    onApprove,
    onReject,
    onDelete,
}) => {
    const total = item.totalEstimatedAmount ?? (item.quantity * item.estimatedUnitPrice);
    const categoryName = categories.find(c => c.id === item.categoryId)?.name ?? 'Khác';

    return (
        <tr className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-3.5">
                <div className="font-semibold text-slate-900">{item.itemName}</div>
                <div className="text-xs text-slate-400">{categoryName}</div>
            </td>
            <td className="px-4 py-3.5 text-slate-700">
                {item.quantity} {item.unit}
            </td>
            <td className="px-4 py-3.5 text-slate-600">
                {formatVND(item.estimatedUnitPrice)}
            </td>
            <td className="px-4 py-3.5 font-bold text-slate-900">
                {formatVND(total)}
            </td>
            <td className="px-4 py-3.5">
                <StatusBadge status={item.approvalStatus} />
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
                            onClick={() => onApprove(item)}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                            title="Phê duyệt"
                        >
                            <CheckCircle className="h-4 w-4" />
                        </button>
                    )}
                    {item.approvalStatus !== 'REJECTED' && (
                        <button
                            onClick={() => onReject(item)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            title="Từ chối"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(item.id)}
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

