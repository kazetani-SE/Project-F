import React from 'react';
import { ExpenseTableRow } from '../components/ExpenseTableRow';
import type { Expense, BudgetItem } from '../../../../types/models/finance';

interface ExpenseTablePartProps {
    expenses: Expense[];
    budgetItems: BudgetItem[];
    onOpenReceipts: (exp: Expense) => void;
    onApprove: (exp: Expense) => void;
    onReject: (exp: Expense) => void;
    onDelete: (id: string) => void;
}

export const ExpenseTablePart: React.FC<ExpenseTablePartProps> = ({
    expenses,
    budgetItems,
    onOpenReceipts,
    onApprove,
    onReject,
    onDelete,
}) => {
    return (
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
                    {expenses.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                Không có khoản chi tiêu nào.
                            </td>
                        </tr>
                    ) : (
                        expenses.map((exp) => (
                            <ExpenseTableRow
                                key={exp.id}
                                expense={exp}
                                budgetItems={budgetItems}
                                onOpenReceipts={onOpenReceipts}
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

