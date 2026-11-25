import React, { useState, useRef } from 'react';
import {
    X,
    UploadCloud,
    Download,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    FileSpreadsheet,
    Check,
    AlertTriangle,
} from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import {
    exportBudgetItemTemplate,
    parseBudgetItemExcel,
    type ParsedBudgetItemRow,
} from '../utils/budgetExcelUtils';
import type { BudgetCategory, CreateBudgetItemRequest } from '../../../../types/models/finance';

interface ImportBudgetItemsModalPartProps {
    isOpen: boolean;
    categories: BudgetCategory[];
    onClose: () => void;
    onImportItems: (items: CreateBudgetItemRequest[]) => Promise<{ successCount: number; failureCount: number }>;
}

export const ImportBudgetItemsModalPart: React.FC<ImportBudgetItemsModalPartProps> = ({
    isOpen,
    categories,
    onClose,
    onImportItems,
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedBudgetItemRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = async (file: File) => {
        setSelectedFile(file);
        setParseError(null);
        setParsedRows([]);
        setIsParsing(true);

        try {
            const rows = await parseBudgetItemExcel(file, categories);
            setParsedRows(rows);
            if (rows.length === 0) {
                setParseError('Không tìm thấy dòng dữ liệu nào trong tệp.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Không thể đọc tệp Excel.';
            setParseError(msg);
            setParsedRows([]);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isImporting || isParsing) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const validRows = parsedRows.filter((r) => r.isValid && r.request);
    const invalidRows = parsedRows.filter((r) => !r.isValid);

    const handleStartImport = async () => {
        if (validRows.length === 0 || isImporting) return;

        setIsImporting(true);
        const requests = validRows.map((r) => r.request!);

        setImportProgress({ current: 0, total: requests.length });

        try {
            await onImportItems(requests);
            onClose();
        } catch {
            // Error handled by parent / error modal
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setParsedRows([]);
        setParseError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Nhập Hàng Loạt Dự Trù Từ Excel
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tạo nhanh nhiều hạng mục ngân sách thông qua file bảng tính mẫu
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => exportBudgetItemTemplate(categories)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-xs transition-colors"
                            title="Tải tệp mẫu Excel"
                        >
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            Tải Mẫu Excel
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isImporting}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* File Dropzone */}
                    {!selectedFile && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-emerald-400 hover:bg-slate-50 transition-all"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleFileChange(e.target.files[0]);
                                    }
                                }}
                                className="hidden"
                            />
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
                                <UploadCloud className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                                Chọn hoặc kéo thả tệp Excel (<code className="text-xs text-emerald-700">.xlsx</code>) vào đây
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Hãy dùng nút <b>"Tải Mẫu Excel"</b> ở trên nếu bạn chưa có file mẫu chuẩn.
                            </p>
                        </div>
                    )}

                    {/* Parse Error Alert */}
                    {parseError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                            <div>
                                <span className="font-semibold">Lỗi đọc file: </span>
                                {parseError}
                            </div>
                        </div>
                    )}

                    {/* Loading Parsing Indicator */}
                    {isParsing && (
                        <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                            <span className="text-sm font-medium">Đang đọc và kiểm tra dữ liệu từ Excel...</span>
                        </div>
                    )}

                    {/* Preview Table */}
                    {selectedFile && !isParsing && parsedRows.length > 0 && (
                        <div className="space-y-3">
                            {/* Summary bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                    <span className="font-semibold">{selectedFile.name}</span>
                                    <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-slate-600">
                                        Tổng số: <b>{parsedRows.length}</b> dòng
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        <Check className="h-3 w-3" /> {validRows.length} hợp lệ
                                    </span>
                                    {invalidRows.length > 0 && (
                                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                            <AlertTriangle className="h-3 w-3" /> {invalidRows.length} lỗi
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={isImporting}
                                        className="text-slate-400 hover:text-slate-600 underline ml-2"
                                    >
                                        Đổi file khác
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs max-h-[45vh]">
                                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                    <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3 py-2.5 text-center w-12">Dòng</th>
                                            <th className="px-3 py-2.5">Trạng thái</th>
                                            <th className="px-3 py-2.5">Tên Hạng Mục</th>
                                            <th className="px-3 py-2.5">Danh Mục</th>
                                            <th className="px-3 py-2.5">Số Lượng</th>
                                            <th className="px-3 py-2.5">Đơn Giá (VNĐ)</th>
                                            <th className="px-3 py-2.5">Thành Tiền</th>
                                            <th className="px-3 py-2.5">Nơi Mua / Ghi Chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {parsedRows.map((r) => (
                                            <tr
                                                key={r.rowIndex}
                                                className={`hover:bg-slate-50/70 transition-colors ${
                                                    !r.isValid ? 'bg-rose-50/30' : ''
                                                }`}
                                            >
                                                <td className="px-3 py-2 text-center text-slate-400 font-mono">
                                                    {r.rowIndex}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {r.isValid ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                            <CheckCircle2 className="h-3 w-3" /> Hợp lệ
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md"
                                                            title={r.errorMessage}
                                                        >
                                                            <AlertCircle className="h-3 w-3" /> {r.errorMessage}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-slate-800">
                                                    {r.itemName || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-slate-600">
                                                    {r.categoryName}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                                    {r.quantity} {r.unit}
                                                </td>
                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                                    {formatVND(r.estUnitPrice)}
                                                </td>
                                                <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                                                    {formatVND(r.totalAmount)}
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">
                                                    {r.supplierName ? (
                                                        <span>{r.supplierName}</span>
                                                    ) : r.notes ? (
                                                        <span>{r.notes}</span>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Importing Progress Bar */}
                    {isImporting && importProgress && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                                <span className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                                    Đang tạo hạng mục dự trù ({importProgress.current} / {importProgress.total})...
                                </span>
                                <span>
                                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200/60">
                                <div
                                    className="h-full bg-emerald-600 transition-all duration-200"
                                    style={{
                                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isImporting}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        Hủy bỏ
                    </button>

                    <div className="flex items-center gap-2">
                        {parsedRows.length > 0 && (
                            <button
                                type="button"
                                onClick={handleStartImport}
                                disabled={isImporting || validRows.length === 0}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isImporting ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                {isImporting
                                    ? 'Đang nhập...'
                                    : `Tiến Hành Nhập (${validRows.length} Hạng Mục)`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
