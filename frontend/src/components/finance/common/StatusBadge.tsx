import React from 'react';
import { CheckCircle, Clock, XCircle, FileEdit } from 'lucide-react';
import type { ApprovalStatus } from '../../../types/models/finance';

interface StatusBadgeProps {
    status: ApprovalStatus;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
    switch (status) {
        case 'APPROVED':
            return (
                <span className={`inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ${className}`}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Đã duyệt
                </span>
            );
        case 'REJECTED':
            return (
                <span className={`inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ${className}`}>
                    <XCircle className="h-3.5 w-3.5" />
                    Từ chối
                </span>
            );
        case 'PENDING':
            return (
                <span className={`inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ${className}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Chờ duyệt
                </span>
            );
        case 'DRAFT':
        default:
            return (
                <span className={`inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ${className}`}>
                    <FileEdit className="h-3.5 w-3.5" />
                    Bản nháp
                </span>
            );
    }
};

