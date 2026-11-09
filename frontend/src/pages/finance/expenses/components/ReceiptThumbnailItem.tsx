import React from 'react';
import { Image, Eye } from 'lucide-react';
import type { ExpenseReceipt } from '../../../../types/models/finance';

interface ReceiptThumbnailItemProps {
    receipt: ExpenseReceipt;
    onViewImage: (url: string) => void;
}

export const ReceiptThumbnailItem: React.FC<ReceiptThumbnailItemProps> = ({
    receipt,
    onViewImage,
}) => {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                    <Image className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{receipt.receiptCode || 'Chứng từ thanh toán'}</div>
                    <div className="text-[11px] text-slate-500">{receipt.supplierName || 'Nhà cung cấp'}</div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onViewImage(receipt.imageUrl)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                    <Eye className="h-3.5 w-3.5" />
                    Xem ảnh
                </button>
            </div>
        </div>
    );
};

