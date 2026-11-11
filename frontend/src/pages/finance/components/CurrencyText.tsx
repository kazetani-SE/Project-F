import React from 'react';

export function formatVND(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);
}

interface CurrencyTextProps {
    amount: number | null | undefined;
    className?: string;
}

export const CurrencyText: React.FC<CurrencyTextProps> = ({ amount, className = '' }) => {
    return <span className={className}>{formatVND(amount)}</span>;
};

