import React from 'react';
import { RefreshCw } from 'lucide-react';
import { BudgetItemTableRow } from '../components/BudgetItemTableRow';
import type { BudgetItem, BudgetCategory } from '../../../../types/models/finance';

interface BudgetItemTablePartProps {
    items: BudgetItem[];
    categories: BudgetCategory[];
    loading?: boolean;
    onViewDetail: (item: BudgetItem) => void;
    onApprove: (item: BudgetItem) => void;
    onReject: (item: BudgetItem) => void;
    onDelete: (item: BudgetItem) => void;
}

export const BudgetItemTablePart: React.FC<BudgetItemTablePartProps> = ({
    items,
    categories,
    loading = false,
    onViewDetail,
    onApprove,
    onReject,
    onDelete,
}) => {
    return (
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
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="px-5 py-12 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                                    <span className="text-sm font-medium">Đang tải dự trù ngân sách...</span>
                                </div>
                            </td>
                        </tr>
                    ) : items.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                Không có hạng mục dự trù nào.
                            </td>
                        </tr>
                    ) : (
                        items.map((item) => (
                            <BudgetItemTableRow
                                key={item.id}
                                item={item}
                                categories={categories}
                                onViewDetail={onViewDetail}
                                onApprove={onApprove}
                                onReject={onReject}
                                onDelete={onDelete}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
