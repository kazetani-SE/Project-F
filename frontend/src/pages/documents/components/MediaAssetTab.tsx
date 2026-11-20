import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Check,
    X,
    Send,
    Pencil,
    Printer,
    Trash2,
    UploadCloud,
    Loader2,
    FileIcon,
    AlertCircle,
    Download,
} from 'lucide-react';
import {
    getMediaAssetsByEvent,
    createMediaAsset,
    updateMediaAsset,
    updateMediaPrintStatus,
    updateMediaApproval,
    deleteMediaAsset,
} from '../../../services/mediaService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../../components/ui/toastContext';
import { validateUploadFile } from '../../../services/uploadWorkflow';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useAuth, isClubAdmin } from '../../../context/authContext';
import { generateMediaPreview } from '../../../utils/mediaPreviewGenerator';
import { getErrorMessage } from '../../../utils/errorHelper';
import {
    type MediaAssetResponse,
    type MediaAssetType,
    type CreateMediaAssetRequest,
    MEDIA_ASSET_TYPE_LABELS,
} from '../../../types/models/media';
import { type ApprovalStatus } from '../../../types/models/document';

interface Props {
    eventId: string;
    onCountChange?: (count: number) => void;
    isCreateModalOpen?: boolean;
    onCloseCreateModal?: () => void;
}

// Màu nền Banner theo đúng chuẩn Figma Design
const ASSET_TYPE_BANNER_STYLES: Record<MediaAssetType, { gradient: string; label: string }> = {
    POSTER: {
        gradient: 'from-emerald-600 to-emerald-500',
        label: 'Poster',
    },
    STANDEE: {
        gradient: 'from-emerald-500 to-green-400',
        label: 'Standee',
    },
    BACKDROP: {
        gradient: 'from-slate-800 to-slate-700',
        label: 'Backdrop',
    },
    BADGE: {
        gradient: 'from-amber-400 to-yellow-400 text-slate-900',
        label: 'Thẻ đeo',
    },
    SOCIAL_POST: {
        gradient: 'from-emerald-600 to-emerald-500',
        label: 'Bài đăng MXH',
    },
    TRAILER: {
        gradient: 'from-slate-800 to-slate-700',
        label: 'Trailer',
    },
    BANNER: {
        gradient: 'from-emerald-600 to-teal-500',
        label: 'Banner',
    },
    OTHER: {
        gradient: 'from-slate-700 to-slate-600',
        label: 'Ấn phẩm khác',
    },
};

