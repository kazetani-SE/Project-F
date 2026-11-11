import React from 'react';
import { X } from 'lucide-react';

interface ReceiptLightboxPartProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const ReceiptLightboxPart: React.FC<ReceiptLightboxPartProps> = ({
    imageUrl,
    onClose,
}) => {
    if (!imageUrl) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="relative max-w-2xl overflow-hidden rounded-2xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
                >
                    <X className="h-5 w-5" />
                </button>
                <img
                    src={imageUrl}
                    alt="Hóa đơn chứng từ"
                    className="max-h-[80vh] w-auto rounded-xl object-contain"
                />
            </div>
        </div>
    );
};

