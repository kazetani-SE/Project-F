import React, { useState, useMemo } from 'react';
import { X, Plus, RefreshCw, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { ReceiptThumbnailItem } from '../components/ReceiptThumbnailItem';
import { FileUploader } from '../../../../components/common/FileUploader';
import { useS3Upload } from '../../../../hooks/useS3Upload';
import { useBillScan } from '../../hooks/useBillScan';
import { validateUploadFile } from '../../../../services/uploadWorkflow';
import type { Expense, CreateReceiptRequest, ExpenseReceipt } from '../../../../types/models/finance';

interface ReceiptsModalPartProps {
    isOpen: boolean;
    expense: Expense | null;
    eventId?: string;
    isSubmitting?: boolean;
    onClose: () => void;
    onAddReceipt: (expenseId: string, data: CreateReceiptRequest) => Promise<void>;
    onDeleteReceipt?: (receipt: ExpenseReceipt) => void;
}

export const ReceiptsModalPart: React.FC<ReceiptsModalPartProps> = ({
    isOpen,
    expense,
    eventId,
    isSubmitting = false,
    onClose,
    onAddReceipt,
    onDeleteReceipt,
}) => {
    const [receiptCode, setReceiptCode] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [scanSuccess, setScanSuccess] = useState(false);
    const { isUploading, progress, error: uploadError, uploadFile, reset: resetUpload } = useS3Upload();
    const { isScanning, scan, error: scanError, reset: resetScan } = useBillScan(eventId || expense?.eventId || '');

    const canScan = useMemo(() => {
        if (!receiptFile) return false;
        try {
            validateUploadFile(receiptFile, 'RECEIPT');
            return true;
        } catch {
            return false;
        }
    }, [receiptFile]);

    const handleScan = async () => {
        if (!receiptFile || isBusy) return;
        setScanSuccess(false);
        const result = await scan(receiptFile);
        if (result) {
            if (result.receiptCode) setReceiptCode(result.receiptCode);
            if (result.storeName) setSupplierName(result.storeName);
            setScanSuccess(true);
        }
    };

    if (!isOpen || !expense) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!receiptFile) {
            setValidationError('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP) hoặc PDF hóa đơn chứng từ.');
            return;
        }

        try {
            // Upload to S3 under RECEIPT category (max 15MB)
            const uploadRes = await uploadFile(receiptFile, 'RECEIPT');

            await onAddReceipt(expense.id, {
                receiptCode: receiptCode.trim() || undefined,
                supplierName: supplierName.trim() || undefined,
                imageUrl: uploadRes.fileUrl,
            });

            setReceiptCode('');
            setSupplierName('');
            setReceiptFile(null);
            setScanSuccess(false);
            resetUpload();
            resetScan();
        } catch {
            // Handled by error modal
        }
    };

    const isBusy = isSubmitting || isUploading || isScanning;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Chứng Từ Hóa Đơn Chi Tiêu</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{expense.itemName}</p>
                    </div>
                    <button onClick={onClose} disabled={isBusy} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* List existing receipts */}
                <div className="mt-4 space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Danh sách hóa đơn đã đính kèm ({expense.receipts?.length ?? 0})
                    </h4>
                    {(!expense.receipts || expense.receipts.length === 0) ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                            Chưa có chứng từ nào. Vui lòng thêm ít nhất 1 chứng từ để được duyệt chi.
                        </div>
                    ) : (
                        expense.receipts.map((r) => (
                            <ReceiptThumbnailItem
                                key={r.id}
                                receipt={r}
                                onDelete={onDeleteReceipt}
                            />
                        ))
                    )}
                </div>

                {/* Add new receipt form using FileUploader */}
                <form onSubmit={handleSubmit} className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">Thêm chứng từ mới</h4>

                    {validationError && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                            {validationError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            disabled={isBusy}
                            value={receiptCode}
                            onChange={(e) => setReceiptCode(e.target.value)}
                            placeholder="Mã hóa đơn..."
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                        <input
                            type="text"
                            disabled={isBusy}
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Đơn vị cung cấp..."
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    <FileUploader
                        category="RECEIPT"
                        selectedFile={receiptFile}
                        onFileSelect={(file) => {
                            setReceiptFile(file);
                            setValidationError(null);
                            setScanSuccess(false);
                        }}
                        isUploading={isUploading}
                        progress={progress}
                        error={uploadError}
                        label="Tải lên hóa đơn chứng từ (Amazon S3) *"
                        description="Hỗ trợ JPG, JPEG, PNG, WEBP, PDF (Tối đa 15MB)"
                        disabled={isBusy}
                    />

                    {/* Scan Bill with AI Button & Feedback */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleScan}
                                disabled={isBusy || !canScan}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                            >
                                {isScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                                {isScanning ? 'Đang quét...' : 'Quét hóa đơn bằng AI'}
                            </button>
                            {scanSuccess && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Đã quét & điền thông tin tự động
                                </span>
                            )}
                        </div>

                        {scanError && (
                            <div className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                                <span>Lỗi quét hóa đơn: {scanError}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            disabled={isBusy || !receiptFile}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            {isUploading ? `Đang tải lên S3 (${progress}%)...` : isSubmitting ? 'Đang lưu...' : 'Đính Kèm Hóa Đơn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
