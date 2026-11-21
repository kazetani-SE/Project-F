import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Image, FileText, Eye, Trash2, Loader2, X, ExternalLink } from 'lucide-react';
import { getPresignedDownloadUrl } from '../../../../services/storageService';
import type { ExpenseReceipt } from '../../../../types/models/finance';

interface ReceiptThumbnailItemProps {
    receipt: ExpenseReceipt;
    onDelete?: (receipt: ExpenseReceipt) => void;
}

type FileKind = 'pdf' | 'image' | 'other';

const getCleanPath = (url: string): string => {
    const path = url.split('?')[0];
    try {
        return decodeURIComponent(path).toLowerCase();
    } catch {
        return path.toLowerCase();
    }
};

const getFileKind = (url: string): FileKind => {
    const cleanPath = getCleanPath(url);
    if (/\.pdf$/i.test(cleanPath)) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(cleanPath)) return 'image';
    return 'other';
};

export const ReceiptThumbnailItem: React.FC<ReceiptThumbnailItemProps> = ({ receipt, onDelete }) => {
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [viewError, setViewError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null); // presigned URL, chỉ sống khi dialog mở

    const fileKind = getFileKind(receipt.imageUrl);

    const handleView = async () => {
        setViewError(null);
        setIsLoadingUrl(true);
        try {
            const { downloadUrl } = await getPresignedDownloadUrl(receipt.imageUrl);
            setPreviewUrl(downloadUrl);
        } catch {
            setViewError('Không thể mở tệp. Vui lòng thử lại.');
        } finally {
            setIsLoadingUrl(false);
        }
    };

    const closePreview = () => setPreviewUrl(null);

    const actionLabel = fileKind === 'image' ? 'Xem ảnh' : 'Xem tệp';

    return (
        <>
            <div className="rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {fileKind === 'image' ? (
                                <Image className="h-5 w-5 text-slate-400" />
                            ) : (
                                <FileText className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-800">
                                {receipt.receiptCode || 'Chứng từ thanh toán'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                {receipt.supplierName || 'Nhà cung cấp'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleView}
                            disabled={isLoadingUrl}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                            {isLoadingUrl ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Eye className="h-3.5 w-3.5" />
                            )}
                            {actionLabel}
                        </button>
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(receipt)}
                                disabled={isLoadingUrl}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                title="Xóa hóa đơn chứng từ"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {viewError && <p className="mt-2 text-[11px] text-rose-600">{viewError}</p>}
            </div>

            {previewUrl &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
                        onClick={closePreview}
                        onKeyDown={(e) => e.key === 'Escape' && closePreview()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-bold text-slate-900">
                                        {receipt.receiptCode || 'Chứng từ thanh toán'}
                                    </h3>
                                    <p className="truncate text-xs text-slate-500">
                                        {receipt.supplierName || 'Nhà cung cấp'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Mở tab mới
                                    </a>
                                    <button
                                        type="button"
                                        onClick={closePreview}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                                        title="Đóng"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 bg-slate-100">
                                {fileKind === 'pdf' && (
                                    <iframe
                                        src={previewUrl}
                                        title="Xem chứng từ"
                                        className="h-full w-full"
                                    />
                                )}

                                {fileKind === 'image' && (
                                    <div className="flex h-full items-center justify-center overflow-auto p-4">
                                        <img
                                            src={previewUrl}
                                            alt="Chứng từ"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                )}

                                {fileKind === 'other' && (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-800">
                                                Tệp này không hỗ trợ xem trực tiếp trong khung xem trước
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Bạn có thể mở ở tab mới hoặc tải tệp về máy để xem.
                                            </p>
                                        </div>
                                        <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Mở tab mới / Tải tệp
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};