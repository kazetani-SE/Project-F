import { ErrorNotice } from '../../../components/ui/CrudUi';
import React, { useState, useEffect, useCallback } from 'react';
import {
    Image as ImageIcon,
    Printer,
    Plus,
    ExternalLink,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import {
    getMediaAssetsByEvent,
    createMediaAsset,
    updateMediaPrintStatus,
    updateMediaApproval,
} from '../../../services/mediaService';
import { getPresignedDownloadUrl, isS3Attachment } from '../../../services/storageService';
import { FileUploader } from '../../../components/common/FileUploader';
import { executeStagedUploadAndSave } from '../../../services/uploadWorkflow';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { isClubAdmin, useAuth } from '../../../context/authContext';
import {
    type MediaAssetResponse,
    type MediaAssetType,
    type CreateMediaAssetRequest,
    MEDIA_ASSET_TYPE_LABELS,
} from '../../../types/models/media';

interface Props {
    eventId: string;
}

export const MediaAssetTab: React.FC<Props> = ({ eventId }) => {
    const { user } = useAuth();
    const currentMemberUuid = user?.id || '11111111-1111-4111-8111-111111111101';
    const canWrite = isClubAdmin(user?.clubRole);

    const [assets, setAssets] = useState<MediaAssetResponse[]>([]);
    const [downloadError, setDownloadError] = useState<unknown>(null);
    const [resolvedPreviews, setResolvedPreviews] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [printFilter, setPrintFilter] = useState<'ALL' | 'PRINTED' | 'NOT_PRINTED'>('ALL');

    // Create modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formAssetType, setFormAssetType] = useState<MediaAssetType>('POSTER');
    const [formSpecs, setFormSpecs] = useState('');
    const [formDesignUrl, setFormDesignUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isUploading, progress, uploadFile } = useS3Upload();

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMediaAssetsByEvent(
                eventId,
                selectedType === 'ALL' ? undefined : selectedType,
            );
            setAssets(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách ấn phẩm');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, selectedType]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    useEffect(() => {
        let cancelled = false;
        const resolveS3Urls = async () => {
            const entries = await Promise.all(
                assets.map(async (asset) => {
                    const rawUrl = asset.previewImageUrl;
                    if (!rawUrl) return [asset.id, ''] as const;
                    if (isS3Attachment(rawUrl)) {
                        try {
                            const signed = await getPresignedDownloadUrl(rawUrl);
                            return [asset.id, signed.downloadUrl] as const;
                        } catch (error) {
                            if (!cancelled) setDownloadError(error);
                            return [asset.id, ''] as const;
                        }
                    }
                    return [asset.id, rawUrl] as const;
                }),
            );
            if (!cancelled) {
                setResolvedPreviews(Object.fromEntries(entries));
            }
        };
        resolveS3Urls();
        return () => {
            cancelled = true;
        };
    }, [assets]);

    const handleApproveAsset = async (
        asset: MediaAssetResponse,
        approvalStatus: 'APPROVED' | 'REJECTED',
    ) => {
        try {
            const updated = await updateMediaApproval(
                asset.id,
                {
                    approvalStatus,
                    approvedBy: currentMemberUuid,
                },
                eventId,
            );
            setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái duyệt ấn phẩm');
        }
    };

    const handleTogglePrint = async (asset: MediaAssetResponse) => {
        try {
            const nextStatus = !asset.isPrinted;
            await updateMediaPrintStatus(asset.id, { isPrinted: nextStatus }, eventId);
            setAssets((prev) =>
                prev.map((a) => (a.id === asset.id ? { ...a, isPrinted: nextStatus } : a)),
            );
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái in ấn');
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) return;

        setIsSubmitting(true);
        setUploadError(null);
        try {
            if (selectedFile) {
                await executeStagedUploadAndSave({
                    file: selectedFile,
                    category: 'MEDIA',
                    uploadToS3: (file, cat) => uploadFile(file, cat),
                    saveToDatabase: async (fileUrl) => {
                        const req: CreateMediaAssetRequest = {
                            assetType: formAssetType,
                            title: formTitle.trim(),
                            specifications: formSpecs.trim() || null,
                            designFileUrl: formDesignUrl.trim() || null,
                            previewImageUrl: fileUrl,
                        };
                        return await createMediaAsset(eventId, req);
                    },
                });
            } else {
                const req: CreateMediaAssetRequest = {
                    assetType: formAssetType,
                    title: formTitle.trim(),
                    specifications: formSpecs.trim() || null,
                    designFileUrl: formDesignUrl.trim() || null,
                    previewImageUrl: null,
                };
                await createMediaAsset(eventId, req);
            }

            setIsCreateModalOpen(false);
            setFormTitle('');
            setFormSpecs('');
            setFormDesignUrl('');
            setSelectedFile(null);
            setUploadError(null);
            await fetchAssets();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi tạo ấn phẩm';
            setUploadError(msg);
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredAssets = assets.filter((asset) => {
        if (printFilter === 'PRINTED' && !asset.isPrinted) return false;
        if (printFilter === 'NOT_PRINTED' && asset.isPrinted) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <ErrorNotice error={downloadError} />
            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                        Loại ấn phẩm:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setSelectedType('ALL')}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                selectedType === 'ALL'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Tất cả ({assets.length})
                        </button>
                        {Object.entries(MEDIA_ASSET_TYPE_LABELS).map(([k, v]) => (
                            <button
                                key={k}
                                onClick={() => setSelectedType(k)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    selectedType === k
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {canWrite && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Thêm ấn phẩm mới</span>
                    </button>
                )}
            </div>

            {/* Print Status Filter Pills */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                    In ấn:
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setPrintFilter('ALL')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            printFilter === 'ALL'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setPrintFilter('PRINTED')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            printFilter === 'PRINTED'
                                ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        • Đã gửi in ({assets.filter((a) => a.isPrinted).length})
                    </button>
                    <button
                        onClick={() => setPrintFilter('NOT_PRINTED')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            printFilter === 'NOT_PRINTED'
                                ? 'bg-amber-100 text-amber-800 font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        • Chưa in ấn ({assets.filter((a) => !a.isPrinted).length})
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Grid ấn phẩm */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải danh sách ấn phẩm thiết kế…</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <ImageIcon className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có ấn phẩm nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Đăng tải poster, standee, hoặc backdrop để theo dõi tiến độ thiết kế và in ấn.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAssets.map((asset) => {
                        const previewSrc = resolvedPreviews[asset.id];
                        return (
                            <div
                                key={asset.id}
                                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md"
                            >
                                <div>
                                    {/* Preview container */}
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                                        {previewSrc ? (
                                            <img
                                                src={previewSrc}
                                                alt={asset.title}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-slate-400">
                                                <ImageIcon className="h-10 w-10" />
                                                <span className="mt-1 text-xs">Chưa có ảnh preview</span>
                                            </div>
                                        )}

                                        {/* Badges on preview */}
                                        <div className="absolute top-3 left-3">
                                            <span className="rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                                                {MEDIA_ASSET_TYPE_LABELS[asset.assetType]}
                                            </span>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            {asset.approvalStatus === 'APPROVED' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                                                    <CheckCircle2 className="h-3 w-3" /> Đã duyệt
                                                </span>
                                            )}
                                            {asset.approvalStatus === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                                                    <Clock className="h-3 w-3" /> Chờ duyệt
                                                </span>
                                            )}
                                            {asset.approvalStatus === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                                                    <XCircle className="h-3 w-3" /> Từ chối
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content info */}
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                            {asset.title}
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {asset.specifications || 'Chưa cập nhật quy cách in'}
                                        </p>

                                        {asset.designFileUrl && (
                                            <a
                                                href={isS3Attachment(asset.designFileUrl) ? '#' : asset.designFileUrl}
                                                onClick={async (event) => {
                                                    const url = asset.designFileUrl;
                                                    if (!url || !isS3Attachment(url)) return;
                                                    event.preventDefault();
                                                    setDownloadError(null);
                                                    try {
                                                        const { downloadUrl } = await getPresignedDownloadUrl(url);
                                                        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                                                    } catch (error) {
                                                        setDownloadError(error);
                                                    }
                                                }}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                <span>Xem tệp thiết kế gốc (Figma/Drive)</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2">
                                    {/* Print Toggle */}
                                    {canWrite ? (
                                        <button
                                            onClick={() => handleTogglePrint(asset)}
                                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                asset.isPrinted
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>{asset.isPrinted ? 'Đã gửi in' : 'Chưa in'}</span>
                                        </button>
                                    ) : <span className="text-xs text-slate-600">{asset.isPrinted ? 'Đã gửi in' : 'Chưa in'}</span>}

                                    {/* Leader Approval Actions */}
                                    {canWrite && asset.approvalStatus === 'PENDING' && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleApproveAsset(asset, 'REJECTED')}
                                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                                                title="Từ chối ấn phẩm"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleApproveAsset(asset, 'APPROVED')}
                                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                title="Phê duyệt ấn phẩm"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal tạo ấn phẩm mới */}
            {canWrite && isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Thêm ấn phẩm thiết kế</h3>
                                <p className="text-xs text-slate-500">
                                    Đăng tải thông tin ấn phẩm và ảnh preview trực tiếp lên Amazon S3
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAsset} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên ấn phẩm *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Standee hướng dẫn check-in"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Phân loại *</label>
                                    <select
                                        value={formAssetType}
                                        onChange={(e) => setFormAssetType(e.target.value as MediaAssetType)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        {Object.entries(MEDIA_ASSET_TYPE_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Quy cách in ấn</label>
                                    <input
                                        type="text"
                                        value={formSpecs}
                                        onChange={(e) => setFormSpecs(e.target.value)}
                                        placeholder="Ví dụ: Khổ A1, cán mờ 150gsm"
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Đường dẫn file thiết kế (Figma / Google Drive URL)
                                </label>
                                <input
                                    type="url"
                                    value={formDesignUrl}
                                    onChange={(e) => setFormDesignUrl(e.target.value)}
                                    placeholder="https://www.figma.com/file/..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Ảnh xem trước (Preview Image - Upload S3)
                                </label>
                                <FileUploader
                                    category="MEDIA"
                                    selectedFile={selectedFile}
                                    onFileSelect={setSelectedFile}
                                    isUploading={isUploading}
                                    progress={progress}
                                    error={uploadError}
                                    description="Hỗ trợ JPG, PNG, WEBP (Tối đa 15MB)"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isSubmitting || isUploading}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isUploading}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>
                                        {isUploading
                                            ? `Đang đẩy lên S3 (${progress}%)...`
                                            : isSubmitting
                                              ? 'Đang lưu CSDL...'
                                              : 'Lưu ấn phẩm'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
