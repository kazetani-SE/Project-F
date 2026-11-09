import React from 'react';
import { formatVND } from '../../components/CurrencyText';

interface KpiCardProps {
    title: string;
    amount: number;
    icon: React.ReactNode;
    iconBgClass: string;
    iconTextClass: string;
    subtext: string;
    amountClassName?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
    title,
    amount,
    icon,
    iconBgClass,
    iconTextClass,
    subtext,
    amountClassName = 'text-slate-900',
}) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
                <div className={`rounded-xl p-2.5 ${iconBgClass} ${iconTextClass}`}>
                    {icon}
                </div>
            </div>
            <div className="mt-4">
                <div className={`text-2xl font-bold ${amountClassName}`}>
                    {formatVND(amount)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{subtext}</p>
            </div>
        </div>
    );
};
