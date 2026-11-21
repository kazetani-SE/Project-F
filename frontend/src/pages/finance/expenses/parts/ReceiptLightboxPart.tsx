import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ReceiptLightboxPartProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const ReceiptLightboxPart: React.FC<ReceiptLightboxPartProps> = ({
    imageUrl,
    onClose,
}) => {
    if (!imageUrl) return null;

    const isPdf = imageUrl.toLowerCase().includes('.pdf');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black transition-colors"
                        title="Mở trong tab mới"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {isPdf ? (
                    <div className="h-[80vh] w-[80vw] max-w-3xl">
                        <iframe
                            src={imageUrl}
                            title="Hóa đơn PDF"
                            className="h-full w-full rounded-xl border-0"
                        />
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt="Hóa đơn chứng từ"
                        className="max-h-[85vh] w-auto rounded-xl object-contain"
                    />
                )}
            </div>
        </div>
    );
};
