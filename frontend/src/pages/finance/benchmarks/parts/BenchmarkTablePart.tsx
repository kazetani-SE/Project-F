import React from 'react';
import { BenchmarkTableRow } from '../components/BenchmarkTableRow';
import type { ItemPriceBenchmark, BudgetCategory } from '../../../../types/models/finance';

interface BenchmarkTablePartProps {
    benchmarks: ItemPriceBenchmark[];
    categories: BudgetCategory[];
    onEdit: (benchmark: ItemPriceBenchmark) => void;
    onDelete: (id: string) => void;
}

export const BenchmarkTablePart: React.FC<BenchmarkTablePartProps> = ({
    benchmarks,
    categories,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="px-5 py-3.5">Tên Hạng Mục / Vật Tư</th>
                        <th className="px-4 py-3.5">Danh Mục</th>
                        <th className="px-4 py-3.5">Đơn Vị</th>
                        <th className="px-4 py-3.5">Đơn Giá Thị Trường</th>
                        <th className="px-4 py-3.5">Nhà Cung Cấp Tham Chiếu</th>
                        <th className="px-4 py-3.5 text-right">Thao Tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {benchmarks.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                Không tìm thấy vật tư chuẩn nào phù hợp.
                            </td>
                        </tr>
                    ) : (
                        benchmarks.map((b) => (
                            <BenchmarkTableRow
                                key={b.id}
                                benchmark={b}
                                categories={categories}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

