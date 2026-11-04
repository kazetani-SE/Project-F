import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Image, ChevronRight, Layers } from 'lucide-react';
import { DocumentTab } from './components/DocumentTab';
import { MediaAssetTab } from './components/MediaAssetTab';
import { useActiveEvent } from '../../context/activeEventContext';

export const DocumentsPage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId: string }>();
    const { currentEvent } = useActiveEvent();
    const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'MEDIA'>('DOCUMENTS');

    const eventId = paramEventId || currentEvent?.id || 'ev-tech-fall-2026';

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
                    <span className="font-semibold text-emerald-600">Tài liệu & Ấn phẩm</span>
                </nav>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Tài Liệu & Ấn Phẩm Truyền Thông
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quản lý hồ sơ kế hoạch đề án đa phiên bản và theo dõi tiến độ thiết kế / in ấn ấn phẩm.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <Layers className="h-4 w-4" />
                        <span>Mã sự kiện: {eventId}</span>
                    </div>
                </div>
            </div>

            {/* Tab Buttons */}
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
