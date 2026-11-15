import { createContext, useContext } from 'react';

export const ToastContext = createContext<(message: string) => void>(() => {});

export function useSuccessToast() {
    return useContext(ToastContext);
}
