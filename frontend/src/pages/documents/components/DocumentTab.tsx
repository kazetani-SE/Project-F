import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    Download,
    GitBranch,
    Plus,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    AlertCircle,
    Loader2,
    Eye,
} from 'lucide-react';
import {
    getDocumentsByEvent,
    createDocument,
    updateDocumentApproval,
} from '../../../services/documentService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FileUploader } from '../../../components/common/FileUploader';
import {
    executeStagedUploadAndSave,
    incrementDocumentVersion,
    resolveVersionHistoryChain,
} from '../../../services/uploadWorkflow';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useAuth } from '../../../context/authContext';
import {
    type DocumentResponse,
    type DocumentDocType,
    type CreateDocumentRequest,
    DOC_TYPE_LABELS,
    APPROVAL_STATUS_CONFIG,
} from '../../../types/models/document';

interface Props {
    eventId: string;
}

export const DocumentTab: React.FC<Props> = ({ eventId }) => {
    const { role } = useActiveEvent();
    const { user } = useAuth();
    const currentMemberUuid = user?.id || '11111111-1111-4111-8111-111111111101';
    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDocType, setSelectedDocType] = useState<string>('ALL');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedParentDoc, setSelectedParentDoc] = useState<DocumentResponse | null>(null);
    const [approvalModalDoc, setApprovalModalDoc] = useState<DocumentResponse | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [versionHistoryDoc, setVersionHistoryDoc] = useState<DocumentResponse | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDocType, setFormDocType] = useState<DocumentDocType>('MASTER_PLAN');
    const [formVersion, setFormVersion] = useState('1.0');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isUploading, progress, uploadFile } = useS3Upload();

    const isLeader =
        role === 'HEAD_ORGANIZER' ||
        role === 'VICE_ORGANIZER' ||
        role === 'LEAD_CONTENT' ||
        role === 'LEAD_LOGISTICS';

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getDocumentsByEvent(eventId);
            setDocuments(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

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

            setIsCreateModalOpen(false);
            setSelectedFile(null);
            await fetchDocuments();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tài liệu';
            setUploadError(msg);
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
        if (!approvalModalDoc) return;
        if (status === 'REJECTED' && !rejectionReason.trim()) {
            alert('Vui lòng nhập lý do từ chối tài liệu');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateDocumentApproval(
                approvalModalDoc.id,
                {
                    status,
                    approvedBy: currentMemberUuid,
                    rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : null,
                },
                eventId,
            );
            setApprovalModalDoc(null);
            setRejectionReason('');
            await fetchDocuments();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi phê duyệt tài liệu');
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

    // Lọc danh sách
    const filteredDocs = documents.filter((doc) => {
        const matchQuery =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.version.toLowerCase().includes(searchQuery.toLowerCase());
        const matchType = selectedDocType === 'ALL' || doc.docType === selectedDocType;
        return matchQuery && matchType;
    });

    return (
        <div className="space-y-6">
            {/* Thanh công cụ Tìm kiếm & Bộ lọc & Nút tạo */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu theo tiêu đề, phiên bản..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>
                    <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                    >
                        <option value="ALL">Tất cả phân loại</option>
                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => handleOpenCreateModal()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Tải lên tài liệu mới</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Bảng danh sách tài liệu */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải danh sách tài liệu…</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <FileText className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có tài liệu nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Bắt đầu bằng cách tải lên kế hoạch tổng thể hoặc kịch bản chương trình.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3.5 px-4">Tài liệu & Phiên bản</th>
                                    <th className="py-3.5 px-4">Phân loại</th>
                                    <th className="py-3.5 px-4">Trạng thái duyệt</th>
                                    <th className="py-3.5 px-4">Người tải lên</th>
                                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map((doc) => {
                                    const statusCfg = APPROVAL_STATUS_CONFIG[doc.status];
                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-900">{doc.title}</p>
                                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                                v{doc.version}
                                                            </span>
                                                            {doc.parentDocumentId && (
                                                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                                                    <GitBranch className="h-3 w-3" /> Bản cập nhật
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            Ngày tạo: {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                        {doc.rejectionReason && (
                                                            <p className="mt-1 text-xs text-rose-600">
                                                                Lý do từ chối: {doc.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                    {DOC_TYPE_LABELS[doc.docType]}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                                                >
                                                    {doc.status === 'APPROVED' && <CheckCircle className="h-3.5 w-3.5" />}
                                                    {doc.status === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                                                    {doc.status === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-600">
                                                {doc.uploadedBy}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleDownload(doc.fileUrl)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                        title="Tải xuống tệp"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => setVersionHistoryDoc(doc)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                        title="Xem cây phả hệ phiên bản"
                                                    >
                                                        <GitBranch className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenCreateModal(doc)}
                                                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Nâng cấp phiên bản mới"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>

                                                    {isLeader && (doc.status === 'PENDING' || doc.status === 'DRAFT') && (
                                                        <button
                                                            onClick={() => setApprovalModalDoc(doc)}
                                                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 transition-colors"
                                                            title="Phê duyệt / Từ chối"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {selectedParentDoc
                                        ? `Cập nhật phiên bản mới (Kế thừa v${selectedParentDoc.version})`
                                        : 'Tải lên tài liệu đề án'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedParentDoc
                                        ? `Tài liệu gốc: ${selectedParentDoc.title}`
                                        : 'Tải tệp PDF/Docx lên Amazon S3 và lưu vào hệ thống'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-slate-600"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDocument} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tiêu đề tài liệu *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Kế hoạch tổng thể Tech-Camp"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Phân loại *</label>
                                    <select
                                        value={formDocType}
                                        onChange={(e) => setFormDocType(e.target.value as DocumentDocType)}
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
                                    <label className="block text-xs font-semibold text-slate-700">Mã phiên bản *</label>
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
                                    Tệp đính kèm (Lưu trữ Amazon S3) *
                                </label>
                                <FileUploader
                                    category="DOCUMENT"
                                    selectedFile={selectedFile}
                                    onFileSelect={setSelectedFile}
                                    isUploading={isUploading}
                                    progress={progress}
                                    error={uploadError}
                                    description="Hỗ trợ PDF, DOCX, XLSX (Tối đa 50MB)"
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
                                    disabled={!selectedFile || isSubmitting || isUploading}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
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

            {/* Modal: Phê duyệt / Từ chối (Dành cho Leader) */}
            {approvalModalDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-base font-bold text-slate-900">Phê duyệt tài liệu đề án</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Tài liệu: <span className="font-semibold text-slate-800">{approvalModalDoc.title}</span> (v
                            {approvalModalDoc.version})
                        </p>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-slate-700">
                                Lý do từ chối (Bắt buộc nếu bấm Từ chối)
                            </label>
                            <textarea
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Nhập nhận xét hoặc lý do yêu cầu sửa đổi..."
                                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setApprovalModalDoc(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApproval('REJECTED')}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                            >
                                <XCircle className="h-4 w-4" />
                                <span>Từ chối</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApproval('APPROVED')}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Phê duyệt</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Xem Cây Phiên Bản (Version History) */}
            {versionHistoryDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <GitBranch className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-base font-bold text-slate-900">Lịch sử các phiên bản</h3>
                            </div>
                            <button
                                onClick={() => setVersionHistoryDoc(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {resolveVersionHistoryChain(documents, versionHistoryDoc).map((ver) => (
                                    <div
                                        key={ver.id}
                                        className={`flex items-center justify-between rounded-xl border p-3 ${
                                            ver.id === versionHistoryDoc.id
                                                ? 'border-emerald-300 bg-emerald-50/50'
                                                : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                                                v{ver.version}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{ver.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    Tải lên bởi {ver.uploadedBy} •{' '}
                                                    {new Date(ver.createdAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(ver.fileUrl)}
                                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                                            title="Xem tài liệu"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
