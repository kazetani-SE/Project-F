import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

interface QuickNavLinkCardProps {
    to: string;
    icon: React.ReactNode;
    iconBgClass: string;
    iconTextClass: string;
    title: string;
    description: string;
}

export const QuickNavLinkCard: React.FC<QuickNavLinkCardProps> = ({
    to,
    icon,
    iconBgClass,
    iconTextClass,
    title,
    description,
}) => {
    return (
        <Link
            to={to}
            className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${iconBgClass} ${iconTextClass} transition-colors`}>
                    {icon}
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{title}</div>
                    <div className="text-[11px] text-slate-500">{description}</div>
                </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </Link>
    );
};

