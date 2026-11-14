import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Image, ChevronRight, Layers } from 'lucide-react';
import { DocumentTab } from './components/DocumentTab';
import { MediaAssetTab } from './components/MediaAssetTab';
import { useActiveEvent } from '../../context/activeEventContext';
import { getDocumentsByEvent } from '../../services/documentService';
import { getMediaAssetsByEvent } from '../../services/mediaService';

export const DocumentsPage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId: string }>();
    const { currentEvent } = useActiveEvent();
    const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'MEDIA'>('DOCUMENTS');
    const [docCount, setDocCount] = useState<number | null>(null);
    const [mediaCount, setMediaCount] = useState<number | null>(null);

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
    }, [eventId, activeTab]);

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <Link to="/events" className="hover:text-emerald-600 transition-colors">
                        Sự kiện
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-600 font-medium">
                        {currentEvent?.name || 'Chi tiết sự kiện'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="font-semibold text-emerald-600">Tài liệu & Ấn phẩm</span>
                </nav>

                <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Tài Liệu & Ấn Phẩm Truyền Thông
                            </h1>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                Task 3 Slice
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Quản lý hồ sơ kế hoạch đề án đa phiên bản và theo dõi tiến độ thiết kế / in ấn ấn phẩm trực tiếp qua Amazon S3.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-xs">
                        <Layers className="h-4 w-4" />
                        <span>Mã sự kiện: <code className="font-sans">{eventId}</code></span>
                    </div>
                </div>
            </div>

            {/* Tab Buttons matching Figma */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('DOCUMENTS')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'DOCUMENTS'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    <span>Tài liệu đề án & Kế hoạch</span>
                    {docCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                activeTab === 'DOCUMENTS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {docCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('MEDIA')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'MEDIA'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <Image className="h-4 w-4" />
                    <span>Ấn phẩm thiết kế & In ấn</span>
                    {mediaCount != null && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                activeTab === 'MEDIA'
                                    ? 'bg-emerald-100 text-emerald-800'
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
                    <DocumentTab eventId={eventId} />
                ) : (
                    <MediaAssetTab eventId={eventId} />
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
