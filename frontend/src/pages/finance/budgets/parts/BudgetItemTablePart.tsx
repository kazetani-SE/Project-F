import React from 'react';
import { BudgetItemTableRow } from '../components/BudgetItemTableRow';
import type { BudgetItem, BudgetCategory } from '../../../../types/models/finance';

interface BudgetItemTablePartProps {
    items: BudgetItem[];
    categories: BudgetCategory[];
    onApprove: (item: BudgetItem) => void;
    onReject: (item: BudgetItem) => void;
    onDelete: (id: string) => void;
}

export const BudgetItemTablePart: React.FC<BudgetItemTablePartProps> = ({
    items,
    categories,
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
                    {items.length === 0 ? (
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