export const MediaAssetTab: React.FC<Props> = ({
    eventId,
    onCountChange,
    isCreateModalOpen: externalCreateOpen,
    onCloseCreateModal: externalCloseCreate,
}) => {
    const { role } = useActiveEvent();
    const { user } = useAuth();
    const showToast = useSuccessToast();

    const currentMemberUuid = user?.id || '11111111-1111-4111-8111-111111111101';

    // Phân quyền theo RBAC:
    // Leader, Club Admin, Media member có quyền thêm/sửa/xóa ấn phẩm chưa in
    // Leader, Club Admin, HR có quyền phê duyệt ấn phẩm
    const isAdminOrLeader = isClubAdmin(user?.clubRole) || role === 'LEAD_HEADER' || role === null;
    const canManageMedia = isAdminOrLeader || role === 'MEDIA';
    const canApproveMedia = isAdminOrLeader || role === 'HR';

    const [assets, setAssets] = useState<MediaAssetResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state nội bộ & kết hợp external prop
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const isModalOpen = externalCreateOpen !== undefined ? externalCreateOpen || internalModalOpen : internalModalOpen;

    const [editingAsset, setEditingAsset] = useState<MediaAssetResponse | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formAssetType, setFormAssetType] = useState<MediaAssetType>('POSTER');
    const [formSpecs, setFormSpecs] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { uploadFile } = useS3Upload();

    // Lightbox & Delete dialog
    const [lightboxAsset, setLightboxAsset] = useState<MediaAssetResponse | null>(null);
    const [deleteTargetAsset, setDeleteTargetAsset] = useState<MediaAssetResponse | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMediaAssetsByEvent(eventId);
            setAssets(data);
            onCountChange?.(data.length);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Không thể tải danh sách ấn phẩm'));
        } finally {
            setIsLoading(false);
        }
    }, [eventId, onCountChange]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    // Mở Modal Thêm mới hoặc Chỉnh sửa
    const handleOpenModal = (asset?: MediaAssetResponse) => {
        if (asset) {
            setEditingAsset(asset);
            setFormTitle(asset.title);
            setFormAssetType(asset.assetType);
            setFormSpecs(asset.specifications || '');
            setFilePreviewUrl(asset.previewImageUrl || null);
        } else {
            setEditingAsset(null);
            setFormTitle('');
            setFormAssetType('POSTER');
            setFormSpecs('');
            setFilePreviewUrl(null);
        }
        setSelectedFile(null);
        setUploadError(null);
        setInternalModalOpen(true);
    };

    const handleCloseModal = () => {
        setInternalModalOpen(false);
        externalCloseCreate?.();
        setEditingAsset(null);
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setUploadError(null);
        setIsDragOver(false);
    };

    // Xử lý kéo thả tệp (Drag and Drop)
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
            setIsDragOver(true);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (isSubmitting) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    // Khi người dùng chọn file tải lên
    const handleFileChange = async (file: File | null) => {
        if (!file) {
            setSelectedFile(null);
            setFilePreviewUrl(null);
            return;
        }

        try {
            validateUploadFile(file, 'MEDIA');
            setSelectedFile(file);
            setUploadError(null);

            // Tự động phân tích preview
            const previewInfo = await generateMediaPreview(file);
            if (previewInfo.previewUrl) {
                setFilePreviewUrl(previewInfo.previewUrl);
            } else {
                setFilePreviewUrl(null);
            }
        } catch (err: unknown) {
            setUploadError(getErrorMessage(err, 'Tệp không hợp lệ'));
            setSelectedFile(null);
            setFilePreviewUrl(null);
        }
    };

    // Submit lưu với trạng thái DRAFT hoặc PENDING
    const handleSubmitForm = async (targetStatus: ApprovalStatus) => {
        if (!formTitle.trim()) {
            setUploadError('Vui lòng nhập tiêu đề ấn phẩm');
            return;
        }

        setIsSubmitting(true);
        setUploadError(null);

        try {
            let uploadedFileUrl: string | null = editingAsset ? editingAsset.designFileUrl : null;
            let uploadedPreviewUrl: string | null = editingAsset ? editingAsset.previewImageUrl : null;

            if (selectedFile) {
                // Kiểm tra lại tính hợp lệ của tệp trước khi bắt đầu tải
                validateUploadFile(selectedFile, 'MEDIA');

                const previewRes = await generateMediaPreview(selectedFile);

                // 1. Nếu là ảnh chuẩn web: dùng chính file đó làm preview
                if (previewRes.isOriginalWebImage) {
                    const uploadRes = await uploadFile(selectedFile, 'MEDIA');
                    uploadedFileUrl = uploadRes.fileUrl;
                    uploadedPreviewUrl = uploadRes.fileUrl;
                } else if (previewRes.previewBlob) {
                    // Nếu là video MP4, TIFF hoặc PDF có thumbnail trích xuất
                    const thumbFile = new File([previewRes.previewBlob], `${selectedFile.name}_thumb.webp`, {
                        type: 'image/webp',
                    });
                    const [origRes, thumbRes] = await Promise.all([
                        uploadFile(selectedFile, 'MEDIA'),
                        uploadFile(thumbFile, 'MEDIA'),
                    ]);
                    uploadedFileUrl = origRes.fileUrl;
                    uploadedPreviewUrl = thumbRes.fileUrl;
                } else {
                    const uploadRes = await uploadFile(selectedFile, 'MEDIA');
                    uploadedFileUrl = uploadRes.fileUrl;
                    uploadedPreviewUrl = null;
                }
            }

            const payload: CreateMediaAssetRequest = {
                assetType: formAssetType,
                title: formTitle.trim(),
                specifications: formSpecs.trim() || null,
                designFileUrl: uploadedFileUrl,
                previewImageUrl: uploadedPreviewUrl,
                approvalStatus: targetStatus,
            };

            if (editingAsset) {
                await updateMediaAsset(editingAsset.id, payload, eventId);
                showToast(`Đã cập nhật ấn phẩm "${formTitle.trim()}" thành công!`);
            } else {
                await createMediaAsset(eventId, payload);
                showToast(
                    targetStatus === 'DRAFT'
                        ? `Đã lưu bản nháp "${formTitle.trim()}"!`
                        : `Đã gửi duyệt ấn phẩm "${formTitle.trim()}" thành công!`
                );
            }

            handleCloseModal();
            await fetchAssets();
        } catch (err: unknown) {
            setUploadError(getErrorMessage(err, 'Lỗi khi lưu ấn phẩm'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Phê duyệt / Từ chối hoặc Gửi duyệt nhanh
    const handleQuickApproval = async (asset: MediaAssetResponse, nextStatus: ApprovalStatus) => {
        try {
            const updated = await updateMediaApproval(
                asset.id,
                {
                    approvalStatus: nextStatus,
                    approvedBy: currentMemberUuid,
                },
                eventId
            );
            setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));

            if (nextStatus === 'APPROVED') {
                showToast(`Đã phê duyệt ấn phẩm "${asset.title}"!`);
            } else if (nextStatus === 'REJECTED') {
                showToast(`Đã từ chối ấn phẩm "${asset.title}".`);
            } else if (nextStatus === 'PENDING') {
                showToast(`Đã gửi duyệt ấn phẩm "${asset.title}"!`);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Lỗi cập nhật trạng thái duyệt'));
        }
    };

    // Checkbox toggle Đã in ấn
    const handleTogglePrintStatus = async (asset: MediaAssetResponse) => {
        if (asset.approvalStatus !== 'APPROVED') {
            return;
        }

        try {
            const nextStatus = !asset.isPrinted;
            const updated = await updateMediaPrintStatus(asset.id, { isPrinted: nextStatus }, eventId);
            setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
            showToast(
                nextStatus
                    ? `Đã đánh dấu "${asset.title}" là Đã in ấn!`
                    : `Đã chuyển "${asset.title}" về Chưa in.`
            );
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Lỗi cập nhật trạng thái in ấn'));
        }
    };

    // Xác nhận xóa
    const handleConfirmDelete = async () => {
        if (!deleteTargetAsset) return;
        setIsDeleting(true);
        try {
            await deleteMediaAsset(deleteTargetAsset.id, eventId);
            showToast(`Đã xóa ấn phẩm "${deleteTargetAsset.title}".`);
            setDeleteTargetAsset(null);
            await fetchAssets();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Không thể xóa ấn phẩm'));
        } finally {
            setIsDeleting(false);
        }
    };

    // Tải xuống file thiết kế gốc
    const handleDownloadOriginal = async (fileUrl: string) => {
        try {
            if (fileUrl.includes('X-Amz-Signature') || fileUrl.includes('mock-download')) {
                window.open(fileUrl, '_blank');
                return;
            }
            const res = await getPresignedDownloadUrl(fileUrl);
            window.open(res.downloadUrl, '_blank');
        } catch {
            window.open(fileUrl, '_blank');
        }
    };

    if (isLoading && assets.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-rose-500 hover:text-rose-800 text-xs font-semibold"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Lưới 3 cột đúng chuẩn Figma */}
            {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                    <p className="text-sm font-medium text-slate-600">Chưa có ấn phẩm truyền thông nào</p>
                    <p className="mt-1 text-xs text-slate-400">
                        Bấm nút "+ Thêm ấn phẩm" phía trên để tạo ấn phẩm đầu tiên
                    </p>
                    {canManageMedia && (
                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm ấn phẩm
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map((asset) => {
                        const styleCfg = ASSET_TYPE_BANNER_STYLES[asset.assetType] || ASSET_TYPE_BANNER_STYLES.OTHER;
                        const previewSrc = asset.previewImageUrl;
                        const isApproved = asset.approvalStatus === 'APPROVED';
                        const isDraft = asset.approvalStatus === 'DRAFT';
                        const isPending = asset.approvalStatus === 'PENDING';
                        const isBadge = asset.assetType === 'BADGE';

                        return (
                            <div
                                key={asset.id}
                                className="group flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                            >
                                {/* Top Banner Container (Gradient Cover Matching Figma) */}
                                <div
                                    className={`relative h-44 sm:h-48 w-full bg-gradient-to-br ${styleCfg.gradient} flex flex-col items-center justify-center p-4 select-none overflow-hidden`}
                                >
                                    {previewSrc ? (
                                        <img
                                            src={previewSrc}
                                            alt={asset.title}
                                            className="absolute inset-0 h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                            onClick={() => setLightboxAsset(asset)}
                                        />
                                    ) : (
                                        <div className="text-center z-10 px-4">
                                            <h3
                                                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                                                    isBadge ? 'text-slate-900' : 'text-white'
                                                }`}
                                            >
                                                {styleCfg.label}
                                            </h3>
                                            {asset.specifications && (
                                                <p
                                                    className={`mt-1 text-xs sm:text-sm font-medium tracking-wide ${
                                                        isBadge ? 'text-slate-800/90' : 'text-white/90'
                                                    }`}
                                                >
                                                    {asset.specifications}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Top-Left: Approval Status Pill */}
                                    <div className="absolute top-3 left-3 z-20">
                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs backdrop-blur-xs">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                Đã phê duyệt
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/95 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-xs backdrop-blur-xs">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                                Chờ duyệt
                                            </span>
                                        )}
                                        {isDraft && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                                Bản nháp
                                            </span>
                                        )}
                                        {asset.approvalStatus === 'REJECTED' && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/95 px-2.5 py-1 text-xs font-semibold text-rose-800 shadow-xs backdrop-blur-xs">
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                                Từ chối
                                            </span>
                                        )}
                                    </div>

                                    {/* Top-Right: Yellow "ĐÃ IN" Badge */}
                                    {asset.isPrinted && (
                                        <div className="absolute top-3 right-3 z-20">
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900 shadow-xs tracking-wide">
                                                <Printer className="h-3 w-3" />
                                                ĐÃ IN
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Info & Actions Body */}
                                <div className="flex flex-col justify-between flex-1 p-4">
                                    <div>
                                        <h4
                                            className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1"
                                            title={asset.title}
                                        >
                                            {asset.title}
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                                            {styleCfg.label}
                                            {asset.specifications ? ` · ${asset.specifications}` : ''}
                                        </p>
                                    </div>

                                    {/* Card Footer: Checkbox + Action Buttons */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        {/* Checkbox Đã in ấn */}
                                        <label
                                            className={`inline-flex items-center gap-2 text-xs font-medium select-none ${
                                                isApproved
                                                    ? 'cursor-pointer text-slate-700 hover:text-slate-900'
                                                    : 'cursor-not-allowed opacity-50 text-slate-400'
                                            }`}
                                            title={
                                                !isApproved
                                                    ? 'Chỉ có thể đánh dấu in khi ấn phẩm đã được phê duyệt'
                                                    : undefined
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                checked={asset.isPrinted}
                                                disabled={!isApproved}
                                                onChange={() => handleTogglePrintStatus(asset)}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>Đã in ấn</span>
                                        </label>

                                        {/* Action Icon Buttons */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Nút gửi duyệt cho Bản nháp (Icon Máy bay giấy với tooltip) */}
                                            {isDraft && canManageMedia && (
                                                <div className="relative group/btn">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickApproval(asset, 'PENDING')}
                                                        className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-colors shadow-xs"
                                                        aria-label="Gửi duyệt"
                                                    >
                                                        <Send className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-md z-30">
                                                        Gửi duyệt
                                                    </span>
                                                </div>
                                            )}

                                            {/* Nút Phê duyệt & Từ chối cho trạng thái Chờ duyệt */}
                                            {isPending && canApproveMedia && (
                                                <>
                                                    <div className="relative group/btn">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickApproval(asset, 'APPROVED')}
                                                            className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                                                            aria-label="Phê duyệt"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-md z-30">
                                                            Phê duyệt
                                                        </span>
                                                    </div>
                                                    <div className="relative group/btn">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickApproval(asset, 'REJECTED')}
                                                            className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 flex items-center justify-center transition-colors shadow-xs"
                                                            aria-label="Từ chối"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-md z-30">
                                                            Từ chối
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            {/* Nút Chỉnh sửa Bút chì */}
                                            {canManageMedia && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenModal(asset)}
                                                    className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
                                                    aria-label="Chỉnh sửa ấn phẩm"
                                                    title="Chỉnh sửa ấn phẩm"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            {/* Tùy chọn Tải file / Xóa (nếu có file hoặc có quyền xóa) */}
                                            {asset.designFileUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadOriginal(asset.designFileUrl!)}
                                                    className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
                                                    title="Tải file thiết kế gốc"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            {!asset.isPrinted && canManageMedia && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTargetAsset(asset)}
                                                    className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shadow-xs"
                                                    title="Xóa ấn phẩm"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Thêm / Chỉnh sửa Ấn phẩm đúng chuẩn Figma Ảnh 3 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all overflow-hidden border border-slate-200">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingAsset ? 'Chỉnh sửa ấn phẩm truyền thông' : 'Thêm ấn phẩm truyền thông'}
                            </h3>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={isSubmitting}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmitForm('PENDING');
                            }}
                            className="p-6 space-y-4"
                        >
                            {uploadError && (
                                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                                    {uploadError}
                                </div>
                            )}

                            {/* Hàng 1: Loại ấn phẩm & Thông số kỹ thuật */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Loại ấn phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formAssetType}
                                        onChange={(e) => setFormAssetType(e.target.value as MediaAssetType)}
                                        disabled={isSubmitting}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                                    >
                                        <option value="POSTER">Poster</option>
                                        <option value="STANDEE">Standee</option>
                                        <option value="BACKDROP">Backdrop</option>
                                        <option value="BADGE">Thẻ đeo</option>
                                        <option value="SOCIAL_POST">Bài đăng MXH</option>
                                        <option value="TRAILER">Trailer</option>
                                        <option value="BANNER">Banner</option>
                                        <option value="OTHER">Ấn phẩm khác</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Thông số kỹ thuật
                                    </label>
                                    <input
                                        type="text"
                                        value={formSpecs}
                                        onChange={(e) => setFormSpecs(e.target.value)}
                                        placeholder="VD: 60×160cm - PP"
                                        disabled={isSubmitting}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Kích thước, chất liệu, định dạng
                                    </p>
                                </div>
                            </div>

                            {/* Hàng 2: Tiêu đề */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tiêu đề <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="VD: Poster chính thức, Backdrop sân khấu..."
                                    disabled={isSubmitting}
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                                />
                            </div>

                            {/* Hàng 3: File thiết kế / ảnh xem trước (Dropzone đúng Figma) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    File thiết kế / ảnh xem trước
                                </label>

                                <div className="relative">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="media-file-input"
                                        disabled={isSubmitting}
                                        accept=".png,.jpg,.jpeg,.webp,.pdf,.tif,.tiff,.mp4"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileChange(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                    />

                                    {selectedFile || filePreviewUrl ? (
                                        <div
                                            onDragEnter={handleDragEnter}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                                                isDragOver
                                                    ? 'border-emerald-500 bg-emerald-100/50 scale-[1.01]'
                                                    : 'border-emerald-200 bg-emerald-50/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {filePreviewUrl ? (
                                                    <img
                                                        src={filePreviewUrl}
                                                        alt="Preview"
                                                        className="h-12 w-12 rounded object-cover border border-emerald-200"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                                                        <FileIcon className="h-6 w-6" />
                                                    </div>
                                                )}
                                                <div className="overflow-hidden">
                                                    <p className="truncate text-xs font-semibold text-slate-800">
                                                        {selectedFile ? selectedFile.name : editingAsset?.title}
                                                    </p>
                                                    {selectedFile && (
                                                        <p className="text-[11px] text-slate-500">
                                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="cursor-pointer rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    Thay đổi
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileChange(null)}
                                                    className="rounded p-1 text-slate-400 hover:text-rose-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragEnter={handleDragEnter}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                                                isDragOver
                                                    ? 'border-emerald-500 bg-emerald-100/50 scale-[1.01]'
                                                    : 'border-emerald-300 bg-emerald-50/15 hover:bg-emerald-50/30'
                                            }`}
                                        >
                                            <UploadCloud className="h-8 w-8 text-emerald-600 mb-2 stroke-[1.75]" />
                                            <p className="text-sm font-semibold text-slate-800">
                                                Kéo thả tệp vào đây hoặc bấm để chọn
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400 font-normal">
                                                PNG, JPG, JPEG, WEBP, PDF, TIF, MP4 · tối đa 100MB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Modal: 3 nút theo đúng Figma */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmitForm('DRAFT')}
                                    disabled={isSubmitting}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin inline" />
                                    ) : (
                                        'Lưu nháp'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmitForm('PENDING')}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin inline" />
                                    ) : (
                                        <>
                                            <Send className="h-3.5 w-3.5" />
                                            <span>Gửi duyệt</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lightbox Xem ảnh phóng to */}
            {lightboxAsset && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
                    onClick={() => setLightboxAsset(null)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setLightboxAsset(null)}
                            className="absolute top-3 right-3 z-10 rounded-full bg-slate-900/60 p-1.5 text-white hover:bg-slate-900 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="p-2">
                            <img
                                src={lightboxAsset.previewImageUrl || ''}
                                alt={lightboxAsset.title}
                                className="max-h-[80vh] w-auto rounded object-contain"
                            />
                        </div>
                        <div className="border-t border-slate-100 bg-white px-4 py-3 text-left">
                            <h4 className="font-bold text-slate-900">{lightboxAsset.title}</h4>
                            <p className="text-xs text-slate-500">
                                {MEDIA_ASSET_TYPE_LABELS[lightboxAsset.assetType]}
                                {lightboxAsset.specifications ? ` · ${lightboxAsset.specifications}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog xác nhận xóa ấn phẩm */}
            {deleteTargetAsset && (
                <ConfirmationDialog
                    title="Xác nhận xóa ấn phẩm"
                    message={`Bạn có chắc chắn muốn xóa ấn phẩm "${deleteTargetAsset.title}"? Hành động này sẽ xóa dữ liệu trên hệ thống và không thể hoàn tác.`}
                    busy={isDeleting}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteTargetAsset(null)}
                />
            )}
        </div>
    );
};
