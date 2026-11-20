import { useEffect, useId, useRef } from 'react';
import { button, ErrorNotice, secondary } from './CrudUi';

export function ConfirmationDialog({ title, message, busy, error, onCancel, onConfirm }: {
    title: string; message: string; busy: boolean; error?: unknown;
    onCancel: () => void; onConfirm: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const heading = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        dialog.showModal();
        return () => dialog.close();
    }, []);

    return <dialog ref={ref} aria-labelledby={heading}
        className="m-auto w-11/12 max-w-md rounded-xl bg-white p-5 shadow-xl backdrop:bg-slate-900/50"
        onCancel={(event) => {
            event.preventDefault();
            if (!busy) onCancel();
        }}>
        <div className="space-y-4">
            <h2 id={heading} className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-700">{message}</p>
            <ErrorNotice error={error} />
            <div className="flex justify-end gap-3">
                <button className={secondary} type="button" disabled={busy} onClick={onCancel}>Quay lại</button>
                <button className={button} type="button" disabled={busy} onClick={onConfirm}>Xác nhận</button>
            </div>
        </div>
    </dialog>;
}
