import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, HelpCircle, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { IncidentSection } from './components/IncidentSection';
import { FaqSection } from './components/FaqSection';
import { FeedbackSection } from './components/FeedbackSection';
import { useActiveEvent } from '../../context/activeEventContext';

export const KnowledgePage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId: string }>();
    const { currentEvent } = useActiveEvent();
    const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'FAQS' | 'FEEDBACKS'>('INCIDENTS');

    const eventId = paramEventId || currentEvent?.id || 'ev-tech-fall-2026';
    const seriesId = currentEvent?.seriesId || '22222222-2222-4222-8222-222222222201';

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <Link to="/events" className="hover:text-slate-600 transition-colors">
                        Sự kiện
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-600">
                        {currentEvent?.name || 'Chi tiết sự kiện'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="font-semibold text-emerald-600">Kho tri thức</span>
                </nav>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Kho Tri Thức & Kinh Nghiệm Đa Mùa
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Lưu trữ bài học kinh nghiệm Post-Mortem, ngân hàng câu hỏi FAQ tích lũy và khảo sát sau sự kiện.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <Sparkles className="h-4 w-4" />
                        <span>Kế thừa tri thức đa mùa</span>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('INCIDENTS')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'INCIDENTS'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <span>Nhật ký sự cố & Post-Mortem</span>
                </button>

                <button
                    onClick={() => setActiveTab('FAQS')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'FAQS'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <HelpCircle className="h-4 w-4 text-emerald-600" />
                    <span>Kho FAQ chuỗi sự kiện</span>
                </button>

                <button
                    onClick={() => setActiveTab('FEEDBACKS')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'FEEDBACKS'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <MessageSquare className="h-4 w-4 text-amber-500" />
                    <span>Khảo sát & Đánh giá (JSONB)</span>
                </button>
            </div>

            {/* Tab Contents */}
            <div>
                {activeTab === 'INCIDENTS' && <IncidentSection eventId={eventId} />}
                {activeTab === 'FAQS' && <FaqSection seriesId={seriesId} />}
                {activeTab === 'FEEDBACKS' && <FeedbackSection eventId={eventId} />}
            </div>
        </div>
    );
};

export default KnowledgePage;
