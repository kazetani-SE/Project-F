import React, { useState, useEffect, useCallback } from 'react';
import {
    History,
    Download,
    RotateCcw,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    HardDrive,
    RefreshCw,
} from 'lucide-react';
import {
    listS3ObjectVersions,
    getPresignedDownloadUrl,
    deleteFileFromS3,
    extractS3VersionId,
} from '../../services/storageService';
import type { S3ObjectVersionResponse } from '../../types/models/storage';

interface Props {
    fileUrl: string | null | undefined;
    canModify?: boolean;
    lockedVersionIds?: Set<string>;
    onRestoreVersion?: (version: S3ObjectVersionResponse) => Promise<void>;
    onVersionDeleted?: (versionId: string) => void;
}

function formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const S3VersionHistoryList: React.FC<Props> = ({
    fileUrl,
    canModify = false,
    lockedVersionIds,
    onRestoreVersion,
    onVersionDeleted,
}) => {
    const [versions, setVersions] = useState<S3ObjectVersionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyVersionId, setBusyVersionId] = useState<string | null>(null);

    const activeVersionId = extractS3VersionId(fileUrl);

    const fetchVersions = useCallback(async () => {
        if (!fileUrl) return;
        setIsLoading(true);
        setError(null);
        try {
            const list = await listS3ObjectVersions(fileUrl);
            setVersions(list);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách phiên bản từ Amazon S3',
            );
        } finally {
            setIsLoading(false);
        }
    }, [fileUrl]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const handleDownloadVersion = async (ver: S3ObjectVersionResponse) => {
        try {
            const res = await getPresignedDownloadUrl(ver.fileUrl);
            window.open(res.downloadUrl, '_blank');
        } catch {
            window.open(ver.fileUrl, '_blank');
        }
    };

    const handleRestore = async (ver: S3ObjectVersionResponse) => {
        if (!onRestoreVersion) return;
        setBusyVersionId(ver.versionId);
        setError(null);
        try {
            await onRestoreVersion(ver);
            await fetchVersions();
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Không thể khôi phục phiên bản S3 này',
            );
        } finally {
            setBusyVersionId(null);
        }
    };

    const handleDeleteVersion = async (ver: S3ObjectVersionResponse) => {
        setBusyVersionId(ver.versionId);
        setError(null);
        try {
            await deleteFileFromS3(ver.objectKey, ver.versionId);
            setVersions((prev) => prev.filter((item) => item.versionId !== ver.versionId));
            onVersionDeleted?.(ver.versionId);
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Không thể xóa phiên bản S3 này',
            );
        } finally {
            setBusyVersionId(null);
        }
    };

    if (!fileUrl) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                        <HardDrive className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900">
                            Phiên bản lưu trữ vật lý trên Amazon S3 (S3 Bucket Versioning)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Quản lý, tải xuống, khôi phục hoặc dọn dẹp các <code className="font-mono">versionId</code> trên S3
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={fetchVersions}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    title="Làm mới danh sách phiên bản S3"
                >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Đang truy vấn S3 Object Versions...</span>
                </div>
            ) : versions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white py-4 px-3 text-center text-xs text-slate-500">
                    <History className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                    <p>
                        Tệp hiện hành{activeVersionId ? ` (versionId: ${activeVersionId.slice(0, 10)}...)` : ''} chưa có danh sách phiên bản S3 hoặc môi trường chưa kết nối S3 Client trực tiếp.
                    </p>
                </div>
            ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {versions.map((ver) => {
                        const isActiveInRecord =
                            (activeVersionId && ver.versionId === activeVersionId) ||
                            (!activeVersionId && ver.isLatest);
                        const isLocked =
                            Boolean(isActiveInRecord) ||
                            Boolean(ver.versionId && lockedVersionIds?.has(ver.versionId));
                        const isBusy = busyVersionId === ver.versionId;

                        return (
                            <div
                                key={`${ver.objectKey}#${ver.versionId}`}
                                className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs transition-colors ${
                                    isActiveInRecord
                                        ? 'border-emerald-300 bg-emerald-50/70'
                                        : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-200"
                                            title={`S3 Version ID: ${ver.versionId}`}
                                        >
                                            #{ver.versionId ? ver.versionId.slice(0, 12) : 'null'}
                                        </span>

                                        {ver.isLatest && (
                                            <span className="rounded-full bg-sky-100 px-2 py-0.2 text-[10px] font-semibold text-sky-800 border border-sky-200">
                                                S3 Latest
                                            </span>
                                        )}

                                        {isActiveInRecord && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.2 text-[10px] font-semibold text-white">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                Đang sử dụng
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-slate-500">
                                        Dung lượng: <strong className="text-slate-700">{formatFileSize(ver.sizeBytes)}</strong>
                                        {ver.lastModified && (
                                            <>
                                                {' '}• Tải lên S3:{' '}
                                                {new Date(ver.lastModified).toLocaleString('vi-VN')}
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadVersion(ver)}
                                        className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                        title="Xem / Tải xuống đúng phiên bản S3 này"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </button>

                                    {canModify && onRestoreVersion && !isActiveInRecord && (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleRestore(ver)}
                                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                            title="Khôi phục bản ghi về phiên bản S3 này"
                                        >
                                            {isBusy ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-3 w-3" />
                                            )}
                                            <span>Khôi phục</span>
                                        </button>
                                    )}

                                    {canModify && !isLocked && (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleDeleteVersion(ver)}
                                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                                            title="Xóa vĩnh viễn phiên bản S3 cũ này khỏi Bucket"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

