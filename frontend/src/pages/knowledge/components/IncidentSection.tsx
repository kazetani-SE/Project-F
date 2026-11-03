import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle,
    Plus,
    Filter,
    Clock,
    AlertCircle,
    Loader2,
    Users,
} from 'lucide-react';
import {
    getIncidentsByEvent,
    createIncident,
} from '../../../services/knowledgeService';
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
    const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('MEDIUM');
    const [formDepts, setFormDepts] = useState<Department[]>(['TECH']);
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
        const matchSev = selectedSeverity === 'ALL' || inc.severity === selectedSeverity;
        const matchDept =
            selectedDept === 'ALL' || inc.departments.includes(selectedDept as Department);
        return matchSev && matchDept;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Mức độ:
                        </span>
                        <select
                            value={selectedSeverity}
                            onChange={(e) => setSelectedSeverity(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                        >
                            <option value="ALL">Tất cả mức độ</option>
                            {Object.entries(INCIDENT_SEVERITY_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Ban liên quan:
                        </span>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                        >
                            <option value="ALL">Tất cả các ban</option>
                            {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Ghi nhận sự cố (Post-Mortem)</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Danh sách sự cố Timeline */}
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
                                            ★ Bài học kinh nghiệm
                                        </span>
                                        <p className="text-emerald-900 leading-relaxed">{incident.lessonLearned}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Ghi Nhận Sự Cố Mới */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">
                                Lập biên bản sự cố Post-Mortem
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateIncident} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Tên sự cố *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ví dụ: Nghẽn mạng phòng máy lúc 14:00"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Mức độ nghiêm trọng *</label>
                                    <select
                                        value={formSeverity}
                                        onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        {Object.entries(INCIDENT_SEVERITY_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Ban phụ trách liên quan *</label>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((dept) => {
                                            const active = formDepts.includes(dept);
                                            return (
                                                <button
                                                    key={dept}
                                                    type="button"
                                                    onClick={() => toggleDept(dept)}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
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
                                <label className="block text-xs font-semibold text-slate-700">1. Mô tả chi tiết sự cố *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                    placeholder="Hiện tượng xảy ra khi nào, ảnh hưởng ra sao..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">2. Nguyên nhân cốt lõi (Root Cause) *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formRootCause}
                                    onChange={(e) => setFormRootCause(e.target.value)}
                                    placeholder="Nguyên nhân sâu xa dẫn đến lỗi..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">3. Hướng xử lý tức thì (Immediate Solution) *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formSolution}
                                    onChange={(e) => setFormSolution(e.target.value)}
                                    placeholder="Các bước khắc phục ngay tại chỗ..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-emerald-800">★ Bài học phòng tránh cho mùa sau (Lesson Learned) *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formLesson}
                                    onChange={(e) => setFormLesson(e.target.value)}
                                    placeholder="Quy trình, đối soát hoặc chuẩn bị cần cải thiện..."
                                    className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
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
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Lưu biên bản sự cố</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
