import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, Loader2, FileText } from 'lucide-react';
import {
    type StorageCategory,
    STORAGE_LIMIT_LABELS,
    ALLOWED_MIME_TYPES,
} from '../../types/models/storage';
import { validateUploadFile } from '../../services/uploadWorkflow';

interface FileUploaderProps {
    category: StorageCategory;
    // Chế độ Staged (chờ người dùng bấm Lưu mới upload lên S3)
    selectedFile?: File | null;
    onFileSelect?: (file: File | null) => void;
    isUploading?: boolean;
    progress?: number;
    error?: string | null;

    accept?: string;
    label?: string;
    description?: string;
    disabled?: boolean;
    initialUrl?: string;
    className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    category,
    selectedFile,
    onFileSelect,
    isUploading = false,
    progress = 0,
    error: externalError,
    accept,
    label,
    description,
    disabled = false,
    initialUrl,
    className = '',
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hiển thị preview cho tệp ảnh đã chọn hoặc initialUrl
    useEffect(() => {
        if (selectedFile) {
            if (selectedFile.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreviewUrl(null);
            }
        } else if (initialUrl) {
            setPreviewUrl(initialUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile, initialUrl]);

    const defaultAccept =
        accept ||
        ALLOWED_MIME_TYPES[category]
            ?.map((m) => {
                if (m.startsWith('image/')) return '.' + m.split('/')[1];
                if (m === 'application/pdf') return '.pdf';
                if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
                if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '.xlsx';
                return m;
            })
            .join(',');

    const handleFile = (file: File) => {
        setLocalError(null);
        try {
            // Kiểm tra dung lượng & định dạng trước khi nhận tệp
            validateUploadFile(file, category);
            onFileSelect?.(file);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Tệp không hợp lệ';
            setLocalError(msg);
            onFileSelect?.(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled || isUploading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled && !isUploading) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLocalError(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onFileSelect?.(null);
    };

    const limitLabel = STORAGE_LIMIT_LABELS[category];
    const displayError = externalError || localError;

    const hasFile = !!selectedFile || !!previewUrl || !!initialUrl;

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                    isDragOver
                        ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                        : 'border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-slate-50'
                } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={defaultAccept}
                    onChange={handleInputChange}
                    disabled={disabled || isUploading}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="w-full max-w-xs space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                            <span>Đang tải lên Amazon S3… ({progress}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : hasFile ? (
                    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="h-12 w-12 shrink-0 rounded-lg object-cover border border-emerald-200 shadow-xs"
                                />
                            ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                    <FileText className="h-6 w-6" />
                                </div>
                            )}
                            <div className="min-w-0 text-left">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span className="truncate">
                                        {selectedFile?.name || 'Tệp đã chọn'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {selectedFile
                                        ? `${(selectedFile.size / 1024).toFixed(0)} KB • Sẵn sàng tải lên S3 khi lưu`
                                        : 'Đã lưu trữ'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={isUploading}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition-colors disabled:opacity-50"
                            title="Xóa và chọn tệp khác"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
                            <UploadCloud className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                            Kéo và thả tệp vào đây, hoặc <span className="text-emerald-600 underline">duyệt tệp</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {description || `Dung lượng tối đa ${limitLabel} (${category})`}
                        </p>
                    </>
                )}
            </div>

            {displayError && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{displayError}</span>
                </div>
            )}
        </div>
    );
};
