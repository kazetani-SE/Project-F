import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { FileText, Image, Plus } from 'lucide-react';
import { DocumentTab } from './components/DocumentTab';
import { MediaAssetTab } from './components/MediaAssetTab';
import { useActiveEvent } from '../../context/activeEventContext';
import { getDocumentsByEvent } from '../../services/documentService';
import { getMediaAssetsByEvent } from '../../services/mediaService';

type DocumentsTab = 'DOCUMENTS' | 'MEDIA';

const TAB_PARAM_MAP: Record<string, DocumentsTab> = {
    documents: 'DOCUMENTS',
    media: 'MEDIA',
};

const TAB_TO_PARAM: Record<DocumentsTab, string> = {
    DOCUMENTS: 'documents',
    MEDIA: 'media',
};

export const DocumentsPage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentEvent } = useActiveEvent();

    const initialTabParam = (searchParams.get('tab') || '').toLowerCase();
    const [activeTab, setActiveTab] = useState<DocumentsTab>(
        TAB_PARAM_MAP[initialTabParam] || 'DOCUMENTS',
    );
    const [docCount, setDocCount] = useState<number | null>(null);
    const [mediaCount, setMediaCount] = useState<number | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

    const handleTabChange = (tab: DocumentsTab) => {
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

    useEffect(() => {
        let isMounted = true;
        const fetchCounters = async () => {
            try {
                const [docs, media] = await Promise.allSettled([
                    getDocumentsByEvent(eventId),
                    getMediaAssetsByEvent(eventId),
                ]);
                if (isMounted) {
                    if (docs.status === 'fulfilled') setDocCount(docs.value.length);
                    if (media.status === 'fulfilled') setMediaCount(media.value.length);
                }
            } catch {
                // Ignore counter error
            }
        };
        fetchCounters();
        return () => {
            isMounted = false;
        };
    }, [eventId]);

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb matching Figma design */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Link to="/events" className="hover:text-emerald-600 transition-colors">
                            Sự kiện
                        </Link>
                        <span>/</span>
                        <span className="text-slate-500">
                            {currentEvent?.name || 'Tech-Camp - Season Fall 2026'}
                        </span>
                        <span>/</span>
                        <span className="text-slate-600">Tài liệu & Ấn phẩm</span>
                    </nav>

                    <div className="mt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Tài liệu & Ấn phẩm
                        </h1>
                    </div>
                </div>

                {activeTab === 'MEDIA' && (
                    <button
                        type="button"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Thêm ấn phẩm</span>
                    </button>
                )}
            </div>

            {/* Tab Buttons matching Figma */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => handleTabChange('DOCUMENTS')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'DOCUMENTS'
                            ? 'border-emerald-600 text-emerald-700 font-semibold'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <FileText
                        className={`h-4 w-4 ${
                            activeTab === 'DOCUMENTS' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                    />
                    <span>Tài liệu kế hoạch</span>
                    {docCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'DOCUMENTS'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {docCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('MEDIA')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'MEDIA'
                            ? 'border-emerald-600 text-emerald-700 font-semibold'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <Image
                        className={`h-4 w-4 ${
                            activeTab === 'MEDIA' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                    />
                    <span>Ấn phẩm truyền thông</span>
                    {mediaCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'MEDIA'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {mediaCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Contents */}
            <div>
                {activeTab === 'DOCUMENTS' ? (
                    <DocumentTab eventId={eventId} onCountChange={setDocCount} />
                ) : (
                    <MediaAssetTab
                        eventId={eventId}
                        onCountChange={setMediaCount}
                        isCreateModalOpen={isMediaModalOpen}
                        onCloseCreateModal={() => setIsMediaModalOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
