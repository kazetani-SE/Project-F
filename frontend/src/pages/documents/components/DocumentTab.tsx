import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileText,
    Download,
    GitBranch,
    Plus,
    CheckCircle,
    XCircle,
    Search,
    AlertCircle,
    Loader2,
    Eye,
    Trash2,
    RotateCcw,
    Clock,
    ShieldCheck,
    FileUp,
    UserCheck,
} from 'lucide-react';
import {
    getDocumentsByEvent,
    createDocument,
    updateDocumentApproval,
    deleteDocument,
} from '../../../services/documentService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FileUploader } from '../../../components/common/FileUploader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../../components/ui/toastContext';
import {
    executeStagedUploadAndSave,
    incrementDocumentVersion,
    resolveVersionHistoryChain,
} from '../../../services/uploadWorkflow';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useAuth, isClubAdmin } from '../../../context/authContext';
import {
    type DocumentResponse,
    type DocumentDocType,
    type CreateDocumentRequest,
    type ApprovalStatus,
    DOC_TYPE_LABELS,
    APPROVAL_STATUS_CONFIG,
} from '../../../types/models/document';

interface Props {
    eventId: string;
    onCountChange?: (count: number) => void;
}

const DOC_TYPE_BADGE_STYLES: Record<DocumentDocType, string> = {
    MASTER_PLAN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    RUNNING_ORDER: 'bg-sky-50 text-sky-800 border-sky-200',
    SPONSOR_PROPOSAL: 'bg-violet-50 text-violet-800 border-violet-200',
    MEETING_MINUTES: 'bg-amber-50 text-amber-800 border-amber-200',
    RISK_PLAN: 'bg-rose-50 text-rose-800 border-rose-200',
    OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const DocumentTab: React.FC<Props> = ({ eventId, onCountChange }) => {
    const { role } = useActiveEvent();
    const { user } = useAuth();
    const showToast = useSuccessToast();

    const currentMemberUuid = user?.id || '11111111-1111-4111-8111-111111111101';
    const currentMemberName = user?.fullName || 'Nguyễn Văn An';

    // RBAC permissions according to SYSTEM_SPECIFICATION.md Section 5.1 & API_SPECIFICATION.md Section 6.1:
    // - Club Admin (PRESIDENT, VICEPRESIDENT) & LEAD_HEADER: full review (APPROVED / REJECTED) & upload
    // - PLAN: can upload/version documents and self-approve (APPROVED) documents uploaded by themselves
    const isAdminOrLeader =
        isClubAdmin(user?.clubRole) || role === 'LEAD_HEADER' || role === null;
    const canUploadOrVersion = isAdminOrLeader || role === 'PLAN';

    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [onlyLatestVersion, setOnlyLatestVersion] = useState<boolean>(false);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedParentDoc, setSelectedParentDoc] = useState<DocumentResponse | null>(null);
    const [approvalModalDoc, setApprovalModalDoc] = useState<DocumentResponse | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalError, setApprovalError] = useState<string | null>(null);
    const [versionHistoryDoc, setVersionHistoryDoc] = useState<DocumentResponse | null>(null);

    // Delete Confirmation state
    const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentResponse | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<unknown>(null);

    // Create / Version Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDocType, setFormDocType] = useState<DocumentDocType>('MASTER_PLAN');
    const [formVersion, setFormVersion] = useState('1.0');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isUploading, progress, uploadFile } = useS3Upload();

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getDocumentsByEvent(eventId);
            setDocuments(data);
            onCountChange?.(data.length);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, onCountChange]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const formatMemberName = useCallback(
        (rawIdOrName: string | null): string => {
            if (!rawIdOrName) return '—';
            if (rawIdOrName === currentMemberUuid) return currentMemberName;
            if (rawIdOrName === '11111111-1111-4111-8111-111111111101') return 'Nguyễn Văn An';
            if (rawIdOrName === '11111111-1111-4111-8111-111111111102') return 'Trần Bình';
            // Check if it looks like a raw UUID
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rawIdOrName)) {
                return `Thành viên BTC (#${rawIdOrName.slice(0, 6).toUpperCase()})`;
            }
            return rawIdOrName;
        },
        [currentMemberUuid, currentMemberName],
    );

    const extractFileName = (fileUrl: string): string => {
        const parts = fileUrl.split('/');
        const last = parts[parts.length - 1] || 'tai-lieu.pdf';
        return decodeURIComponent(last.split('?')[0]);
    };

    const isOwnDocument = useCallback(
        (doc: DocumentResponse): boolean => {
            return (
                doc.uploadedBy === currentMemberUuid ||
                doc.uploadedBy === currentMemberName
            );
        },
        [currentMemberUuid, currentMemberName],
    );

    const canSelfApproveAsPlan = useCallback(
        (doc: DocumentResponse): boolean => {
            return (
                !isAdminOrLeader &&
                role === 'PLAN' &&
                isOwnDocument(doc) &&
                (doc.status === 'PENDING' || doc.status === 'DRAFT')
            );
        },
        [isAdminOrLeader, role, isOwnDocument],
    );

    // Summary KPI statistics
    const summaryStats = useMemo(() => {
        const total = documents.length;
        const approved = documents.filter((d) => d.status === 'APPROVED').length;
        const pending = documents.filter((d) => d.status === 'PENDING').length;
        const rejected = documents.filter((d) => d.status === 'REJECTED').length;
        const draft = documents.filter((d) => d.status === 'DRAFT').length;
        const versionedCount = documents.filter((d) => d.parentDocumentId !== null).length;

        return { total, approved, pending, rejected, draft, versionedCount };
    }, [documents]);

    // Map of parent document titles & set of documents that have newer child versions
    const documentLineageInfo = useMemo(() => {
        const byId = new Map<string, DocumentResponse>(documents.map((d) => [d.id, d]));
        const hasChildIds = new Set<string>();
        for (const doc of documents) {
            if (doc.parentDocumentId) {
                hasChildIds.add(doc.parentDocumentId);
            }
        }
        return { byId, hasChildIds };
    }, [documents]);

    const handleOpenCreateModal = (parentDoc?: DocumentResponse) => {
        if (parentDoc) {
            setSelectedParentDoc(parentDoc);
            setFormTitle(parentDoc.title);
            setFormDocType(parentDoc.docType);
            setFormVersion(incrementDocumentVersion(parentDoc.version));
        } else {
            setSelectedParentDoc(null);
            setFormTitle('');
            setFormDocType('MASTER_PLAN');
            setFormVersion('1.0');
        }
        setSelectedFile(null);
        setUploadError(null);
        setIsCreateModalOpen(true);
    };

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) return;
        if (!selectedFile) {
            setUploadError('Vui lòng chọn tệp tài liệu đính kèm');
            return;
        }

        setIsSubmitting(true);
        setUploadError(null);
        try {
            await executeStagedUploadAndSave({
                file: selectedFile,
                category: 'DOCUMENT',
                uploadToS3: (file, cat) => uploadFile(file, cat),
                saveToDatabase: async (fileUrl) => {
                    const req: CreateDocumentRequest = {
                        parentDocumentId: selectedParentDoc ? selectedParentDoc.id : null,
                        docType: formDocType,
                        title: formTitle.trim(),
                        version: formVersion.trim() || '1.0',
                        fileUrl,
                        uploadedBy: currentMemberUuid,
                    };
                    return await createDocument(eventId, req);
                },
            });

            showToast(
                selectedParentDoc
                    ? `Đã tải lên phiên bản mới v${formVersion.trim() || '1.1'} thành công!`
                    : 'Đã tải lên tài liệu đề án mới thành công!',
            );
            setIsCreateModalOpen(false);
            setSelectedFile(null);
            await fetchDocuments();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tài liệu';
            setUploadError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproval = async (status: 'APPROVED' | 'REJECTED', targetDoc?: DocumentResponse) => {
        const docToUpdate = targetDoc || approvalModalDoc;
        if (!docToUpdate) return;
        if (status === 'REJECTED' && !rejectionReason.trim()) {
            setApprovalError('Vui lòng nhập lý do từ chối tài liệu để người soạn thảo chỉnh sửa.');
            return;
        }

        setIsSubmitting(true);
        setApprovalError(null);
        try {
            await updateDocumentApproval(
                docToUpdate.id,
                {
                    status,
                    approvedBy: currentMemberUuid,
                    rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : null,
                },
                eventId,
            );
            showToast(
                status === 'APPROVED'
                    ? `Đã phê duyệt tài liệu "${docToUpdate.title}" (v${docToUpdate.version})!`
                    : `Đã từ chối tài liệu "${docToUpdate.title}".`,
            );
            setApprovalModalDoc(null);
            setRejectionReason('');
            await fetchDocuments();
        } catch (err: unknown) {
            setApprovalError(
                err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái duyệt tài liệu',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = async (fileUrl: string) => {
        try {
            const res = await getPresignedDownloadUrl(fileUrl);
            window.open(res.downloadUrl, '_blank');
        } catch {
            window.open(fileUrl, '_blank');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetDoc) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteDocument(deleteTargetDoc.id, eventId);
            showToast(`Đã xóa tài liệu "${deleteTargetDoc.title}" (v${deleteTargetDoc.version}).`);
            setDeleteTargetDoc(null);
            await fetchDocuments();
        } catch (err: unknown) {
            setDeleteError(err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Filtered list
    const filteredDocs = useMemo(() => {
        const kw = searchQuery.trim().toLowerCase();
        return documents.filter((doc) => {
            if (onlyLatestVersion && documentLineageInfo.hasChildIds.has(doc.id)) {
                return false;
            }
            const uploaderLabel = formatMemberName(doc.uploadedBy).toLowerCase();
            const fileName = extractFileName(doc.fileUrl).toLowerCase();
            const matchQuery =
                !kw ||
                doc.title.toLowerCase().includes(kw) ||
                doc.version.toLowerCase().includes(kw) ||
                uploaderLabel.includes(kw) ||
                fileName.includes(kw);
            const matchType = selectedDocType === 'ALL' || doc.docType === selectedDocType;
            const matchStatus = selectedStatus === 'ALL' || doc.status === selectedStatus;
            return matchQuery && matchType && matchStatus;
        });
    }, [
        documents,
        searchQuery,
        selectedDocType,
        selectedStatus,
        onlyLatestVersion,
        documentLineageInfo.hasChildIds,
        formatMemberName,
    ]);

    const renderStatusBadge = (doc: DocumentResponse) => {
        const cfg = APPROVAL_STATUS_CONFIG[doc.status];
        const dotColor: Record<ApprovalStatus, string> = {
            APPROVED: 'bg-emerald-500',
            PENDING: 'bg-amber-500',
            REJECTED: 'bg-rose-500',
            DRAFT: 'bg-slate-400',
        };

        return (
            <div className="space-y-1">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColor[doc.status]}`} />
                    <span>{cfg.label}</span>
                </span>

                {doc.approvedBy && (doc.status === 'APPROVED' || doc.status === 'REJECTED') && (
                    <div className="text-[11px] text-slate-400">
                        <span className="font-medium text-slate-600">
                            {doc.status === 'APPROVED' ? 'Duyệt bởi:' : 'Từ chối bởi:'}{' '}
                            {formatMemberName(doc.approvedBy)}
                        </span>
                        {doc.approvedAt && (
                            <span className="block">
                                {new Date(doc.approvedAt).toLocaleDateString('vi-VN')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Description & Primary Upload Button */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Lưu trữ tập trung đề án tổng thể, kịch bản chương trình, hồ sơ mời tài trợ và
                    biên bản họp trên Amazon S3. Hỗ trợ theo dõi cây phả hệ phiên bản và kiểm vết
                    phê duyệt.
                </p>

                {canUploadOrVersion && (
                    <button
                        type="button"
                        onClick={() => handleOpenCreateModal()}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                    >
                        <FileUp className="h-4 w-4" />
                        <span>Tải lên tài liệu mới</span>
                    </button>
                )}
            </div>

            {/* 4 KPI Summary Cards */}
            {!isLoading && documents.length > 0 && (
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('ALL')}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            selectedStatus === 'ALL'
                                ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Tổng tài liệu
                            </span>
                            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                                {summaryStats.total}
                            </p>
                            <span className="text-[11px] text-slate-500">
                                {summaryStats.versionedCount} bản nâng cấp phiên bản
                            </span>
                        </div>
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                            <FileText className="h-5 w-5" />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedStatus((prev) => (prev === 'APPROVED' ? 'ALL' : 'APPROVED'))
                        }
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            selectedStatus === 'APPROVED'
                                ? 'border-emerald-400 bg-emerald-50/60 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-emerald-200'
                        }`}
                    >
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                Đã phê duyệt
                            </span>
                            <p className="mt-1 text-2xl font-extrabold text-emerald-700 tabular-nums">
                                {summaryStats.approved}
                            </p>
                            <span className="text-[11px] text-slate-500">
                                Đã khóa xóa bảo toàn dữ liệu
                            </span>
                        </div>
                        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedStatus((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'))
                        }
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            selectedStatus === 'PENDING'
                                ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-amber-200'
                        }`}
                    >
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                Chờ phê duyệt
                            </span>
                            <p className="mt-1 text-2xl font-extrabold text-amber-600 tabular-nums">
                                {summaryStats.pending}
                            </p>
                            <span className="text-[11px] text-slate-500">
                                {summaryStats.draft > 0
                                    ? `+ ${summaryStats.draft} bản nháp`
                                    : 'Cần Trưởng BTC xét duyệt'}
                            </span>
                        </div>
                        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                            <Clock className="h-5 w-5" />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedStatus((prev) => (prev === 'REJECTED' ? 'ALL' : 'REJECTED'))
                        }
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            selectedStatus === 'REJECTED'
                                ? 'border-rose-400 bg-rose-50/60 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-rose-200'
                        }`}
                    >
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                                Cần chỉnh sửa
                            </span>
                            <p className="mt-1 text-2xl font-extrabold text-rose-600 tabular-nums">
                                {summaryStats.rejected}
                            </p>
                            <span className="text-[11px] text-slate-500">
                                Đã từ chối & cần bản mới
                            </span>
                        </div>
                        <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600">
                            <XCircle className="h-5 w-5" />
                        </div>
                    </button>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* DocType Segmented Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSelectedDocType('ALL')}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                selectedDocType === 'ALL'
                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Tất cả ({documents.length})
                        </button>
                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => {
                            const count = documents.filter((d) => d.docType === k).length;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => setSelectedDocType(k)}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                        selectedDocType === k
                                            ? 'bg-emerald-700 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {v} {count > 0 && <span className="opacity-75">({count})</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full lg:w-72">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tiêu đề, phiên bản, tên file, người tải..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                        />
                    </div>
                </div>

                {/* Secondary Row: Status Pills & Latest Version Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mr-1">
                            Trạng thái:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedStatus('ALL')}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedStatus === 'ALL'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Tất cả ({summaryStats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedStatus('APPROVED')}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedStatus === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            • Đã duyệt ({summaryStats.approved})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedStatus('PENDING')}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedStatus === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800 font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            • Chờ duyệt ({summaryStats.pending})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedStatus('REJECTED')}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedStatus === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800 font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            • Từ chối ({summaryStats.rejected})
                        </button>
                        {summaryStats.draft > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('DRAFT')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    selectedStatus === 'DRAFT'
                                        ? 'bg-slate-300 text-slate-900 font-semibold'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                • Bản nháp ({summaryStats.draft})
                            </button>
                        )}
                    </div>

                    {summaryStats.versionedCount > 0 && (
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyLatestVersion}
                                onChange={(e) => setOnlyLatestVersion(e.target.checked)}
                                className="h-3.5 w-3.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Chỉ hiện phiên bản mới nhất của mỗi tài liệu</span>
                        </label>
                    )}
                </div>
            </div>

            {/* Error State with Retry Button */}
            {error && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={fetchDocuments}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Thử lại</span>
                    </button>
                </div>
            )}

            {/* Skeleton Loading / Empty / Table */}
            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                        <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
                        <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
                        <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
                        <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
                    </div>
                    <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <FileText className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">
                        {documents.length === 0
                            ? 'Chưa có tài liệu kế hoạch nào được tải lên'
                            : 'Không tìm thấy tài liệu nào phù hợp với bộ lọc'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        {documents.length === 0
                            ? 'Bắt đầu bằng cách tải lên đề án tổng thể, kịch bản chạy chương trình hoặc hồ sơ mời tài trợ.'
                            : 'Hãy thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc phân loại / trạng thái.'}
                    </p>
                    {documents.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedDocType('ALL');
                                setSelectedStatus('ALL');
                                setOnlyLatestVersion(false);
                            }}
                            className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                            Đặt lại toàn bộ bộ lọc
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3.5 px-5">Tài liệu & Phiên bản</th>
                                    <th className="py-3.5 px-4">Phân loại</th>
                                    <th className="py-3.5 px-4">Trạng thái & Kiểm vết</th>
                                    <th className="py-3.5 px-4">Người tải lên</th>
                                    <th className="py-3.5 px-5 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map((doc) => {
                                    const parentDoc = doc.parentDocumentId
                                        ? documentLineageInfo.byId.get(doc.parentDocumentId)
                                        : null;
                                    const fileName = extractFileName(doc.fileUrl);
                                    const canPlanSelfApprove = canSelfApproveAsPlan(doc);

                                    return (
                                        <tr
                                            key={doc.id}
                                            className="hover:bg-slate-50/70 transition-colors"
                                        >
                                            {/* Column 1: Title, Version, File Link, Parent Lineage & Rejection Reason */}
                                            <td className="py-4 px-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100 shrink-0 mt-0.5">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-slate-900 text-sm">
                                                                {doc.title}
                                                            </p>
                                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700 border border-slate-200/80">
                                                                v{doc.version}
                                                            </span>
                                                            {doc.parentDocumentId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setVersionHistoryDoc(doc)
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                                                    title="Xem cây phả hệ phiên bản"
                                                                >
                                                                    <GitBranch className="h-3 w-3" />
                                                                    <span>
                                                                        {parentDoc
                                                                            ? `Kế thừa từ v${parentDoc.version}`
                                                                            : 'Bản cập nhật'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDownload(doc.fileUrl)
                                                                }
                                                                className="font-semibold text-emerald-700 hover:underline truncate max-w-[260px]"
                                                                title={`Mở tệp S3: ${fileName}`}
                                                            >
                                                                {fileName}
                                                            </button>
                                                            <span>•</span>
                                                            <span>
                                                                Tạo ngày:{' '}
                                                                {new Date(
                                                                    doc.createdAt,
                                                                ).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        </div>

                                                        {doc.rejectionReason && (
                                                            <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 border border-rose-200">
                                                                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                                                                <span>
                                                                    <strong>Lý do từ chối:</strong>{' '}
                                                                    {doc.rejectionReason}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Category Badge */}
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                                        DOC_TYPE_BADGE_STYLES[doc.docType]
                                                    }`}
                                                >
                                                    {DOC_TYPE_LABELS[doc.docType]}
                                                </span>
                                            </td>

                                            {/* Column 3: Approval Status & Audit Info */}
                                            <td className="py-4 px-4">{renderStatusBadge(doc)}</td>

                                            {/* Column 4: Uploaded By */}
                                            <td className="py-4 px-4">
                                                <div className="text-xs">
                                                    <p className="font-semibold text-slate-800">
                                                        {formatMemberName(doc.uploadedBy)}
                                                    </p>
                                                    {isOwnDocument(doc) && (
                                                        <span className="inline-block rounded-sm bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-500">
                                                            Bạn tải lên
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Column 5: Actions */}
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownload(doc.fileUrl)}
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                                        title="Xem / Tải xuống tệp từ Amazon S3"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setVersionHistoryDoc(doc)}
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                                        title="Xem cây lịch sử các phiên bản"
                                                    >
                                                        <GitBranch className="h-4 w-4" />
                                                    </button>

                                                    {canUploadOrVersion && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenCreateModal(doc)
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                            title={`Tải lên phiên bản kế tiếp (v${incrementDocumentVersion(doc.version)})`}
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            <span>
                                                                v{incrementDocumentVersion(doc.version)}
                                                            </span>
                                                        </button>
                                                    )}

                                                    {/* Admin / LEAD_HEADER Full Approval Modal Trigger */}
                                                    {isAdminOrLeader &&
                                                        (doc.status === 'PENDING' ||
                                                            doc.status === 'DRAFT') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setApprovalModalDoc(doc);
                                                                    setRejectionReason('');
                                                                    setApprovalError(null);
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                                                                title="Xét duyệt hoặc Từ chối tài liệu"
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5 text-amber-600" />
                                                                <span>Duyệt</span>
                                                            </button>
                                                        )}

                                                    {/* PLAN Role Self-Approval Trigger (Per Spec 5.1) */}
                                                    {canPlanSelfApprove && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleApproval('APPROVED', doc)
                                                            }
                                                            disabled={isSubmitting}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                                                            title="Tự chuyển tài liệu do chính bạn tải lên sang Đã phê duyệt (Quyền Ban Kế hoạch)"
                                                        >
                                                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                            <span>Tự duyệt</span>
                                                        </button>
                                                    )}

                                                    {/* Delete Button (Only when NOT APPROVED per Spec 5.3) */}
                                                    {canUploadOrVersion &&
                                                        doc.status !== 'APPROVED' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setDeleteTargetDoc(doc)
                                                                }
                                                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                title="Xóa tài liệu (Chỉ cho phép khi chưa phê duyệt chính thức)"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Tải lên tài liệu mới / Phiên bản mới */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {selectedParentDoc
                                        ? `Nâng cấp phiên bản mới (Kế thừa v${selectedParentDoc.version})`
                                        : 'Tải lên tài liệu kế hoạch & đề án'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedParentDoc
                                        ? `Tài liệu gốc: ${selectedParentDoc.title}`
                                        : 'Tải tệp PDF/DOCX/XLSX trực tiếp lên Amazon S3 (Tối đa 50MB)'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDocument} className="mt-5 space-y-4">
                            {uploadError && (
                                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Tiêu đề tài liệu *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Kế hoạch tổng thể Tech-Camp Mùa Thu 2026"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Phân loại tài liệu *
                                    </label>
                                    <select
                                        value={formDocType}
                                        onChange={(e) =>
                                            setFormDocType(e.target.value as DocumentDocType)
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Mã phiên bản *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formVersion}
                                        onChange={(e) => setFormVersion(e.target.value)}
                                        placeholder="1.0 hoặc 1.1"
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tệp đính kèm (Lưu trữ bảo mật Amazon S3) *
                                </label>
                                <FileUploader
                                    category="DOCUMENT"
                                    selectedFile={selectedFile}
                                    onFileSelect={setSelectedFile}
                                    isUploading={isUploading}
                                    progress={progress}
                                    error={null}
                                    description="Hỗ trợ PDF, DOCX, XLSX (Tối đa 50MB theo quy chuẩn lưu trữ)"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isSubmitting || isUploading}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || isSubmitting || isUploading}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                    {(isSubmitting || isUploading) && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    <span>
                                        {isUploading
                                            ? `Đang đẩy lên S3 (${progress}%)...`
                                            : isSubmitting
                                              ? 'Đang lưu CSDL...'
                                              : 'Lưu tài liệu'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Phê duyệt / Từ chối (Dành cho Trưởng BTC & Ban Chủ nhiệm) */}
            {approvalModalDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">
                                Xét duyệt tài liệu đề án
                            </h3>
                            <button
                                type="button"
                                onClick={() => setApprovalModalDoc(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-100">
                            <p className="font-bold text-slate-900">
                                {approvalModalDoc.title}{' '}
                                <span className="text-emerald-700">
                                    (v{approvalModalDoc.version})
                                </span>
                            </p>
                            <p className="text-slate-500">
                                Phân loại: {DOC_TYPE_LABELS[approvalModalDoc.docType]} • Tải lên
                                bởi: {formatMemberName(approvalModalDoc.uploadedBy)}
                            </p>
                        </div>

                        {approvalError && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                <span>{approvalError}</span>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-slate-700">
                                Nhận xét / Lý do từ chối (Bắt buộc nếu bấm Từ chối)
                            </label>
                            <textarea
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => {
                                    setRejectionReason(e.target.value);
                                    if (approvalError) setApprovalError(null);
                                }}
                                placeholder="Nhập lý do yêu cầu chỉnh sửa hoặc ghi chú phê duyệt..."
                                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-emerald-500 focus:outline-hidden"
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setApprovalModalDoc(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApproval('REJECTED')}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                <XCircle className="h-4 w-4" />
                                <span>Từ chối</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApproval('APPROVED')}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Phê duyệt chính thức</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Xem Cây Phiên Bản (Version History Lineage) */}
            {versionHistoryDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                                    <GitBranch className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Phả hệ lịch sử phiên bản
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Chuỗi kế thừa qua <code className="font-mono">parent_document_id</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setVersionHistoryDoc(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
                            {resolveVersionHistoryChain(documents, versionHistoryDoc).map(
                                (ver, idx) => {
                                    const isCurrent = ver.id === versionHistoryDoc.id;
                                    const cfg = APPROVAL_STATUS_CONFIG[ver.status];

                                    return (
                                        <div
                                            key={ver.id}
                                            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                                                isCurrent
                                                    ? 'border-emerald-300 bg-emerald-50/50'
                                                    : 'border-slate-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-extrabold text-slate-800">
                                                        v{ver.version}
                                                    </span>
                                                    {idx === 0 && (
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">
                                                            Bản gốc
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {ver.title}
                                                        </p>
                                                        <span
                                                            className={`rounded-full border px-2 py-0.2 text-[10px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                                                        >
                                                            {cfg.label}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="rounded-md bg-emerald-700 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                                                                Đang chọn
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-[11px] text-slate-500">
                                                        Tải lên bởi{' '}
                                                        <strong className="text-slate-700">
                                                            {formatMemberName(ver.uploadedBy)}
                                                        </strong>{' '}
                                                        •{' '}
                                                        {new Date(ver.createdAt).toLocaleString(
                                                            'vi-VN',
                                                        )}
                                                    </p>
                                                    {ver.rejectionReason && (
                                                        <p className="text-[11px] text-rose-600">
                                                            Lý do từ chối: {ver.rejectionReason}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(ver.fileUrl)}
                                                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    title="Mở / Tải tệp S3 của phiên bản này"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        {canUploadOrVersion && (
                            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                <span className="text-xs text-slate-500">
                                    Cần cập nhật nội dung mới từ phiên bản này?
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = versionHistoryDoc;
                                        setVersionHistoryDoc(null);
                                        handleOpenCreateModal(target);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>
                                        Tạo phiên bản v
                                        {incrementDocumentVersion(versionHistoryDoc.version)}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Deleting Document */}
            {deleteTargetDoc && (
                <ConfirmationDialog
                    title="Xóa tài liệu đề án"
                    message={`Bạn có chắc chắn muốn xóa tài liệu "${deleteTargetDoc.title}" (v${deleteTargetDoc.version})? Tệp đính kèm trên Amazon S3 sẽ được thu hồi và các phiên bản con (nếu có) sẽ tự động giữ lại độc lập.`}
                    busy={isDeleting}
                    error={deleteError}
                    onCancel={() => {
                        if (!isDeleting) {
                            setDeleteTargetDoc(null);
                            setDeleteError(null);
                        }
                    }}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    );
};
