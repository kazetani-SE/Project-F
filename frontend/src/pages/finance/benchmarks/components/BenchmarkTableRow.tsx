import React from 'react';
import { Building2, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import type { ItemPriceBenchmark, BudgetCategory } from '../../../../types/models/finance';

interface BenchmarkTableRowProps {
    benchmark: ItemPriceBenchmark;
    categories: BudgetCategory[];
    onEdit: (item: ItemPriceBenchmark) => void;
    onDelete: (benchmark: ItemPriceBenchmark) => void;
}

export const BenchmarkTableRow: React.FC<BenchmarkTableRowProps> = ({
    benchmark,
    categories,
    onEdit,
    onDelete,
}) => {
    const categoryName = categories.find(c => c.id === benchmark.categoryId)?.name ?? 'Khác';
    const price = benchmark.curMarketPrice ?? benchmark.currentMarketPrice ?? 0;
    const supplier = benchmark.supplierName || benchmark.supplierReference || '—';

    return (
        <tr className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-3.5 font-semibold text-slate-900">
                {benchmark.itemName}
            </td>
            <td className="px-4 py-3.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {categoryName}
                </span>
            </td>
            <td className="px-4 py-3.5 text-slate-600">{benchmark.unit}</td>
            <td className="px-4 py-3.5 font-bold text-emerald-700">
                {formatVND(price)}
            </td>
            <td className="px-4 py-3.5 text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {benchmark.supplierLink ? (
                        <a
                            href={benchmark.supplierLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline max-w-[200px] truncate"
                        >
                            <span>{supplier}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                    ) : (
                        <span className="max-w-[200px] truncate">{supplier}</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(benchmark)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Sửa"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(benchmark)}
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
