import React, { useState, useEffect, useCallback } from 'react';
import {
    Image,
    Printer,
    Plus,
    ExternalLink,
    AlertCircle,
    Loader2,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import {
    getMediaAssetsByEvent,
    createMediaAsset,
    updateMediaPrintStatus,
} from '../../../services/mediaService';
import { FileUploader } from '../../../components/common/FileUploader';
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
    const [assets, setAssets] = useState<MediaAssetResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>('ALL');

    // Create modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formAssetType, setFormAssetType] = useState<MediaAssetType>('POSTER');
    const [formSpecs, setFormSpecs] = useState('');
    const [formDesignUrl, setFormDesignUrl] = useState('');
    const [formPreviewUrl, setFormPreviewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        try {
            const req: CreateMediaAssetRequest = {
                assetType: formAssetType,
                title: formTitle.trim(),
                specifications: formSpecs.trim() || null,
                designFileUrl: formDesignUrl.trim() || null,
                previewImageUrl: formPreviewUrl.trim() || null,
            };
            await createMediaAsset(eventId, req);
            setIsCreateModalOpen(false);
            setFormTitle('');
            setFormSpecs('');
            setFormDesignUrl('');
            setFormPreviewUrl('');
            await fetchAssets();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi tạo ấn phẩm');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Lọc theo loại:
                    </span>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                    >
                        <option value="ALL">Tất cả ấn phẩm</option>
                        {Object.entries(MEDIA_ASSET_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Thêm ấn phẩm mới</span>
                </button>
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
            ) : assets.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <Image className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có ấn phẩm nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Đăng tải poster, standee, hoặc backdrop để theo dõi tiến độ thiết kế và in ấn.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {assets.map((asset) => (
                        <div
                            key={asset.id}
                            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md"
                        >
                            {/* Preview Thumbnail */}
                            <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                                {asset.previewImageUrl ? (
                                    <img
                                        src={asset.previewImageUrl}
                                        alt={asset.title}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                        <Image className="h-10 w-10 stroke-1" />
                                    </div>
                                )}
                                <span className="absolute left-3 top-3 rounded-lg bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                                    {MEDIA_ASSET_TYPE_LABELS[asset.assetType]}
                                </span>
                            </div>

                            {/* Card Content */}
                            <div className="flex flex-1 flex-col p-4">
                                <h4 className="font-semibold text-slate-900 line-clamp-1">{asset.title}</h4>

                                {asset.specifications ? (
                                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                        Quy cách: {asset.specifications}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xs text-slate-400 italic">Chưa có thông số kích thước</p>
                                )}

                                {asset.designFileUrl && (
                                    <a
                                        href={asset.designFileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span>Xem file thiết kế gốc (Figma/Drive)</span>
                                    </a>
                                )}

                                {/* Card Footer: In ấn & Phê duyệt */}
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                    {/* Nút toggle in ấn */}
                                    <button
                                        onClick={() => handleTogglePrint(asset)}
                                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            asset.isPrinted
                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        <span>{asset.isPrinted ? 'Đã in hoàn tất' : 'Chưa in ấn'}</span>
                                    </button>

                                    {/* Trạng thái duyệt */}
                                    <span
                                        className={`flex items-center gap-1 text-xs font-medium ${
                                            asset.approvalStatus === 'APPROVED'
                                                ? 'text-emerald-600'
                                                : 'text-amber-600'
                                        }`}
                                    >
                                        {asset.approvalStatus === 'APPROVED' ? (
                                            <>
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Đã duyệt
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="h-3.5 w-3.5" /> Chờ duyệt
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal tạo ấn phẩm mới */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Thêm ấn phẩm truyền thông</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateAsset} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên ấn phẩm *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Standee hướng dẫn check-in QR"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Loại ấn phẩm *</label>
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
                                        placeholder="0.8m x 1.8m, Hiflex..."
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Đường dẫn file thiết kế gốc (Figma / Google Drive)
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
                                    Ảnh xem trước (Tải lên Amazon S3)
                                </label>
                                <FileUploader
                                    category="MEDIA"
                                    onUploadSuccess={(res) => setFormPreviewUrl(res.fileUrl)}
                                    description="Tải lên ảnh PNG, JPG hoặc SVG để làm thumbnail"
                                />
                                {formPreviewUrl && (
                                    <p className="mt-1.5 truncate text-xs text-emerald-600 font-medium">
                                        ✓ Đã tải ảnh xem trước: {formPreviewUrl}
                                    </p>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formTitle.trim() || isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Tạo ấn phẩm</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
