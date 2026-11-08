import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle,
    Plus,
    Clock,
    AlertCircle,
    Loader2,
    Users,
    XCircle,
    Search,
} from 'lucide-react';
import {
    getIncidentsByEvent,
    createIncident,
} from '../../../services/knowledgeService';
import { isClubAdmin, useAuth } from '../../../context/authContext';
import {
    type IncidentResponse,
    type IncidentSeverity,
    type Department,
    type CreateIncidentRequest,
    INCIDENT_SEVERITY_CONFIG,
    DEPARTMENT_LABELS,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
}

export const IncidentSection: React.FC<Props> = ({ eventId }) => {
    const { user } = useAuth();
    const canWrite = isClubAdmin(user?.clubRole);
    const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('MEDIUM');
    const [formDepts, setFormDepts] = useState<Department[]>(['PLAN']);
    const [formDesc, setFormDesc] = useState('');
    const [formRootCause, setFormRootCause] = useState('');
    const [formSolution, setFormSolution] = useState('');
    const [formLesson, setFormLesson] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchIncidents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getIncidentsByEvent(eventId);
            setIncidents(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải nhật ký sự cố');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const handleCreateIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formDesc.trim() || !formRootCause.trim()) return;

        setIsSubmitting(true);
        try {
            const req: CreateIncidentRequest = {
                reportedBy: user?.id || null,
                title: formTitle.trim(),
                severity: formSeverity,
                departments: formDepts,
                description: formDesc.trim(),
                rootCause: formRootCause.trim(),
                immediateSolution: formSolution.trim(),
                lessonLearned: formLesson.trim(),
            };
            await createIncident(eventId, req);
            setIsCreateModalOpen(false);
            setFormTitle('');
            setFormDesc('');
            setFormRootCause('');
            setFormSolution('');
            setFormLesson('');
            await fetchIncidents();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi ghi nhận sự cố');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDept = (dept: Department) => {
        setFormDepts((prev) =>
            prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
        );
    };

    const filteredIncidents = incidents.filter((inc) => {
        const matchQuery =
            inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inc.rootCause.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inc.lessonLearned && inc.lessonLearned.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchSev = selectedSeverity === 'ALL' || inc.severity === selectedSeverity;
        const matchDept =
            selectedDept === 'ALL' || inc.departments.includes(selectedDept as Department);
        return matchQuery && matchSev && matchDept;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-[260px] flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm sự cố, nguyên nhân, bài học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                    />
                </div>

                {canWrite && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Ghi nhận sự cố (Post-Mortem)</span>
                    </button>
                )}
            </div>

            {/* Filter Pills: Severity & Departments */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                {/* Severity Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mr-1">
                        Mức độ:
                    </span>
                    <button
                        onClick={() => setSelectedSeverity('ALL')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            selectedSeverity === 'ALL'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả ({incidents.length})
                    </button>
                    {Object.entries(INCIDENT_SEVERITY_CONFIG).map(([k, v]) => (
                        <button
                            key={k}
                            onClick={() => setSelectedSeverity(k)}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                selectedSeverity === k
                                    ? `${v.bg} ${v.color} font-bold ring-1 ring-inset ${v.border}`
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {v.label} ({incidents.filter((i) => i.severity === k).length})
                        </button>
                    ))}
                </div>

                {/* Department Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mr-1">
                        Ban:
                    </span>
                    <button
                        onClick={() => setSelectedDept('ALL')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            selectedDept === 'ALL'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả ban
                    </button>
                    {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                        <button
                            key={k}
                            onClick={() => setSelectedDept(k)}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                selectedDept === k
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Danh sách sự cố */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải nhật ký sự cố…</p>
                </div>
            ) : filteredIncidents.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <AlertTriangle className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có sự cố nào được ghi nhận</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Sự kiện đang diễn ra thuận lợi hoặc chưa có báo cáo Post-Mortem phát sinh.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredIncidents.map((incident) => {
                        const sevCfg = INCIDENT_SEVERITY_CONFIG[incident.severity];
                        return (
                            <div
                                key={incident.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${sevCfg.bg} ${sevCfg.color} ${sevCfg.border}`}
                                            >
                                                {sevCfg.label}
                                            </span>
                                            <h4 className="text-base font-bold text-slate-900">
                                                {incident.title}
                                            </h4>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(incident.createdAt).toLocaleString('vi-VN')}
                                            </span>
                                            <span>•</span>
                                            <span>Báo cáo bởi: {incident.reportedBy || 'Ẩn danh'}</span>
                                        </div>
                                    </div>

                                    {/* Danh sách ban liên quan */}
                                    <div className="flex flex-wrap gap-1">
                                        {incident.departments.map((dept) => (
                                            <span
                                                key={dept}
                                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                            >
                                                <Users className="h-3 w-3" />
                                                {DEPARTMENT_LABELS[dept]}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Khung phân tích 4 phần Post-Mortem */}
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl bg-slate-50 p-4 text-xs">
                                    <div>
                                        <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                            1. Mô tả sự cố
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">{incident.description}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                            2. Nguyên nhân cốt lõi
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">{incident.rootCause}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                            3. Xử lý tức thì
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">{incident.immediateSolution}</p>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50/80 p-2.5 border border-emerald-200">
                                        <span className="font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                                            4. Bài học kế thừa đa mùa
                                        </span>
                                        <p className="text-emerald-900 leading-relaxed font-medium">
                                            {incident.lessonLearned || 'Chưa ghi nhận'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Ghi nhận sự cố */}
            {canWrite && isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Ghi nhận sự cố & Phân tích Post-Mortem
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Lưu vết sự cố để làm bài học kinh nghiệm kế thừa cho các mùa sau
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateIncident} className="mt-5 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700">Tiêu đề sự cố *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Thiếu 30 suất ăn trưa cho tình nguyện viên"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700">Mức độ nghiêm trọng *</label>
                                    <select
                                        value={formSeverity}
                                        onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        {Object.entries(INCIDENT_SEVERITY_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Ban liên quan *</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((dept) => {
                                            const active = formDepts.includes(dept);
                                            return (
                                                <button
                                                    key={dept}
                                                    type="button"
                                                    onClick={() => toggleDept(dept)}
                                                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                                                        active
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {DEPARTMENT_LABELS[dept]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Mô tả chi tiết sự cố *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                    placeholder="Diễn biến sự việc, thời điểm xảy ra..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Nguyên nhân cốt lõi (Root Cause) *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formRootCause}
                                    onChange={(e) => setFormRootCause(e.target.value)}
                                    placeholder="Tại sao sự cố xảy ra? Lỗ hổng trong quy trình hoặc phối hợp..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Xử lý tức thì (Immediate Solution)</label>
                                <textarea
                                    rows={2}
                                    value={formSolution}
                                    onChange={(e) => setFormSolution(e.target.value)}
                                    placeholder="Biện pháp khắc phục tạm thời ngay tại hiện trường..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-emerald-800">Bài học kế thừa cho mùa sau (Lesson Learned)</label>
                                <textarea
                                    rows={2}
                                    value={formLesson}
                                    onChange={(e) => setFormLesson(e.target.value)}
                                    placeholder="Cần thay đổi điều gì trong checklist hoặc dự trù mùa tới?..."
                                    className="mt-1 w-full rounded-xl border border-emerald-300 bg-emerald-50/30 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Ghi nhận sự cố</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
