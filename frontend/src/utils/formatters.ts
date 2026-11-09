const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatCurrency(value: number) {
    return currency.format(value);
}

export function formatDate(date: string | null) {
    return date?.split('-').reverse().join('/') ?? '—';
}
