import React from 'react';
import { formatVND } from '../../components/CurrencyText';
import type { ProjectedBudgetItem } from '../../../../types/models/finance';

interface ProjectedPreviewRowProps {
    item: ProjectedBudgetItem;
}

export const ProjectedPreviewRow: React.FC<ProjectedPreviewRowProps> = ({ item }) => {
    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-2.5 font-semibold text-slate-800">{item.itemName}</td>
            <td className="px-3 py-2.5 text-center text-slate-600">
                {item.baseQuantityForProjection} {item.unit}
            </td>
            <td className="px-3 py-2.5 text-right text-slate-500">
                {formatVND(item.previousUnitPrice)}
            </td>
            <td className="px-3 py-2.5 text-right font-medium text-purple-700">
                {formatVND(item.currentAdjustedUnitPrice)}
            </td>
            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                {formatVND(item.projectedCurrentCost)}
            </td>
        </tr>
    );
};

