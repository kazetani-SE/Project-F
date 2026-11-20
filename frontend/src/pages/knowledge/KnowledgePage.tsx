import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, HelpCircle, MessageSquare } from 'lucide-react';
import { IncidentSection } from './components/IncidentSection';
import { FaqSection } from './components/FaqSection';
import { FeedbackSection } from './components/FeedbackSection';
import { useActiveEvent } from '../../context/activeEventContext';
import { getIncidentsByEvent, getFaqsBySeries, getFeedbacksByEvent } from '../../services/knowledgeService';

type KnowledgeTab = 'INCIDENTS' | 'FAQS' | 'FEEDBACKS';

const TAB_PARAM_MAP: Record<string, KnowledgeTab> = {
    incidents: 'INCIDENTS',
    faqs: 'FAQS',
    feedbacks: 'FEEDBACKS',
};

const TAB_TO_PARAM: Record<KnowledgeTab, string> = {
    INCIDENTS: 'incidents',
    FAQS: 'faqs',
    FEEDBACKS: 'feedbacks',
};

export const KnowledgePage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentEvent } = useActiveEvent();

    const initialTabParam = (searchParams.get('tab') || '').toLowerCase();
    const [activeTab, setActiveTab] = useState<KnowledgeTab>(
        TAB_PARAM_MAP[initialTabParam] || 'INCIDENTS',
    );

    const handleTabChange = (tab: KnowledgeTab) => {
        setActiveTab(tab);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', TAB_TO_PARAM[tab]);
        setSearchParams(nextParams, { replace: true });
    };

    useEffect(() => {
        const currentParam = (searchParams.get('tab') || '').toLowerCase();
        const mapped = TAB_PARAM_MAP[currentParam];
        if (mapped && mapped !== activeTab) {
            setActiveTab(mapped);
        }
    }, [searchParams, activeTab]);

    const eventId = paramEventId || currentEvent?.id || 'ev-tech-fall-2026';
    const seriesId = currentEvent?.seriesId || '22222222-2222-4222-8222-222222222201';

    const [incidentCount, setIncidentCount] = useState<number | null>(null);
    const [faqCount, setFaqCount] = useState<number | null>(null);
    const [feedbackCount, setFeedbackCount] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;
        Promise.allSettled([
            getIncidentsByEvent(eventId),
            getFeedbacksByEvent(eventId),
        ]).then(([incidents, feedbacks]) => {
            if (!isMounted) return;
            if (incidents.status === 'fulfilled') setIncidentCount(incidents.value.length);
            if (feedbacks.status === 'fulfilled') setFeedbackCount(feedbacks.value.length);
        });
        return () => {
            isMounted = false;
        };
    }, [eventId]);

    useEffect(() => {
        let isMounted = true;
        getFaqsBySeries(seriesId)
            .then((faqs) => {
                if (isMounted) setFaqCount(faqs.length);
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [seriesId]);

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb matching Figma design */}
            <div>
                <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Link to="/events" className="hover:text-emerald-600 transition-colors">
                        Sự kiện
                    </Link>
                    <span>/</span>
                    <span className="text-slate-500">
                        {currentEvent?.name || 'Chi tiết sự kiện'}
                    </span>
                    <span>/</span>
                    <span className="text-slate-600">Kho tri thức</span>
                </nav>

                <div className="mt-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Kho tri thức
                    </h1>
                </div>
            </div>

            {/* Tab navigation matching Figma */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => handleTabChange('INCIDENTS')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'INCIDENTS'
                            ? 'border-emerald-600 text-emerald-700 font-semibold'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <AlertTriangle
                        className={`h-4 w-4 ${
                            activeTab === 'INCIDENTS' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                    />
                    <span>Sự cố & Post-mortem</span>
                    {incidentCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'INCIDENTS'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {incidentCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('FAQS')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'FAQS'
                            ? 'border-emerald-600 text-emerald-700 font-semibold'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <HelpCircle
                        className={`h-4 w-4 ${
                            activeTab === 'FAQS' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                    />
                    <span>FAQ</span>
                    {faqCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'FAQS'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {faqCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('FEEDBACKS')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'FEEDBACKS'
                            ? 'border-emerald-600 text-emerald-700 font-semibold'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <MessageSquare
                        className={`h-4 w-4 ${
                            activeTab === 'FEEDBACKS' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                    />
                    <span>Khảo sát & Feedback</span>
                    {feedbackCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'FEEDBACKS'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {feedbackCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Contents */}
            <div>
                {activeTab === 'INCIDENTS' && (
                    <IncidentSection
                        eventId={eventId}
                        onCountChange={setIncidentCount}
                    />
                )}
                {activeTab === 'FAQS' && (
                    <FaqSection
                        seriesId={seriesId}
                        onCountChange={setFaqCount}
                    />
                )}
                {activeTab === 'FEEDBACKS' && (
                    <FeedbackSection
                        eventId={eventId}
                        onCountChange={setFeedbackCount}
                    />
                )}
            </div>
        </div>
    );
};

export default KnowledgePage;
